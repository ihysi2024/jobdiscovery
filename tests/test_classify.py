import asyncio
import json
from types import SimpleNamespace

import pytest

from jobdiscovery import cli, taxonomy as T
from jobdiscovery.classify import SCHEMA, Classifier, annualize, finalize, period_from_interval

from fake_ats import transport


# ------------------------------------------------------------------ fakes

def model_answer(**over):
    base = {
        "company_name": "Acme", "industry": "Health Tech", "role_family": "Machine Learning & AI",
        "role_title": "ML Engineer", "seniority": "mid", "employment_type": "full_time", "work_mode": None,
        "salary": {"min": 165000, "max": 195000, "period": "year", "currency": "USD"},
        "years_experience_min": 3, "degree_required": "bachelors", "visa_sponsorship": "unknown",
        "skills": ["Python", "PyTorch", " "], "interview_process": None,
        "summary": "Builds imaging models.",
    }
    base.update(over)
    return base


class FakeMessages:
    def __init__(self, answer_for=None, fail_titles=()):
        self.calls = []
        self.answer_for = answer_for or (lambda prompt: model_answer())
        self.fail_titles = set(fail_titles)

    async def create(self, **kw):
        self.calls.append(kw)
        prompt = kw["messages"][0]["content"]
        if any(t in prompt for t in self.fail_titles):
            raise RuntimeError("overloaded")
        return SimpleNamespace(
            content=[SimpleNamespace(type="text", text=json.dumps(self.answer_for(prompt)))],
            usage=SimpleNamespace(input_tokens=2000, output_tokens=300, cache_read_input_tokens=0,
                                  cache_creation_input_tokens=0),
            stop_reason="end_turn",
        )


class FakeEmbedder:
    model_name = "fake-embed"

    def __init__(self):
        self.calls = 0

    def embed(self, texts):
        self.calls += 1
        return [[float(len(t) % 7), 0.5, 1.0] + [0.0] * 381 for t in texts]


# ------------------------------------------------------------------ unit

def test_schema_values_match_taxonomy():
    props = SCHEMA["properties"]
    assert props["role_family"]["enum"] == T.ROLE_FAMILIES
    assert props["industry"]["enum"] == T.INDUSTRIES
    assert set(SCHEMA["required"]) == set(props)


@pytest.mark.parametrize("interval,period", [
    ("per-year-salary", "year"), ("per-hour-wage", "hour"), ("1 YEAR", "year"), ("1 HOUR", "hour"),
    ("Annual", "year"), ("per-month-salary", "month"), ("", None), (None, None),
])
def test_period_from_interval(interval, period):
    assert period_from_interval(interval) == period


def test_annualize():
    assert annualize(50, 60, "hour") == (104000, 124800)
    assert annualize(150000, None, "year") == (150000, 150000)
    assert annualize(200000, 150000, "year") == (150000, 200000)
    assert annualize(5, 10, "year") == (None, None)          # nonsense
    assert annualize(100, 200, None) == (None, None)


def test_hiring_system_salary_wins_over_text():
    p = {"salary_min": 150000, "salary_max": 180000, "salary_interval": "per-year-salary", "salary_currency": "USD",
         "workplace_type": "hybrid"}
    f = finalize(p, model_answer(work_mode="onsite"))
    assert (f["salary_min_annual"], f["salary_max_annual"], f["salary_source"]) == (150000, 180000, "hiring_system")
    assert f["work_mode"] == "hybrid"
    assert f["skills"] == ["Python", "PyTorch"]


def test_salary_from_text_hourly():
    f = finalize({}, model_answer(salary={"min": 40, "max": 45, "period": "hour", "currency": "usd"}))
    assert (f["salary_min_annual"], f["salary_max_annual"], f["salary_source"], f["salary_currency"]) == (83200, 93600, "description", "USD")


def test_no_salary():
    f = finalize({}, model_answer(salary={"min": None, "max": None, "period": None, "currency": None}))
    assert f["salary_min_annual"] is None and f["salary_source"] is None and f["salary_currency"] is None


def test_empty_interview_process_becomes_null():
    f = finalize({}, model_answer(interview_process={"stages": [], "timeline": None}))
    assert f["interview_process"] is None


def test_request_shape():
    fake = FakeMessages()
    c = Classifier(client=SimpleNamespace(messages=fake), model="claude-haiku-5-5")
    asyncio.run(c.classify({"title": "ML Engineer", "locations": '["New York, NY"]', "description_text": "x" * 20000}))
    kw = fake.calls[0]
    assert kw["model"] == "claude-haiku-5-5"
    assert kw["output_config"]["format"]["type"] == "json_schema"
    assert kw["system"][0]["cache_control"] == {"type": "ephemeral"}
    assert "[...]" in kw["messages"][0]["content"]          # long descriptions are trimmed
    assert c.usage.calls == 1 and c.usage.cost_usd == pytest.approx((2000 * 0.10 + 300 * 0.50) / 1e6)


