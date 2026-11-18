"""A fake internet: canned responses shaped like each hiring system's public API."""
from __future__ import annotations

import json
from urllib.parse import parse_qs

import httpx

GREENHOUSE = {
    "jobs": [
        {"id": 101, "title": "ML Engineer, Imaging", "absolute_url": "https://boards.greenhouse.io/acme/jobs/101",
         "location": {"name": "New York, NY"}, "updated_at": "2026-11-10T00:00:00Z",
         "first_published": "2026-11-01T00:00:00Z",
         "content": "&lt;p&gt;Build models.&lt;/p&gt;&lt;p&gt;Pay: $165,000 - $195,000&lt;/p&gt;",
         "departments": [{"name": "Engineering"}], "offices": [{"name": "NYC", "location": "New York, NY"}]},
        {"id": 102, "title": "Account Executive", "absolute_url": "https://boards.greenhouse.io/acme/jobs/102",
         "location": {"name": "San Francisco, CA"}, "content": "&lt;p&gt;Sell.&lt;/p&gt;", "departments": [], "offices": []},
    ],
    "meta": {"total": 2},
}

LEVER_PAGE_1 = [
    {"id": f"lv-{i}", "text": f"Engineer {i}", "hostedUrl": f"https://jobs.lever.co/beta/lv-{i}",
     "categories": {"location": "Brooklyn, NY" if i % 2 else "Austin, TX", "allLocations": [], "team": "Eng"},
     "workplaceType": "hybrid", "createdAt": 1731000000000, "descriptionPlain": "Do things.",
     "salaryRange": {"min": 150000, "max": 180000, "currency": "USD", "interval": "per-year-salary"}}
    for i in range(100)
]
LEVER_PAGE_2 = [
    {"id": "lv-100", "text": "Designer", "hostedUrl": "https://jobs.lever.co/beta/lv-100",
     "categories": {"location": "Remote - New York", "allLocations": ["Remote - New York"]},
     "workplaceType": "remote", "createdAt": 1731000000000, "descriptionPlain": "Design."},
]

ASHBY = {
    "apiVersion": "1",
    "jobs": [
        {"id": "a1", "title": "Data Scientist", "location": "New York City", "secondaryLocations": [],
         "isListed": True, "isRemote": False, "workplaceType": "OnSite", "jobUrl": "https://jobs.ashbyhq.com/Gamma/a1",
         "publishedAt": "2026-11-12T00:00:00Z", "department": "Data", "descriptionPlain": "Analyze.",
         "compensation": {"summaryComponents": [
             {"compensationType": "Salary", "minValue": 140000, "maxValue": 170000, "currencyCode": "USD", "interval": "1 YEAR"},
             {"compensationType": "EquityPercentage", "minValue": 0.1, "maxValue": 0.2}]}},
        {"id": "a2", "title": "Hidden role", "location": "New York City", "isListed": False, "jobUrl": "x"},
        {"id": "a3", "title": "Ops Lead", "location": "London", "secondaryLocations": [{"location": "Manhattan"}],
         "isListed": True, "jobUrl": "https://jobs.ashbyhq.com/Gamma/a3", "descriptionPlain": "Run ops."},
    ],
}

SMARTRECRUITERS = {
    "totalFound": 2, "offset": 0, "limit": 100,
    "content": [
        {"id": "sr1", "name": "Nurse Manager", "releasedDate": "2026-11-01T00:00:00Z",
         "location": {"city": "New York", "region": "NY", "country": "us", "remote": False},
         "department": {"label": "Nursing"}},
        {"id": "sr2", "name": "Nurse", "location": {"city": "Albany", "region": "NY", "country": "us"}},
    ],
}

WORKDAY_LIST = {
    "total": 2,
    "jobPostings": [
        {"title": "Analyst", "externalPath": "/job/New-York-NY/Analyst_R1", "locationsText": "New York, NY",
         "postedOn": "Posted Today"},
        {"title": "Scientist", "externalPath": "/job/Multiple/Scientist_R2", "locationsText": "2 Locations",
         "postedOn": "Posted 3 Days Ago"},
    ],
}
WORKDAY_DETAIL = {"jobPostingInfo": {"location": "Cambridge, MA", "additionalLocations": ["New York, NY"]}}

CC_COLLINFO = [
    {"id": "CC-MAIN-2026-44", "cdx-api": "https://index.commoncrawl.org/CC-MAIN-2026-44-index"},
    {"id": "CC-MAIN-2026-40", "cdx-api": "https://index.commoncrawl.org/CC-MAIN-2026-40-index"},
]
CC_URLS = {
    "boards.greenhouse.io/*": ["https://boards.greenhouse.io/acme/jobs/101", "https://boards.greenhouse.io/acme",
                               "https://boards.greenhouse.io/embed/job_board?for=delta", "https://boards.greenhouse.io/robots.txt"],
    "jobs.lever.co/*": ["https://jobs.lever.co/beta/lv-1", "https://jobs.lever.co/Beta"],
    "jobs.ashbyhq.com/*": ["https://jobs.ashbyhq.com/Gamma/a1"],
    "myworkdayjobs.com": ["https://megacorp.wd5.myworkdayjobs.com/en-US/External/job/x",
                          "https://megacorp.wd5.myworkdayjobs.com/wday/cxs/megacorp/External/jobs"],
}


def handler(request: httpx.Request) -> httpx.Response:
    url = request.url
    host, path = url.host, url.path
    q = parse_qs(url.query.decode() if isinstance(url.query, bytes) else url.query)

    if host == "boards-api.greenhouse.io":
        if path == "/v1/boards/acme/jobs":
            return httpx.Response(200, json=GREENHOUSE)
        return httpx.Response(404, json={"status": 404})

    if host == "api.lever.co" and path == "/v0/postings/beta":
        skip = int(q.get("skip", ["0"])[0])
        return httpx.Response(200, json=LEVER_PAGE_1 if skip == 0 else LEVER_PAGE_2)

    if host == "api.ashbyhq.com" and path == "/posting-api/job-board/Gamma":
        return httpx.Response(200, json=ASHBY)

    if host == "api.smartrecruiters.com" and path == "/v1/companies/HealthCo/postings":
        return httpx.Response(200, json=SMARTRECRUITERS)

    if host == "megacorp.wd5.myworkdayjobs.com":
        if request.method == "POST" and path == "/wday/cxs/megacorp/External/jobs":
            return httpx.Response(200, json=WORKDAY_LIST)
        if path == "/wday/cxs/megacorp/External/job/Multiple/Scientist_R2":
            return httpx.Response(200, json=WORKDAY_DETAIL)

    if host == "index.commoncrawl.org":
        if path == "/collinfo.json":
            return httpx.Response(200, json=CC_COLLINFO)
        pattern = q.get("url", [""])[0]
        urls = CC_URLS.get(pattern, [])
        if q.get("showNumPages"):
            return httpx.Response(200, json={"pages": 1 if urls else 0, "pageSize": 5, "blocks": 1})
        body = "\n".join(json.dumps({"url": u}) for u in urls)
        return httpx.Response(200, text=body)

    return httpx.Response(404)


def transport() -> httpx.MockTransport:
    return httpx.MockTransport(handler)
