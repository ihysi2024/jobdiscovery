import asyncio

import pytest

from jobdiscovery.http import PoliteClient
from jobdiscovery.models import Board
from jobdiscovery.pollers import BoardGone, poll_board

from fake_ats import transport


def run(board):
    async def go():
        async with PoliteClient(transport=transport(), base_delay=0) as c:
            return await poll_board(c, board)
    return asyncio.run(go())


def test_greenhouse_normalizes_and_unescapes_html():
    jobs = run(Board("greenhouse", "acme"))
    assert [j.title for j in jobs] == ["ML Engineer, Imaging", "Account Executive"]
    ml = jobs[0]
    assert ml.locations == ["New York, NY"]  # office duplicate removed
    assert ml.department == "Engineering"
    assert "Build models." in ml.description_text and "<p>" not in ml.description_text
    assert "$165,000" in ml.description_text


def test_greenhouse_missing_board_is_gone():
    with pytest.raises(BoardGone):
        run(Board("greenhouse", "nope"))


def test_lever_paginates_and_reads_salary():
    jobs = run(Board("lever", "beta"))
    assert len(jobs) == 101
    assert jobs[1].locations == ["Brooklyn, NY"]
    assert jobs[1].salary_min == 150000 and jobs[1].workplace_type == "hybrid"
    assert jobs[-1].is_remote


def test_ashby_skips_unlisted_and_reads_compensation():
    jobs = run(Board("ashby", "Gamma"))
    assert [j.external_id for j in jobs] == ["a1", "a3"]
    ds = jobs[0]
    assert (ds.salary_min, ds.salary_max, ds.salary_currency) == (140000, 170000, "USD")
    assert ds.workplace_type == "onsite"
    assert jobs[1].locations == ["London", "Manhattan"]


def test_smartrecruiters():
    jobs = run(Board("smartrecruiters", "HealthCo"))
    assert [j.locations for j in jobs] == [["New York, NY, us"], ["Albany, NY, us"]]


def test_workday_expands_multi_location_jobs():
    jobs = run(Board("workday", "megacorp|wd5|External"))
    assert jobs[0].locations == ["New York, NY"]
    assert jobs[1].locations == ["Cambridge, MA", "New York, NY"]
    assert jobs[0].url.startswith("https://megacorp.wd5.myworkdayjobs.com/External/job/")


def test_oracle_lists_jobs_and_fetches_nyc_descriptions():
    jobs = run(Board("oracle", "jpmc.fa.oraclecloud.com|CX_1001"))
    assert [j.external_id for j in jobs] == ["101", "102"]
    assert jobs[0].url == "https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/101"
    assert "Model credit risk." in jobs[0].description_text and "3+ years in Python" in jobs[0].description_text
    assert jobs[1].locations == ["Columbus, OH, United States", "Brooklyn, NY, United States"]


def test_amazon_reads_description_and_qualifications():
    jobs = run(Board("amazon", "amazon"))
    assert jobs[0].url == "https://www.amazon.jobs/en/jobs/9001/data-engineer"
    assert "Build pipelines." in jobs[0].description_text and "3+ years of SQL" in jobs[0].description_text
    assert jobs[1].locations == ["Jersey City, New Jersey, USA"]


def test_nyc_jobs_dedupes_internal_and_external_postings():
    jobs = run(Board("nycjobs", "nyc"))
    assert len(jobs) == 1
    j = jobs[0]
    assert j.title == "Civil Engineer" and j.locations == ["59-17 Junction Blvd., Queens, New York, NY"]
    assert (j.salary_min, j.salary_max, j.salary_interval) == (78000.0, 98000.5, "year")
    assert j.description_text.startswith("Employer: City of New York, Dept of Environment Protection")
    assert "JobOpeningId=804431" in j.url


def test_bank_of_america():
    jobs = run(Board("bofa", "bofa"))
    assert jobs[0].locations == ["New York, New York", "150 N College St, Charlotte, North Carolina, United States"]
    assert jobs[0].url == "https://careers.bankofamerica.com/en-us/job-detail/26037894/operations-analyst-new-york"
    assert "at least 2 years" in jobs[0].description_text


def test_workday_big_board_asks_for_nyc_jobs_only():
    jobs = run(Board("workday", "bigco|wd1|External"))
    assert [j.title for j in jobs] == ["Analyst"]


def test_workday_requests_share_one_limit_and_429_pauses_the_group():
    import httpx
    calls = []

    def handler(request):
        calls.append(request.url.host)
        if len(calls) == 1:
            return httpx.Response(429, headers={"Retry-After": "0.2"})
        return httpx.Response(200, json={"total": 0, "jobPostings": []})

    async def go():
        async with PoliteClient(transport=httpx.MockTransport(handler), base_delay=0,
                                host_limits={".myworkdayjobs.com": 1}) as c:
            import time
            t = time.monotonic()
            await asyncio.gather(poll_board(c, Board("workday", "a|wd1|X")), poll_board(c, Board("workday", "b|wd5|Y")))
            return time.monotonic() - t
    elapsed = asyncio.run(go())
    assert len(calls) == 3 and elapsed >= 0.2


def test_smartrecruiters_fetches_nyc_descriptions_once():
    from fake_ats import DETAIL_CALLS
    DETAIL_CALLS.clear()
    jobs = run(Board("smartrecruiters", "HealthCo"))
    nyc = next(j for j in jobs if j.external_id == "sr1")
    assert "Lead a nursing unit." in nyc.description_text and "RN license" in nyc.description_text
    assert next(j for j in jobs if j.external_id == "sr2").description_text == ""   # Albany: not fetched
    assert len(DETAIL_CALLS) == 1

    async def again():
        async with PoliteClient(transport=transport(), base_delay=0) as c:
            return await poll_board(c, Board("smartrecruiters", "HealthCo"), {"sr1": "Stored text"})
    jobs = asyncio.run(again())
    assert next(j for j in jobs if j.external_id == "sr1").description_text == "Stored text"
    assert len(DETAIL_CALLS) == 1   # reused, no new request
