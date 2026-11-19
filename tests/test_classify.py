import asyncio
import json
from types import SimpleNamespace

import httpx
import pytest

from jobdiscovery import cli, taxonomy as T
from jobdiscovery.classify import (SCHEMA, ClaudeBackend, Classifier, LocalBackend, annualize, build_prompt,
                                   finalize, period_from_interval, trim_description)
from jobdiscovery import rules

from fake_ats import transport


# ------------------------------------------------------------------ fakes

def model_answer(**over):
    base = {
        "company_name": "Acme", "industry": "Health Tech", "role_family": "Machine Learning & AI",
        "role_title": "ML Engineer", "skills": ["Python", "PyTorch", " "], "interview_process": None,
        "summary": "Builds imaging models.",
    }
    base.update(over)
    return base


class FakeLlamaServer:
    """Stands in for llama-server's OpenAI-compatible API."""

    def __init__(self, answer_for=None, fail_titles=(), healthy=True):
        self.calls = []
        self.answer_for = answer_for or (lambda prompt: model_answer())
        self.fail_titles = set(fail_titles)
        self.healthy = healthy

    def handler(self, request: httpx.Request) -> httpx.Response:
        if request.url.path == "/health":
            return httpx.Response(200 if self.healthy else 503, json={"status": "ok" if self.healthy else "loading model"})
        body = json.loads(request.content)
        self.calls.append(body)
        prompt = body["messages"][1]["content"]
        if any(f"Job title: {t}" in prompt for t in self.fail_titles):
            return httpx.Response(500, json={"error": "boom"})
        return httpx.Response(200, json={
            "choices": [{"finish_reason": "stop", "message": {"role": "assistant",
                                                              "content": json.dumps(self.answer_for(prompt))}}],
            "usage": {"prompt_tokens": 1200, "completion_tokens": 150},
        })

    def backend(self):
        return LocalBackend("http://llm.test", transport=httpx.MockTransport(self.handler))


class FakeMessages:
    """Stands in for the Anthropic client's messages API."""

    def __init__(self):
        self.calls = []

    async def create(self, **kw):
        self.calls.append(kw)
        return SimpleNamespace(
            content=[SimpleNamespace(type="text", text=json.dumps(model_answer()))],
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
         "workplace_type": "hybrid", "description_text": "Salary range: $90,000 - $100,000 per year."}
    f = finalize(p, rules.extract(p), model_answer())
    assert (f["salary_min_annual"], f["salary_max_annual"], f["salary_source"]) == (150000, 180000, "hiring_system")
    assert f["work_mode"] == "hybrid"
    assert f["skills"] == ["Python", "PyTorch"]


def test_salary_from_text_hourly():
    p = {"title": "Barista", "description_text": "Pay range: $20.00 - $22.50 per hour."}
    f = finalize(p, rules.extract(p), model_answer())
    assert (f["salary_min_annual"], f["salary_max_annual"], f["salary_source"], f["salary_currency"]) == (41600, 46800, "description", "USD")


def test_no_salary():
    p = {"title": "Engineer", "description_text": "Great benefits."}
    f = finalize(p, rules.extract(p), model_answer())
    assert f["salary_min_annual"] is None and f["salary_source"] is None and f["salary_currency"] is None


def test_empty_interview_process_becomes_null():
    f = finalize({}, {}, model_answer(interview_process={"stages": [], "timeline": None}))
    assert f["interview_process"] is None


def test_rules_only_keeps_title_and_rule_fields():
    p = {"title": "Senior Data Analyst", "description_text": "5+ years of SQL. Bachelor's degree required. Hybrid."}
    f = asyncio.run(Classifier(None).classify(p))
    assert f["role_title"] == "Senior Data Analyst" and f["industry"] is None
    assert f["seniority"] == "senior" and f["years_experience_min"] == 5 and f["degree_required"] == "bachelors"
    assert Classifier(None).method == "rules/v2"


def test_trim_keeps_interview_section():
    text = "About the role. " * 400 + "Our interview process: recruiter screen, then a take-home." + " Benefits." * 200
    out = trim_description(text, 3500)
    assert len(out) <= 3500 and "interview process" in out and out.startswith("About the role.")


def test_local_request_shape():
    from jobdiscovery.classify import LOCAL_SCHEMA
    server = FakeLlamaServer()
    c = Classifier(server.backend())
    f = asyncio.run(c.classify({"title": "ML Engineer", "locations": '["New York, NY"]', "description_text": "x" * 20000}))
    body = server.calls[0]
    assert body["chat_template_kwargs"] == {"enable_thinking": False}
    assert body["response_format"]["json_schema"]["schema"] == LOCAL_SCHEMA
    assert len(body["messages"][1]["content"]) < 4000          # long descriptions are trimmed
    assert f["industry"] == "Health Tech" and c.method == "rules+qwen3.5-4b/v2"
    assert c.usage.calls == 1 and c.usage.cost_usd == 0


def test_local_server_down_is_a_clear_error():
    b = LocalBackend("http://llm.test", transport=httpx.MockTransport(lambda r: (_ for _ in ()).throw(httpx.ConnectError("refused"))))
    with pytest.raises(SystemExit, match="Start llama-server"):
        asyncio.run(b.check())


