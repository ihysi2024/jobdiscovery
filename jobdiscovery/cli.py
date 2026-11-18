"""Command line: discover -> poll -> check -> report.

    jobdiscovery discover            # find boards in Common Crawl
    jobdiscovery add URL [URL ...]   # add boards from job links (e.g. user-pasted)
    jobdiscovery poll                # poll boards that are due
    jobdiscovery check               # health check; non-zero exit + alert if something looks wrong
    jobdiscovery report --csv out/   # what we found

Database: set DATABASE_URL (postgresql://...) or pass --db. Defaults to jobs.sqlite.
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import json
import logging
import os
import sys
import time
import traceback
from datetime import datetime, timedelta
from pathlib import Path

from .alerts import alert
from .boards import boards_from_urls
from .cc_index import discover_boards
from .http import PoliteClient
from .models import ATS_NAMES
from .pollers import BoardGone, PollError, poll_board
from .store import LockHeld, Store, now_utc

log = logging.getLogger("jobdiscovery")

# One API host serves every Greenhouse/Lever/Ashby/SmartRecruiters board, so
# their limits are per API. Workday hosts are per employer (tenant.wdN...).
API_HOST_LIMITS = {
    "boards-api.greenhouse.io": 8,
    "api.lever.co": 6,
    "api.eu.lever.co": 4,
    "api.ashbyhq.com": 6,
    "api.smartrecruiters.com": 4,
    "index.commoncrawl.org": 1,
}

# Tests swap in an httpx.MockTransport here.
TRANSPORT = None


def _ats_arg(value: str | None) -> set[str] | None:
    if not value:
        return None
    chosen = {v.strip().lower() for v in value.split(",") if v.strip()}
    unknown = chosen - set(ATS_NAMES)
    if unknown:
        raise argparse.ArgumentTypeError(f"unknown ATS: {', '.join(sorted(unknown))}")
    return chosen


def _deadline(max_minutes: float | None) -> float | None:
    return time.monotonic() + max_minutes * 60 if max_minutes is not None else None


async def _locked(store: Store, command: str, body):
    """Run ``body(run_id)`` as a recorded, locked run. Returns an exit code."""
    try:
        run_id = store.start_run(command)
    except LockHeld as e:
        print(f"Skipping: {e}", file=sys.stderr)
        return 0  # not an error: the other run is doing the work
    try:
        stats = await body(run_id)
    except BaseException as e:
        store.finish_run(run_id, "failed", error="".join(traceback.format_exception_only(type(e), e)).strip())
        if not isinstance(e, KeyboardInterrupt):
            alert(f"{command} failed: {type(e).__name__}: {e}")
        raise
    store.finish_run(run_id, "ok", stats)
    return 0


# --------------------------------------------------------------------------- commands

async def cmd_discover(args, store: Store) -> int:
    def progress(crawl, pattern, page, pages, new, total):
        print(f"  {crawl} {pattern}: page {page}/{pages}  +{new}  ({total} boards so far)", file=sys.stderr)

    async def body(run_id):
        added = 0

        def save(boards):
            nonlocal added
            added += store.add_boards(boards, "commoncrawl")
            store.heartbeat(run_id)

        async with PoliteClient(per_host=1, host_limits=API_HOST_LIMITS, base_delay=3.0, max_retries=6,
                                transport=TRANSPORT) as client:
            boards = await discover_boards(client, crawls=args.crawls, ats=args.ats, max_pages=args.max_pages,
                                           on_progress=progress, on_page=save,
                                           deadline=_deadline(args.max_minutes))
        counts: dict[str, int] = {}
        for b in boards:
            counts[b.ats] = counts.get(b.ats, 0) + 1
        print(f"Found {len(boards)} boards ({', '.join(f'{k} {v}' for k, v in sorted(counts.items()))}); "
              f"{added} new to the database.")
        return {"found": len(boards), "added": added, "by_ats": counts}

    return await _locked(store, "discover", body)


async def cmd_add(args, store: Store) -> int:
    urls = list(args.urls)
    if args.file:
        urls += [line.strip() for line in Path(args.file).read_text().splitlines() if line.strip()]
    boards = boards_from_urls(urls)
    added = store.add_boards(boards, args.source)
    skipped = len(urls) - len(boards)
    print(f"Recognized {len(boards)} boards from {len(urls)} links ({added} new). "
          + (f"{skipped} links weren't on a supported hiring system." if skipped > 0 else ""))
    return 0


async def cmd_poll(args, store: Store) -> int:
    async def body(run_id):
        boards = store.due_boards(limit=args.limit, ats=args.ats, include_not_due=args.all)
        totals = {"due": len(boards), "attempted": 0, "ok": 0, "gone": 0, "error": 0, "new": 0, "changed": 0,
                  "unchanged": 0, "closed": 0, "nyc_seen": 0, "stopped_early": False}
        if not boards:
            print("Nothing is due. Use --all to poll every board anyway.")
            totals["open_nyc_after"] = store.summary()["open_nyc_postings"]
            return totals
        print(f"Polling {len(boards)} boards...", file=sys.stderr)

        deadline = _deadline(args.max_minutes)
        sem = asyncio.Semaphore(args.concurrency)
        started = time.monotonic()

        async with PoliteClient(per_host=2, host_limits=API_HOST_LIMITS, transport=TRANSPORT) as client:
            async def one(board):
                async with sem:
                    if deadline is not None and time.monotonic() >= deadline:
                        totals["stopped_early"] = True
                        return  # stays due; next run picks it up
                    totals["attempted"] += 1
                    try:
                        postings = await poll_board(client, board)
                    except BoardGone:
                        store.mark_gone(board)
                        totals["gone"] += 1
                    except PollError as e:
                        store.mark_error(board, str(e))
                        totals["error"] += 1
                        log.debug("error %s", e)
                    else:
                        s = store.apply_poll(board, postings, all_locations=args.all_locations)
                        totals["ok"] += 1
                        totals["nyc_seen"] += s.nyc_jobs
                        for k in ("new", "changed", "unchanged", "closed"):
                            totals[k] += getattr(s, k)
                    n = totals["attempted"]
                    if n % 100 == 0:
                        store.heartbeat(run_id)
                        rate = n / max(time.monotonic() - started, 1e-6)
                        print(f"  {n}/{len(boards)} boards  ({rate:.1f}/s)  NYC jobs seen: {totals['nyc_seen']}",
                              file=sys.stderr)

            await asyncio.gather(*(one(b) for b in boards))

        totals["open_nyc_after"] = store.summary()["open_nyc_postings"]
        print(f"Polled {totals['attempted']} of {len(boards)} due boards: {totals['ok']} ok, {totals['gone']} gone, "
              f"{totals['error']} errors." + (" Stopped at the time limit; the rest stay due." if totals["stopped_early"] else ""))
        print(f"NYC postings: {totals['new']} new, {totals['changed']} changed, {totals['unchanged']} unchanged, "
              f"{totals['closed']} closed. {totals['open_nyc_after']} open now.")
        return totals

    return await _locked(store, "poll", body)


def health_problems(store: Store, *, max_age_hours: float, max_error_rate: float, max_drop: float) -> list[str]:
    """Return a list of problems with the latest poll, or [] if it looks healthy."""
    problems = []
    runs = store.recent_runs("poll", limit=5)
    if not runs:
        return ["no finished poll runs yet"]
    last = runs[0]
    finished = datetime.fromisoformat(last["finished_at"])
    if now_utc() - finished > timedelta(hours=max_age_hours):
        problems.append(f"last poll finished {finished:%Y-%m-%d %H:%M} UTC, more than {max_age_hours:g}h ago")
    if last["status"] != "ok":
        problems.append(f"last poll ended with status '{last['status']}': {last.get('error') or 'no details'}")
        return problems

    st = last["stats"]
    attempted = st.get("attempted", 0)
    if attempted >= 20 and st.get("error", 0) / attempted > max_error_rate:
        problems.append(f"{st['error']} of {attempted} boards failed ({st['error'] / attempted:.0%}); "
                        f"an API may have changed or be blocking us")

    now_open = st.get("open_nyc_after", 0)
    previous = next((r for r in runs[1:] if r["status"] == "ok" and r["stats"].get("open_nyc_after")), None)
    if previous:
        before = previous["stats"]["open_nyc_after"]
        if before >= 50 and now_open < before * (1 - max_drop):
            problems.append(f"open NYC jobs fell from {before} to {now_open} "
                            f"({1 - now_open / before:.0%} drop) in one run")
    if now_open == 0 and store.summary()["boards_with_nyc_jobs"] > 0:
        problems.append("no open NYC jobs stored even though boards report NYC jobs")
    return problems


async def cmd_check(args, store: Store) -> int:
    problems = health_problems(store, max_age_hours=args.max_age_hours,
                               max_error_rate=args.max_error_rate, max_drop=args.max_drop)
    if problems:
        alert("health check failed:\n- " + "\n- ".join(problems))
        return 2
    s = store.summary()
    print(f"Healthy. {s['open_nyc_postings']:,} open NYC jobs from {s['boards_with_nyc_jobs']:,} employers.")
    return 0


async def cmd_report(args, store: Store) -> int:
    s = store.summary()
    if args.json:
        print(json.dumps(s, indent=2))
    else:
        print(f"Boards known:            {s['boards']:>8,}")
        print(f"Boards polled:           {s['polled']:>8,}")
        print(f"Boards with NYC jobs:    {s['boards_with_nyc_jobs']:>8,}")
        print(f"Open NYC postings:       {s['open_nyc_postings']:>8,}")
        print(f"  ...with salary info:   {s['nyc_postings_with_salary']:>8,}")
        print(f"Postings to process:     {s['needs_processing']:>8,}")
        print()
        print(f"{'hiring system':<16}{'boards':>8}{'polled':>8}{'gone':>7}{'errors':>8}{'w/ NYC':>8}{'NYC jobs':>10}")
        for ats, r in s["by_ats"].items():
            print(f"{ats:<16}{r['boards']:>8,}{r['polled'] or 0:>8,}{r['gone'] or 0:>7,}{r['errors'] or 0:>8,}"
                  f"{r['boards_with_nyc'] or 0:>8,}{r['nyc_jobs'] or 0:>10,}")

    if args.csv:
        out = Path(args.csv)
        out.mkdir(parents=True, exist_ok=True)
        with open(out / "employers_with_nyc_jobs.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["board", "hiring_system", "token", "region", "nyc_jobs", "open_jobs", "last_polled_at"])
            for r in store.boards_with_nyc():
                w.writerow([r["key"], r["ats"], r["token"], r["region"], r["nyc_jobs"], r["open_jobs"], r["last_polled_at"]])
        with open(out / "open_nyc_jobs.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["board", "hiring_system", "title", "locations", "workplace_type", "salary_min", "salary_max",
                        "salary_currency", "salary_interval", "department", "posted_at", "url", "first_seen_at"])
            for r in store.open_nyc_postings():
                w.writerow([r["board_key"], r["ats"], r["title"], "; ".join(json.loads(r["locations"])),
                            r["workplace_type"], r["salary_min"], r["salary_max"], r["salary_currency"],
                            r["salary_interval"], r["department"], r["posted_at"], r["url"], r["first_seen_at"]])
        print(f"\nWrote {out / 'employers_with_nyc_jobs.csv'} and {out / 'open_nyc_jobs.csv'}")
    return 0


# --------------------------------------------------------------------------- entry

def default_db() -> str:
    return os.environ.get("DATABASE_URL") or os.environ.get("JOBDISCOVERY_DB") or "jobs.sqlite"


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="jobdiscovery", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--db", default=None, help="database URL or SQLite path (default: $DATABASE_URL, else jobs.sqlite)")
    p.add_argument("-v", "--verbose", action="store_true")
    sub = p.add_subparsers(dest="command", required=True)

    d = sub.add_parser("discover", help="find hiring-system boards in the Common Crawl URL index")
    d.add_argument("--crawls", type=int, default=2, help="how many recent monthly crawls to search (default 2)")
    d.add_argument("--ats", type=_ats_arg, help=f"comma list, from: {', '.join(ATS_NAMES)}")
    d.add_argument("--max-pages", type=int, help="cap index pages per pattern (useful for a quick trial)")
    d.add_argument("--max-minutes", type=float, help="stop after this long, keeping what was found")

    a = sub.add_parser("add", help="add boards from job or careers links")
    a.add_argument("urls", nargs="*")
    a.add_argument("--file", help="text file with one link per line")
    a.add_argument("--source", default="manual", help="label stored with the board (default manual)")

    pl = sub.add_parser("poll", help="poll boards that are due")
    pl.add_argument("--limit", type=int, help="poll at most this many boards")
    pl.add_argument("--ats", type=_ats_arg)
    pl.add_argument("--concurrency", type=int, default=40, help="boards polled at once (default 40)")
    pl.add_argument("--all", action="store_true", help="ignore schedule and poll every board")
    pl.add_argument("--all-locations", action="store_true", help="store non-NYC postings too (much bigger database)")
    pl.add_argument("--max-minutes", type=float, help="stop starting new boards after this long; the rest stay due")

    c = sub.add_parser("check", help="health check of the latest poll; exits 2 and alerts on problems")
    c.add_argument("--max-age-hours", type=float, default=36, help="latest poll must be newer than this (default 36)")
    c.add_argument("--max-error-rate", type=float, default=0.5, help="share of boards allowed to fail (default 0.5)")
    c.add_argument("--max-drop", type=float, default=0.4, help="allowed one-run drop in open NYC jobs (default 0.4)")

    r = sub.add_parser("report", help="summarize what's been found")
    r.add_argument("--csv", metavar="DIR", help="also write CSVs of employers and open NYC jobs to DIR")
    r.add_argument("--json", action="store_true", help="print the summary as JSON")
    return p


COMMANDS = {"discover": cmd_discover, "add": cmd_add, "poll": cmd_poll, "check": cmd_check, "report": cmd_report}


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.WARNING,
                        format="%(levelname)s %(name)s: %(message)s")
    store = Store(args.db or default_db())
    try:
        return asyncio.run(COMMANDS[args.command](args, store))
    except KeyboardInterrupt:
        print("Stopped. Progress so far is saved.", file=sys.stderr)
        return 130
    finally:
        store.close()
