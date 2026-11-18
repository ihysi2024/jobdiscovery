"""Fetch and normalize postings from each hiring system's public job API.

Every poller returns a full list of currently published postings for one board.
A posting that was stored before but is missing from a *successful* poll is
treated as closed by the store.

Greenhouse, Lever, Ashby and SmartRecruiters document these endpoints as
public. Workday's careers-site JSON endpoint is undocumented: it is what the
Workday careers pages call, and it can change without notice.
"""
from __future__ import annotations

import html
import logging
import re
from urllib.parse import quote

import httpx

from .http import PoliteClient
from .models import Board, Posting

log = logging.getLogger(__name__)


class BoardGone(Exception):
    """The board no longer exists (404) or is private."""


class PollError(Exception):
    """Temporary failure; try again later. Postings must not be closed."""


_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")


def html_to_text(s: str | None) -> str:
    if not s:
        return ""
    s = html.unescape(s)  # Greenhouse returns escaped HTML
    s = re.sub(r"<(br|/p|/li|/h\d)\s*/?>", "\n", s, flags=re.I)
    s = _TAG.sub(" ", s)
    s = html.unescape(s)
    return "\n".join(_WS.sub(" ", line).strip() for line in s.splitlines() if line.strip())


def _check(resp, board: Board):
    if resp.status_code in (404, 410):
        raise BoardGone(board.key)
    if resp.status_code >= 400:
        raise PollError(f"{board.key}: HTTP {resp.status_code}")


# --------------------------------------------------------------------------- Greenhouse

async def poll_greenhouse(client: PoliteClient, board: Board) -> list[Posting]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{quote(board.token)}/jobs"
    resp = await client.get(url, params={"content": "true"})
    _check(resp, board)
    out = []
    for j in resp.json().get("jobs", []):
        locs = []
        if (j.get("location") or {}).get("name"):
            locs.append(j["location"]["name"])
        for office in j.get("offices") or []:
            if office.get("location"):
                locs.append(office["location"])
            elif office.get("name"):
                locs.append(office["name"])
        depts = [d.get("name", "") for d in j.get("departments") or [] if d.get("name")]
        out.append(Posting(
            ats="greenhouse", board_key=board.key, external_id=str(j.get("id")),
            title=j.get("title", ""), locations=_dedupe(locs), url=j.get("absolute_url", ""),
            posted_at=j.get("first_published") or j.get("updated_at") or "",
            department=", ".join(depts),
            description_text=html_to_text(j.get("content")),
            is_remote=any("remote" in loc.lower() for loc in locs),
            raw=j,
        ))
    return out


# --------------------------------------------------------------------------- Lever

async def poll_lever(client: PoliteClient, board: Board) -> list[Posting]:
    host = "api.eu.lever.co" if board.region == "eu" else "api.lever.co"
    out, skip, page_size = [], 0, 100
    while True:
        url = f"https://{host}/v0/postings/{quote(board.token)}"
        resp = await client.get(url, params={"mode": "json", "skip": skip, "limit": page_size})
        _check(resp, board)
        batch = resp.json()
        if not isinstance(batch, list):
            raise PollError(f"{board.key}: unexpected response")
        for j in batch:
            cats = j.get("categories") or {}
            locs = list(cats.get("allLocations") or [])
            if cats.get("location"):
                locs.insert(0, cats["location"])
            sal = j.get("salaryRange") or {}
            wt = (j.get("workplaceType") or "").lower()
            out.append(Posting(
                ats="lever", board_key=board.key, external_id=str(j.get("id")),
                title=j.get("text", ""), locations=_dedupe(locs), url=j.get("hostedUrl", ""),
                posted_at=str(j.get("createdAt") or ""),
                department=cats.get("department") or cats.get("team") or "",
                description_text="\n".join(filter(None, [j.get("descriptionPlain"), j.get("additionalPlain")])),
                workplace_type=wt if wt in {"onsite", "hybrid", "remote"} else "",
                is_remote=wt == "remote",
                salary_min=sal.get("min"), salary_max=sal.get("max"),
                salary_currency=sal.get("currency") or "", salary_interval=sal.get("interval") or "",
                raw=j,
            ))
        if len(batch) < page_size:
            return out
        skip += page_size


# --------------------------------------------------------------------------- Ashby

