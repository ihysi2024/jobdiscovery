"""The same flows against a real Postgres. Skipped unless TEST_DATABASE_URL is set.

    TEST_DATABASE_URL=postgresql://user@localhost:5432/jobs_test pytest tests/test_postgres.py

WARNING: drops the boards, postings and runs tables in that database.
"""
import os
from datetime import timedelta

import pytest

from jobdiscovery import cli
from jobdiscovery.models import Board, Posting
from jobdiscovery.store import Store, now_utc

from fake_ats import transport

URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set")


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    import psycopg
    with psycopg.connect(URL, autocommit=True) as c:
        c.execute("DROP TABLE IF EXISTS job_features, postings, boards, runs CASCADE")
    monkeypatch.setattr(cli, "TRANSPORT", transport())
    import jobdiscovery.http as h
    monkeypatch.setattr(h.PoliteClient, "_backoff", lambda self, attempt: 0)


def test_end_to_end_on_postgres(capsys):
    assert cli.main(["--db", URL, "discover"]) == 0
    assert "Found 5 boards" in capsys.readouterr().out
    assert cli.main(["--db", URL, "add", "https://jobs.smartrecruiters.com/HealthCo/1"]) == 0
    assert cli.main(["--db", URL, "poll"]) == 0
    assert "5 ok, 1 gone, 0 errors" in capsys.readouterr().out
    assert cli.main(["--db", URL, "check"]) == 0
    assert cli.main(["--db", URL, "report", "--json"]) == 0
    out = capsys.readouterr().out
    assert '"open_nyc_postings": 56' in out


def test_fingerprints_and_closing_on_postgres():
    s = Store(URL)
    b = Board("greenhouse", "acme")
    s.add_boards([b], "test")
    p = lambda i, d="x": Posting(ats="greenhouse", board_key=b.key, external_id=str(i), title="T",
                                 locations=["New York, NY"], url="u", description_text=d)
    t = now_utc()
    assert s.apply_poll(b, [p(1), p(2)], when=t).new == 2
    st = s.apply_poll(b, [p(1), p(2, "changed")], when=t + timedelta(days=1))
    assert (st.unchanged, st.changed) == (1, 1)
    assert s.apply_poll(b, [p(2, "changed")], when=t + timedelta(days=2)).closed == 1
    assert s.summary()["open_nyc_postings"] == 1
    s.close()


def test_lock_on_postgres():
    from jobdiscovery.store import LockHeld
    s = Store(URL)
    s.start_run("poll")
    with pytest.raises(LockHeld):
        s.start_run("poll")
    s.close()


def test_process_on_postgres_with_pgvector(capsys, monkeypatch):
    from jobdiscovery.classify import Classifier
    from test_classify import FakeEmbedder, FakeLlamaServer
    server = FakeLlamaServer()
    monkeypatch.setattr(cli, "CLASSIFIER", Classifier(server.backend()))
    monkeypatch.setattr(cli, "EMBEDDER", FakeEmbedder())
    cli.main(["--db", URL, "discover"])
    cli.main(["--db", URL, "poll"])
    capsys.readouterr()
    for i in range(2):  # sharded, as the GitHub workflow runs it
        assert cli.main(["--db", URL, "process", "--shard", f"{i}/2"]) == 0
    out = capsys.readouterr().out
    assert out.count("Processed") == 2 and len(server.calls) == 55
    s = Store(URL)
    assert s.summary()["needs_processing"] == 0
    if s.has_pgvector:
        # Nearest-neighbour query works on the stored vectors.
        row = s.db.one("SELECT COUNT(*) AS n FROM job_features WHERE embedding <-> CAST(? AS vector) < 100",
                       ("[" + ",".join(["0.1"] * 384) + "]",))
        assert row["n"] == 55
    s.close()