# ------------------------------------------------------------------ end to end

@pytest.fixture
def polled_db(tmp_path, monkeypatch):
    monkeypatch.setattr(cli, "TRANSPORT", transport())
    import jobdiscovery.http as h
    monkeypatch.setattr(h.PoliteClient, "_backoff", lambda self, attempt: 0)
    db = str(tmp_path / "jobs.sqlite")
    cli.main(["--db", db, "discover"])
    cli.main(["--db", db, "poll"])
    return db


def use_fakes(monkeypatch, messages):
    emb = FakeEmbedder()
    monkeypatch.setattr(cli, "CLASSIFIER", Classifier(client=SimpleNamespace(messages=messages)))
    monkeypatch.setattr(cli, "EMBEDDER", emb)
    return emb


def test_process_classifies_every_open_nyc_job_once(polled_db, monkeypatch, capsys):
    from jobdiscovery.store import Store
    fake = FakeMessages()
    emb = use_fakes(monkeypatch, fake)
    capsys.readouterr()
    assert cli.main(["--db", polled_db, "process"]) == 0
    out = capsys.readouterr().out
    assert "Processed 55 of 55 jobs, 0 failed" in out
    assert emb.calls == 1                                     # 55 jobs fit in one 64-job batch

    s = Store(polled_db)
    assert s.summary()["needs_processing"] == 0
    assert s.summary()["processed_open"] == 55
    row = s.db.one("SELECT * FROM job_features LIMIT 1")
    assert row["role_family"] == "Machine Learning & AI" and json.loads(row["skills"]) == ["Python", "PyTorch"]
    assert len(json.loads(row["embedding"])) == 384
    s.close()

    # Second run: nothing changed, so no API calls.
    assert cli.main(["--db", polled_db, "process"]) == 0
    assert "Nothing to process" in capsys.readouterr().out
    assert len(fake.calls) == 55


def test_changed_posting_is_reprocessed(polled_db, monkeypatch, capsys):
    from jobdiscovery.models import Board, Posting
    from jobdiscovery.store import Store
    fake = FakeMessages()
    use_fakes(monkeypatch, fake)
    cli.main(["--db", polled_db, "process"])
    s = Store(polled_db)
    b = Board("greenhouse", "acme")
    s.apply_poll(b, [Posting(ats="greenhouse", board_key=b.key, external_id="101", title="Senior ML Engineer, Imaging",
                             locations=["New York, NY"], url="u", description_text="new text")])
    assert s.summary()["needs_processing"] == 1
    s.close()
    capsys.readouterr()
    cli.main(["--db", polled_db, "process"])
    assert "Processed 1 of 1 jobs" in capsys.readouterr().out


def test_failures_retry_then_give_up(polled_db, monkeypatch, capsys):
    from jobdiscovery.store import Store
    fake = FakeMessages(fail_titles={"Data Scientist"})
    use_fakes(monkeypatch, fake)
    for _ in range(3):
        cli.main(["--db", polled_db, "process"])
    out = capsys.readouterr().out
    assert "Processed 54 of 55 jobs, 1 failed" in out
    assert "Processed 0 of 1 jobs, 1 failed" in out
    # After 3 attempts it's left alone, so a 4th run makes no calls.
    n = len(fake.calls)
    cli.main(["--db", polled_db, "process"])
    assert len(fake.calls) == n
    s = Store(polled_db)
    row = s.db.one("SELECT attempts, last_error FROM job_features WHERE last_error IS NOT NULL")
    assert row["attempts"] == 3 and "overloaded" in row["last_error"]


def test_mostly_failing_run_alerts(polled_db, monkeypatch):
    sent = []
    monkeypatch.setattr(cli, "alert", lambda m: sent.append(m))
    use_fakes(monkeypatch, FakeMessages(fail_titles={"Engineer", "Data", "Ops", "Nurse", "Analyst", "Scientist"}))
    with pytest.raises(RuntimeError, match="failed to process"):
        cli.main(["--db", polled_db, "process"])
    assert sent and "process failed" in sent[0]


def test_cost_limit_stops_between_batches(polled_db, monkeypatch, capsys):
    use_fakes(monkeypatch, FakeMessages())
    capsys.readouterr()
    cli.main(["--db", polled_db, "process", "--chunk", "10", "--max-cost", "0.004"])
    out = capsys.readouterr().out
    assert "Stopped at the cost limit" in out
    # $0.00035 per job: after 10 jobs spend is $0.0035 (< $0.004, keep going); after 20 it's $0.007, so stop.
    assert "Processed 20 of 55" in out