async def poll_ashby(client: PoliteClient, board: Board) -> list[Posting]:
    url = f"https://api.ashbyhq.com/posting-api/job-board/{quote(board.token)}"
    resp = await client.get(url, params={"includeCompensation": "true"})
    _check(resp, board)
    out = []
    for j in resp.json().get("jobs", []):
        if j.get("isListed") is False:
            continue
        locs = []
        if j.get("location"):
            locs.append(j["location"])
        for sec in j.get("secondaryLocations") or []:
            if sec.get("location"):
                locs.append(sec["location"])
        addr = ((j.get("address") or {}).get("postalAddress") or {})
        if addr.get("addressLocality"):
            locs.append(", ".join(filter(None, [addr.get("addressLocality"), addr.get("addressRegion")])))
        smin = smax = None
        cur = interval = ""
        for comp in ((j.get("compensation") or {}).get("summaryComponents") or []):
            if (comp.get("compensationType") or "").lower() == "salary":
                smin, smax = comp.get("minValue"), comp.get("maxValue")
                cur, interval = comp.get("currencyCode") or "", comp.get("interval") or ""
                break
        wt = (j.get("workplaceType") or "").lower().replace("-", "")
        out.append(Posting(
            ats="ashby", board_key=board.key, external_id=str(j.get("id") or j.get("jobUrl")),
            title=j.get("title", ""), locations=_dedupe(locs), url=j.get("jobUrl", ""),
            posted_at=j.get("publishedAt") or "",
            department=j.get("department") or j.get("team") or "",
            description_text=j.get("descriptionPlain") or html_to_text(j.get("descriptionHtml")),
            workplace_type=wt if wt in {"onsite", "hybrid", "remote"} else "",
            is_remote=bool(j.get("isRemote")) or wt == "remote",
            salary_min=smin, salary_max=smax, salary_currency=cur, salary_interval=interval,
            raw=j,
        ))
    return out


# --------------------------------------------------------------------------- SmartRecruiters

async def poll_smartrecruiters(client: PoliteClient, board: Board) -> list[Posting]:
    out, offset, page_size = [], 0, 100
    while True:
        url = f"https://api.smartrecruiters.com/v1/companies/{quote(board.token)}/postings"
        resp = await client.get(url, params={"limit": page_size, "offset": offset})
        _check(resp, board)
        data = resp.json()
        content = data.get("content") or []
        for j in content:
            loc = j.get("location") or {}
            parts = [loc.get("city"), loc.get("region"), loc.get("country")]
            locs = [loc.get("fullLocation") or ", ".join(p for p in parts if p)]
            remote = bool(loc.get("remote"))
            out.append(Posting(
                ats="smartrecruiters", board_key=board.key, external_id=str(j.get("id")),
                title=j.get("name", ""), locations=_dedupe([l for l in locs if l]),
                url=f"https://jobs.smartrecruiters.com/{quote(board.token)}/{j.get('id')}",
                posted_at=j.get("releasedDate") or "",
                department=(j.get("department") or {}).get("label", ""),
                is_remote=remote, workplace_type="remote" if remote else "",
                raw=j,
            ))
        total = int(data.get("totalFound") or 0)
        offset += len(content)
        if not content or offset >= total:
            return out


# --------------------------------------------------------------------------- Workday

_MULTI_LOC = re.compile(r"^\d+\s+locations?$", re.I)


async def poll_workday(client: PoliteClient, board: Board, *, max_jobs: int = 5000) -> list[Posting]:
    tenant, wd, site = board.token.split("|", 2)
    base = f"https://{tenant}.{wd}.myworkdayjobs.com/wday/cxs/{tenant}/{quote(site)}"
    out, offset, page_size = [], 0, 20  # Workday caps pages at 20
    while offset < max_jobs:
        resp = await client.post(f"{base}/jobs", json={"appliedFacets": {}, "limit": page_size, "offset": offset, "searchText": ""})
        _check(resp, board)
        data = resp.json()
        postings = data.get("jobPostings") or []
        for j in postings:
            path = j.get("externalPath") or ""
            locs = [j["locationsText"]] if j.get("locationsText") else []
            if locs and _MULTI_LOC.match(locs[0]):
                locs = await _workday_detail_locations(client, base, path) or locs
            out.append(Posting(
                ats="workday", board_key=board.key, external_id=path or j.get("title", ""),
                title=j.get("title", ""), locations=_dedupe(locs),
                url=f"https://{tenant}.{wd}.myworkdayjobs.com/{quote(site)}{path}",
                posted_at=j.get("postedOn") or "",
                is_remote=any("remote" in l.lower() for l in locs),
                raw=j,
            ))
        total = int(data.get("total") or 0)
        offset += len(postings)
        if not postings or offset >= total:
            break
    return out


async def _workday_detail_locations(client: PoliteClient, base: str, path: str) -> list[str]:
    if not path:
        return []
    try:
        resp = await client.get(f"{base}{path}")
        if resp.status_code != 200:
            return []
        info = resp.json().get("jobPostingInfo") or {}
    except Exception:  # detail is best-effort
        return []
    locs = [info.get("location")] + list(info.get("additionalLocations") or [])
    return [l for l in locs if l]


# --------------------------------------------------------------------------- dispatch

POLLERS = {
    "greenhouse": poll_greenhouse,
    "lever": poll_lever,
    "ashby": poll_ashby,
    "smartrecruiters": poll_smartrecruiters,
    "workday": poll_workday,
}


async def poll_board(client: PoliteClient, board: Board) -> list[Posting]:
    try:
        return await POLLERS[board.ats](client, board)
    except (BoardGone, PollError):
        raise
    except ValueError as e:  # bad JSON
        raise PollError(f"{board.key}: bad response: {e}") from e
    except httpx.HTTPError as e:  # network failure after retries
        raise PollError(f"{board.key}: {type(e).__name__}: {e}") from e


def _dedupe(items):
    seen, out = set(), []
    for i in items:
        k = i.strip().lower()
        if k and k not in seen:
            seen.add(k)
            out.append(i.strip())
    return out
