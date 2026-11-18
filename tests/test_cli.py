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
