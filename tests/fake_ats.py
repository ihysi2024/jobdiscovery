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


ORACLE_PAGE = {"items": [{"TotalJobsCount": 2, "requisitionList": [
    {"Id": "101", "Title": "Associate, Credit Risk", "PrimaryLocation": "New York, NY, United States",
     "PostedDate": "2026-11-17", "JobFamily": "Risk", "ShortDescriptionStr": "Short.", "secondaryLocations": []},
    {"Id": "102", "Title": "Teller", "PrimaryLocation": "Columbus, OH, United States", "PostedDate": "2026-11-16",
     "secondaryLocations": [{"Name": "Brooklyn, NY, United States"}]},
]}]}
ORACLE_DETAIL = {"items": [{"Id": "101", "ExternalDescriptionStr": "<p>Model credit risk.</p>",
                            "ExternalQualificationsStr": "<ul><li>3+ years in Python</li></ul>"}]}
AMAZON = {"hits": 2, "jobs": [
    {"id_icims": "9001", "title": "Data Engineer", "normalized_location": "New York, New York, USA",
     "job_path": "/en/jobs/9001/data-engineer", "posted_date": "November 17, 2026", "job_category": "Data",
     "description": "Build pipelines.<br/>", "basic_qualifications": "- 3+ years of SQL"},
    {"id_icims": "9002", "title": "Area Manager", "normalized_location": "Jersey City, New Jersey, USA",
     "job_path": "/en/jobs/9002/area-manager", "description": "Lead a team."},
]}
NYC_JOBS = [
    {"job_id": "804431", "posting_type": "Internal", "agency": "DEPT OF ENVIRONMENT PROTECTION",
     "business_title": "Engineer (internal)", "work_location": "59-17 Junction Blvd., Queens"},
    {"job_id": "804431", "posting_type": "External", "agency": "DEPT OF ENVIRONMENT PROTECTION",
     "business_title": "Civil Engineer", "work_location": "59-17 Junction Blvd., Queens",
     "job_description": "Design water mains.", "minimum_qual_requirements": "A baccalaureate degree in engineering.",
     "salary_range_from": "78000", "salary_range_to": "98000.5", "salary_frequency": "Annual",
     "posting_date": "2026-11-10T00:00:00.000"},
]
BOFA = {"totalMatches": 1, "jobsList": [
    {"jobRequisitionId": "26037894", "postingTitle": "Operations Analyst", "primaryLocation": "New York, New York",
     "additionalLocationsList": "150 N College St, Charlotte, North Carolina, United States; ",
     "jcrURL": "/en-us/job-detail/26037894/operations-analyst-new-york", "postedDate": "11/18/2026",
     "family": "Operations", "lob": "Global Operations", "minYearsOfExperience": 2},
]}


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

    raw_q = url.query.decode() if isinstance(url.query, bytes) else url.query
    if host == "jpmc.fa.oraclecloud.com":
        if path.endswith("/recruitingCEJobRequisitions") and "siteNumber=CX_1001" in raw_q:
            return httpx.Response(200, json=ORACLE_PAGE if "offset=0" in raw_q else {"items": [{"TotalJobsCount": 2, "requisitionList": []}]})
        if path.endswith("/recruitingCEJobRequisitionDetails") and "Id=%22101%22" in raw_q:
            return httpx.Response(200, json=ORACLE_DETAIL)
        return httpx.Response(200, json={"items": []})

    if host == "www.amazon.jobs" and path == "/en/search.json":
        return httpx.Response(200, json=AMAZON if q.get("offset", ["0"])[0] == "0" else {"hits": 2, "jobs": []})

    if host == "data.cityofnewyork.us" and path == "/resource/kpav-sd4t.json":
        return httpx.Response(200, json=NYC_JOBS)

    if host == "careers.bankofamerica.com" and path == "/services/jobssearchservlet":
        return httpx.Response(200, json=BOFA)

    if host == "bigco.wd1.myworkdayjobs.com" and request.method == "POST":
        body = json.loads(request.content)
        if body["appliedFacets"] == {"locations": ["loc-nyc", "loc-bk"]}:
            return httpx.Response(200, json={"total": 1, "jobPostings": [
                {"title": "Analyst", "externalPath": "/job/New-York/Analyst_R1", "locationsText": "New York, NY"}]})
        return httpx.Response(200, json={"total": 5000, "jobPostings": [{"title": "Elsewhere", "externalPath": "/job/x"}],
            "facets": [{"facetParameter": "jobFamilyGroup", "values": [{"descriptor": "New York Ops", "id": "fam"}]},
                       {"facetParameter": "locationMainGroup", "values": [{"facetParameter": "locations", "values": [
                           {"descriptor": "New York, NY", "id": "loc-nyc"}, {"descriptor": "Brooklyn, NY", "id": "loc-bk"},
                           {"descriptor": "Albany, NY", "id": "loc-alb"}]}]}]})

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
