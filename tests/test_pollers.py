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