def test_claude_request_shape():
    fake = FakeMessages()
    c = Classifier(ClaudeBackend(client=SimpleNamespace(messages=fake), model="claude-haiku-5-5"))
    asyncio.run(c.classify({"title": "ML Engineer", "locations": '["New York, NY"]', "description_text": "x" * 20000}))
    kw = fake.calls[0]
    assert kw["model"] == "claude-haiku-5-5"
    assert kw["output_config"]["format"]["type"] == "json_schema"
    assert kw["system"][0]["cache_control"] == {"type": "ephemeral"}
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


def use_fakes(monkeypatch, server):
    emb = FakeEmbedder()
    backend = server.backend() if isinstance(server, FakeLlamaServer) else ClaudeBackend(client=SimpleNamespace(messages=server))
    monkeypatch.setattr(cli, "CLASSIFIER", Classifier(backend))
    monkeypatch.setattr(cli, "EMBEDDER", emb)
    return emb


def test_process_classifies_every_open_nyc_job_once(polled_db, monkeypatch, capsys):
    from jobdiscovery.store import Store
    fake = FakeLlamaServer()
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
    fake = FakeLlamaServer()
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
    fake = FakeLlamaServer(fail_titles={"Data Scientist"})
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
    assert row["attempts"] == 3 and "HTTP 500" in row["last_error"]


def test_mostly_failing_run_alerts(polled_db, monkeypatch):
    sent = []
    monkeypatch.setattr(cli, "alert", lambda m: sent.append(m))
    use_fakes(monkeypatch, FakeLlamaServer(fail_titles={"Engineer", "Data", "Ops", "Nurse", "Analyst", "Scientist", "Senior", "ML", "Staff", "Registered", "Product", "Software", "Account", "Marketing", "Sales", "Designer"}))
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


def test_shards_split_the_queue(polled_db, monkeypatch, capsys):
    from jobdiscovery.store import Store
    fake = FakeLlamaServer()
    use_fakes(monkeypatch, fake)
    capsys.readouterr()
    for i in range(3):
        assert cli.main(["--db", polled_db, "process", "--shard", f"{i}/3"]) == 0
    assert len(fake.calls) == 55                                # each job exactly once across shards
    s = Store(polled_db)
    assert s.summary()["needs_processing"] == 0
    assert {r["command"] for r in s.latest_finished_runs("process")} == {"process:0/3", "process:1/3", "process:2/3"}


def test_model_server_not_ready(polled_db, monkeypatch):
    use_fakes(monkeypatch, FakeLlamaServer(healthy=False))
    with pytest.raises(SystemExit, match="isn't ready"):
        cli.main(["--db", polled_db, "process"])


def test_rules_backend_needs_no_model(polled_db, monkeypatch, capsys):
    from jobdiscovery.store import Store
    monkeypatch.setattr(cli, "EMBEDDER", FakeEmbedder())
    capsys.readouterr()
    assert cli.main(["--db", polled_db, "process", "--backend", "rules"]) == 0
    assert "Processed 55 of 55" in capsys.readouterr().out
    s = Store(polled_db)
    assert s.db.scalar("SELECT COUNT(*) FROM job_features WHERE model='rules/v2'") == 55


def test_report_samples(polled_db, monkeypatch, capsys):
    use_fakes(monkeypatch, FakeLlamaServer())
    cli.main(["--db", polled_db, "process", "--limit", "3"])
    capsys.readouterr()
    assert cli.main(["--db", polled_db, "report", "--samples", "2"]) == 0
    out = capsys.readouterr().out
    assert "Latest 2 classified jobs" in out and "Health Tech" in out


def test_summary_keeps_first_sentence():
    from jobdiscovery.classify import clean_summary
    assert clean_summary("Drive enterprise sales for Starlink. 25 words max. No hype. Done. End.") == "Drive enterprise sales for Starlink."
    assert clean_summary("Requires U.S. citizenship or a绿卡") == "Requires U.S. citizenship or a"
    assert clean_summary("") is None


def test_boilerplate_is_not_an_interview_process():
    from jobdiscovery.classify import clean_interview
    one = {"stages": [{"stage": "other", "detail": "Reach out to EEOCompliance@spacex.com"}], "timeline": None}
    assert clean_interview(one) is None
    real = {"stages": [{"stage": "recruiter_screen", "detail": "30 min call"}, {"stage": "panel_onsite", "detail": "4 interviews"}], "timeline": "3 weeks"}
    assert clean_interview(real) == real


def test_redo_relabels_older_versions(polled_db, monkeypatch, capsys):
    from jobdiscovery.store import Store
    server = FakeLlamaServer()
    use_fakes(monkeypatch, server)
    cli.main(["--db", polled_db, "process", "--limit", "5"])
    s = Store(polled_db)
    s.db.execute("UPDATE job_features SET model='rules+qwen3.5-4b/v1' WHERE posting_id IN "
                 "(SELECT posting_id FROM job_features LIMIT 2)")
    s.close()
    capsys.readouterr()
    cli.main(["--db", polled_db, "process", "--limit", "100"])          # new jobs only
    assert "Processed 50 of 50" in capsys.readouterr().out
    cli.main(["--db", polled_db, "process", "--redo"])                  # plus the 2 old labels
    assert "Processed 2 of 2" in capsys.readouterr().out


def test_summary_drops_null_padding():
    from jobdiscovery.classify import clean_summary
    assert clean_summary("Submit your info for future roles. null, null, null, null") == "Submit your info for future roles."
    assert clean_summary("Engineer builds things, null") == "Engineer builds things."
    assert clean_summary("A null hypothesis tester runs experiments.") == "A null hypothesis tester runs experiments."
    assert clean_summary("null null null") is None
