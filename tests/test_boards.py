import pytest

from jobdiscovery.boards import board_from_url
from jobdiscovery.models import Board


@pytest.mark.parametrize("url,expected", [
    ("https://boards.greenhouse.io/Acme/jobs/123", Board("greenhouse", "acme")),
    ("https://job-boards.greenhouse.io/acme", Board("greenhouse", "acme")),
    ("https://boards.greenhouse.io/embed/job_board?for=delta&b=x", Board("greenhouse", "delta")),
    ("boards.greenhouse.io/acme", Board("greenhouse", "acme")),
    ("https://jobs.lever.co/beta/abc-123/apply", Board("lever", "beta")),
    ("https://jobs.eu.lever.co/spotify", Board("lever", "spotify", "eu")),
    ("https://jobs.ashbyhq.com/Gamma%20Labs/a1", Board("ashby", "Gamma Labs")),
    ("https://jobs.smartrecruiters.com/HealthCo/744000-nurse", Board("smartrecruiters", "HealthCo")),
    ("https://megacorp.wd5.myworkdayjobs.com/en-US/External/job/NY/Analyst_R1", Board("workday", "megacorp|wd5|External")),
    ("https://megacorp.wd1.myworkdayjobs.com/Careers", Board("workday", "megacorp|wd1|Careers")),
])
def test_recognizes_boards(url, expected):
    assert board_from_url(url) == expected


@pytest.mark.parametrize("url", [
    "https://boards.greenhouse.io/",
    "https://boards.greenhouse.io/robots.txt",
    "https://jobs.lever.co/",
    "https://megacorp.wd5.myworkdayjobs.com/wday/cxs/megacorp/External/jobs",
    "https://megacorp.wd5.myworkdayjobs.com/en-US/",
    "https://example.com/careers",
    "https://jobs.smartrecruiters.com/sr-jobs/search",
    "not a url at all",
])
def test_rejects_non_boards(url):
    assert board_from_url(url) is None


def test_board_keys_are_distinct_by_region():
    assert Board("lever", "x").key != Board("lever", "x", "eu").key


def test_big_employer_links():
    from jobdiscovery.boards import board_from_url
    assert board_from_url("https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/1").key == "oracle:jpmc.fa.oraclecloud.com|CX_1001"
    assert board_from_url("https://eeho.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/sites/jobsearch").key == "oracle:eeho.fa.us2.oraclecloud.com|jobsearch"
    assert board_from_url("https://foo.fa.us2.oraclecloud.com/fscmUI/faces/x") is None
    assert board_from_url("https://www.amazon.jobs/en/jobs/1/x").key == "amazon:amazon"
    assert board_from_url("https://cityjobs.nyc.gov/").key == "nycjobs:nyc"
    assert board_from_url("https://careers.bankofamerica.com/en-us/job-detail/1").key == "bofa:bofa"
