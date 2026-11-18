"""End to end: discover from a fake Common Crawl, poll fake boards, report."""
import csv

import pytest

from jobdiscovery import cli

from fake_ats import transport


@pytest.fixture(autouse=True)
def fake_internet(monkeypatch):
    monkeypatch.setattr(cli, "TRANSPORT", transport())
    # No real waiting on retries in tests.
    import jobdiscovery.http as h
    monkeypatch.setattr(h.PoliteClient, "_backoff", lambda self, attempt: 0)


def test_discover_poll_report(tmp_path, capsys):
    db = str(tmp_path / "jobs.sqlite")

    assert cli.main(["--db", db, "discover", "--crawls", "2"]) == 0
    out = capsys.readouterr().out
    # acme, delta (embed form), beta (case-folded), Gamma, megacorp workday; robots.txt and cxs URLs ignored
    assert "Found 5 boards" in out

    assert cli.main(["--db", db, "add", "https://jobs.smartrecruiters.com/HealthCo/1", "https://example.com/jobs"]) == 0
    assert "Recognized 1 boards from 2 links" in capsys.readouterr().out

    assert cli.main(["--db", db, "poll"]) == 0
    out = capsys.readouterr().out
    assert "5 ok, 1 gone, 0 errors" in out  # delta isn't on the fake greenhouse -> gone

    assert cli.main(["--db", db, "poll"]) == 0
    assert "Nothing is due" in capsys.readouterr().out

    assert cli.main(["--db", db, "report", "--csv", str(tmp_path / "out")]) == 0
    out = capsys.readouterr().out
    # NYC jobs: greenhouse 1, lever 50 (odd ids in Brooklyn; "Remote - New York" excluded),
    # ashby 2 (NYC + Manhattan secondary), smartrecruiters 1, workday 2
    assert "Open NYC postings:             56" in out

    with open(tmp_path / "out" / "employers_with_nyc_jobs.csv") as f:
        rows = list(csv.DictReader(f))
    assert rows[0]["board"] == "lever:beta" and rows[0]["nyc_jobs"] == "50"
    assert len(rows) == 5


def test_check_healthy_after_poll(tmp_path, capsys):
    db = str(tmp_path / "jobs.sqlite")
    cli.main(["--db", db, "discover"])
    cli.main(["--db", db, "poll"])
    capsys.readouterr()
    assert cli.main(["--db", db, "check"]) == 0
    assert "Healthy." in capsys.readouterr().out


def test_check_fails_with_no_runs(tmp_path, capsys):
    assert cli.main(["--db", str(tmp_path / "jobs.sqlite"), "check"]) == 2
    assert "no finished poll runs yet" in capsys.readouterr().err


def test_check_flags_a_big_drop(tmp_path, capsys):
    from jobdiscovery.store import Store
    db = str(tmp_path / "jobs.sqlite")
    s = Store(db)
    r1 = s.start_run("poll"); s.finish_run(r1, "ok", {"attempted": 100, "error": 0, "open_nyc_after": 1000})
    r2 = s.start_run("poll"); s.finish_run(r2, "ok", {"attempted": 100, "error": 0, "open_nyc_after": 100})
    s.close()
    assert cli.main(["--db", db, "check"]) == 2
    assert "fell from 1000 to 100" in capsys.readouterr().err


def test_check_flags_high_error_rate(tmp_path, capsys):
    from jobdiscovery.store import Store
    db = str(tmp_path / "jobs.sqlite")
    s = Store(db)
    r = s.start_run("poll"); s.finish_run(r, "ok", {"attempted": 100, "error": 80, "open_nyc_after": 500})
    s.close()
    assert cli.main(["--db", db, "check"]) == 2
    assert "80 of 100 boards failed" in capsys.readouterr().err


def test_overlapping_run_is_skipped(tmp_path, capsys):
    from jobdiscovery.store import Store
    db = str(tmp_path / "jobs.sqlite")
    s = Store(db)
    s.start_run("poll")  # still running
    s.close()
    assert cli.main(["--db", db, "poll"]) == 0
    assert "Skipping: poll run #1 is still running" in capsys.readouterr().err


def test_stale_lock_is_taken_over(tmp_path):
    from datetime import timedelta
    from jobdiscovery.store import Store, now_utc
    s = Store(str(tmp_path / "jobs.sqlite"))
    s.start_run("poll", when=now_utc() - timedelta(hours=2))
    new_id = s.start_run("poll")
    assert new_id == 2
    assert s.recent_runs("poll")[0]["status"] == "abandoned"


def test_time_budget_leaves_boards_due(tmp_path, capsys):
    db = str(tmp_path / "jobs.sqlite")
    cli.main(["--db", db, "discover"])
    capsys.readouterr()
    assert cli.main(["--db", db, "poll", "--max-minutes", "0"]) == 0
    assert "Stopped at the time limit" in capsys.readouterr().out
    assert cli.main(["--db", db, "poll"]) == 0
    assert "Polled 5 of 5 due boards" in capsys.readouterr().out


def test_failed_run_alerts_and_records(tmp_path, monkeypatch, capsys):
    from jobdiscovery.store import Store
    db = str(tmp_path / "jobs.sqlite")
    sent = []
    monkeypatch.setattr(cli, "alert", lambda m: sent.append(m))

    async def boom(*a, **k):
        raise RuntimeError("index exploded")
    monkeypatch.setattr(cli, "discover_boards", boom)
    with pytest.raises(RuntimeError):
        cli.main(["--db", db, "discover"])
    assert sent and "discover failed" in sent[0]
    s = Store(db)
    assert s.recent_runs("discover")[0]["status"] == "failed"


def _flaky_transport(fail_patterns):
    import httpx
    from fake_ats import handler

    def h(request):
        q = request.url.params
        if request.url.host == "index.commoncrawl.org" and q.get("url") in fail_patterns and not q.get("showNumPages"):
            return httpx.Response(504, text="Gateway Time-out")
        return handler(request)
    return httpx.MockTransport(h)


def test_discover_skips_a_failing_index_page(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(cli, "TRANSPORT", _flaky_transport({"jobs.ashbyhq.com/*"}))
    db = str(tmp_path / "jobs.sqlite")
    assert cli.main(["--db", db, "discover", "--crawls", "1"]) == 0
    out = capsys.readouterr()
    assert "Found 4 boards" in out.out          # everything except the Ashby board
    assert "Index pages: 3 ok, 1 skipped" in out.out
    assert "FAILED, skipped" in out.err


def test_discover_fails_loudly_when_most_pages_fail(tmp_path, monkeypatch, capsys):
    from jobdiscovery.store import Store
    sent = []
    monkeypatch.setattr(cli, "alert", lambda m: sent.append(m))
    monkeypatch.setattr(cli, "TRANSPORT", _flaky_transport({"jobs.lever.co/*", "jobs.ashbyhq.com/*", "myworkdayjobs.com"}))
    db = str(tmp_path / "jobs.sqlite")
    with pytest.raises(RuntimeError, match="3 of 4 index pages failed"):
        cli.main(["--db", db, "discover", "--crawls", "1"])
    assert sent and "index may be down" in sent[0]
    s = Store(db)
    assert s.summary()["boards"] == 2       # greenhouse boards found before the failures are kept
    assert s.recent_runs("discover")[0]["status"] == "failed"


def test_check_flags_failed_classification(tmp_path, capsys):
    from jobdiscovery.store import Store
    db = str(tmp_path / "jobs.sqlite")
    s = Store(db)
    r = s.start_run("poll"); s.finish_run(r, "ok", {"attempted": 100, "error": 0, "open_nyc_after": 500})
    r = s.start_run("process"); s.finish_run(r, "failed", error="AuthenticationError: invalid x-api-key")
    s.close()
    assert cli.main(["--db", db, "check"]) == 2
    assert "last classification run (process) ended with status 'failed'" in capsys.readouterr().err


def test_report_groups_board_errors(tmp_path, capsys):
    from jobdiscovery.models import Board
    from jobdiscovery.store import Store
    db = str(tmp_path / "e.sqlite")
    s = Store(db)
    boards = [Board("workday", f"t{i}|wd1|site") for i in range(3)] + [Board("lever", "x")]
    s.add_boards(boards, "test")
    for b in boards[:3]:
        s.mark_error(b, f"HTTP 422 for https://t.wd1.myworkdayjobs.com/{b.token}")
    s.mark_error(boards[3], "ReadTimeout")
    s.close()
    capsys.readouterr()
    assert cli.main(["--db", db, "report"]) == 0
    out = capsys.readouterr().out
    assert "Boards failing to load" in out
    assert "     3  workday         HTTP N for <url>" in out
