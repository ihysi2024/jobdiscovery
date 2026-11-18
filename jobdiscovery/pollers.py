"""Fetch and normalize postings from each hiring system's public job API.

Every poller returns a full list of currently published postings for one board.
A posting that was stored before but is missing from a *successful* poll is
treated as closed by the store.

Greenhouse, Lever, Ashby and SmartRecruiters document these endpoints as
public. Workday's careers-site JSON endpoint is undocumented: it is what the
Workday careers pages call, and it can change without notice. The same is
true of Oracle Recruiting Cloud's candidate-experience REST endpoint and of the
Amazon and Bank of America careers-site search endpoints. The City of New York
publishes its openings as an NYC Open Data dataset.
"""
from __future__ import annotations

import html
import logging
import re
from urllib.parse import quote

import httpx

from .http import PoliteClient
from .models import Board, Posting
from .nyc import any_nyc, location_is_nyc

log = logging.getLogger(__name__)


class BoardGone(Exception):
    """The board no longer exists (404) or is private."""


class PollError(Exception):
    """Temporary failure; try again later. Postings must not be closed."""


_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")


def html_to_text(s: str | None) -> str:
    if not s:
        return ""
    s = html.unescape(s)  # Greenhouse returns escaped HTML
    s = re.sub(r"<(br|/p|/li|/h\d)\s*/?>", "\n", s, flags=re.I)
    s = _TAG.sub(" ", s)
    s = html.unescape(s)
    return "\n".join(_WS.sub(" ", line).strip() for line in s.splitlines() if line.strip())


def _check(resp, board: Board):
    if resp.status_code in (404, 410):
        raise BoardGone(board.key)
    if resp.status_code >= 400:
        raise PollError(f"{board.key}: HTTP {resp.status_code}")


# --------------------------------------------------------------------------- Greenhouse

async def poll_greenhouse(client: PoliteClient, board: Board) -> list[Posting]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{quote(board.token)}/jobs"
    resp = await client.get(url, params={"content": "true"})
    _check(resp, board)
    out = []
    for j in resp.json().get("jobs", []):
        locs = []
        if (j.get("location") or {}).get("name"):
            locs.append(j["location"]["name"])
        for office in j.get("offices") or []:
            if office.get("location"):
                locs.append(office["location"])
            elif office.get("name"):
                locs.append(office["name"])
        depts = [d.get("name", "") for d in j.get("departments") or [] if d.get("name")]
        out.append(Posting(
            ats="greenhouse", board_key=board.key, external_id=str(j.get("id")),
            title=j.get("title", ""), locations=_dedupe(locs), url=j.get("absolute_url", ""),
            posted_at=j.get("first_published") or j.get("updated_at") or "",
            department=", ".join(depts),
            description_text=html_to_text(j.get("content")),
            is_remote=any("remote" in loc.lower() for loc in locs),
            raw=j,
        ))
    return out


# --------------------------------------------------------------------------- Lever

async def poll_lever(client: PoliteClient, board: Board) -> list[Posting]:
    host = "api.eu.lever.co" if board.region == "eu" else "api.lever.co"
    out, skip, page_size = [], 0, 100
    while True:
        url = f"https://{host}/v0/postings/{quote(board.token)}"
        resp = await client.get(url, params={"mode": "json", "skip": skip, "limit": page_size})
        _check(resp, board)
        batch = resp.json()
        if not isinstance(batch, list):
            raise PollError(f"{board.key}: unexpected response")
        for j in batch:
            cats = j.get("categories") or {}
            locs = list(cats.get("allLocations") or [])
            if cats.get("location"):
                locs.insert(0, cats["location"])
            sal = j.get("salaryRange") or {}
            wt = (j.get("workplaceType") or "").lower()
            out.append(Posting(
                ats="lever", board_key=board.key, external_id=str(j.get("id")),
                title=j.get("text", ""), locations=_dedupe(locs), url=j.get("hostedUrl", ""),
                posted_at=str(j.get("createdAt") or ""),
                department=cats.get("department") or cats.get("team") or "",
                description_text="\n".join(filter(None, [j.get("descriptionPlain"), j.get("additionalPlain")])),
                workplace_type=wt if wt in {"onsite", "hybrid", "remote"} else "",
                is_remote=wt == "remote",
                salary_min=sal.get("min"), salary_max=sal.get("max"),
                salary_currency=sal.get("currency") or "", salary_interval=sal.get("interval") or "",
                raw=j,
            ))
        if len(batch) < page_size:
            return out
        skip += page_size


# --------------------------------------------------------------------------- Ashby

async def poll_ashby(client: PoliteClient, board: Board) -> list[Posting]:
    url = f"https://api.ashbyhq.com/posting-api/job-board/{quote(board.token)}"
    resp = await client.get(url, params={"includeCompensation": "true"})
    _check(resp, board)
    out = []
    for j in resp.json().get("jobs", []):
        if j.get("isListed") is False:
            continue
        locs = []
        if j.get("location"):
            locs.append(j["location"])
        for sec in j.get("secondaryLocations") or []:
            if sec.get("location"):
                locs.append(sec["location"])
        addr = ((j.get("address") or {}).get("postalAddress") or {})
        if addr.get("addressLocality"):
            locs.append(", ".join(filter(None, [addr.get("addressLocality"), addr.get("addressRegion")])))
        smin = smax = None
        cur = interval = ""
        for comp in ((j.get("compensation") or {}).get("summaryComponents") or []):
            if (comp.get("compensationType") or "").lower() == "salary":
                smin, smax = comp.get("minValue"), comp.get("maxValue")
                cur, interval = comp.get("currencyCode") or "", comp.get("interval") or ""
                break
        wt = (j.get("workplaceType") or "").lower().replace("-", "")
        out.append(Posting(
            ats="ashby", board_key=board.key, external_id=str(j.get("id") or j.get("jobUrl")),
            title=j.get("title", ""), locations=_dedupe(locs), url=j.get("jobUrl", ""),
            posted_at=j.get("publishedAt") or "",
            department=j.get("department") or j.get("team") or "",
            description_text=j.get("descriptionPlain") or html_to_text(j.get("descriptionHtml")),
            workplace_type=wt if wt in {"onsite", "hybrid", "remote"} else "",
            is_remote=bool(j.get("isRemote")) or wt == "remote",
            salary_min=smin, salary_max=smax, salary_currency=cur, salary_interval=interval,
            raw=j,
        ))
    return out


# --------------------------------------------------------------------------- SmartRecruiters

async def poll_smartrecruiters(client: PoliteClient, board: Board) -> list[Posting]:
    out, offset, page_size = [], 0, 100
    while True:
        url = f"https://api.smartrecruiters.com/v1/companies/{quote(board.token)}/postings"
        resp = await client.get(url, params={"limit": page_size, "offset": offset})
        _check(resp, board)
        data = resp.json()
        content = data.get("content") or []
        for j in content:
            loc = j.get("location") or {}
            parts = [loc.get("city"), loc.get("region"), loc.get("country")]
            locs = [loc.get("fullLocation") or ", ".join(p for p in parts if p)]
            remote = bool(loc.get("remote"))
            out.append(Posting(
                ats="smartrecruiters", board_key=board.key, external_id=str(j.get("id")),
                title=j.get("name", ""), locations=_dedupe([l for l in locs if l]),
                url=f"https://jobs.smartrecruiters.com/{quote(board.token)}/{j.get('id')}",
                posted_at=j.get("releasedDate") or "",
                department=(j.get("department") or {}).get("label", ""),
                is_remote=remote, workplace_type="remote" if remote else "",
                raw=j,
            ))
        total = int(data.get("totalFound") or 0)
        offset += len(content)
        if not content or offset >= total:
            return out


# --------------------------------------------------------------------------- Workday

_MULTI_LOC = re.compile(r"^\d+\s+locations?$", re.I)


# Above this many jobs, ask Workday for just the NYC jobs (by its location
# filter) instead of paging through the whole board.
_WORKDAY_FILTER_ABOVE = 200


async def poll_workday(client: PoliteClient, board: Board, *, max_jobs: int = 5000) -> list[Posting]:
    tenant, wd, site = board.token.split("|", 2)
    base = f"https://{tenant}.{wd}.myworkdayjobs.com/wday/cxs/{tenant}/{quote(site)}"
    out, offset, page_size = [], 0, 20  # Workday caps pages at 20
    facets: dict = {}
    while offset < max_jobs:
        resp = await client.post(f"{base}/jobs", json={"appliedFacets": facets, "limit": page_size, "offset": offset, "searchText": ""})
        _check(resp, board)
        data = resp.json()
        total = int(data.get("total") or 0)
        if offset == 0 and not facets and total > _WORKDAY_FILTER_ABOVE:
            nyc = _workday_nyc_facets(data.get("facets") or [])
            if nyc:
                facets = nyc
                continue  # start over with only the NYC jobs
        postings = data.get("jobPostings") or []
        for j in postings:
            path = j.get("externalPath") or ""
            locs = [j["locationsText"]] if j.get("locationsText") else []
            if locs and _MULTI_LOC.match(locs[0]):
                locs = await _workday_detail_locations(client, base, path) or locs
            out.append(Posting(
                ats="workday", board_key=board.key, external_id=path or j.get("title", ""),
                title=j.get("title", ""), locations=_dedupe(locs),
                url=f"https://{tenant}.{wd}.myworkdayjobs.com/{quote(site)}{path}",
                posted_at=j.get("postedOn") or "",
                is_remote=any("remote" in l.lower() for l in locs),
                raw=j,
            ))
        offset += len(postings)
        if not postings or offset >= total:
            break
    return out


def _workday_nyc_facets(facets: list) -> dict[str, list[str]]:
    """The location filter values on a Workday board that are in NYC, as appliedFacets."""
    found: dict[str, list[str]] = {}

    def walk(items, param=None):
        for f in items or []:
            p = f.get("facetParameter") or param
            if f.get("values"):
                walk(f["values"], p)
            elif f.get("id") and p and "location" in p.lower() and location_is_nyc(f.get("descriptor") or ""):
                found.setdefault(p, []).append(f["id"])

    walk(facets)
    if not found:
        return {}
    # Use one parameter; Workday ANDs different parameters together.
    best = max(found, key=lambda k: (k.lower() == "locations", len(found[k])))
    return {best: found[best]}


async def _workday_detail_locations(client: PoliteClient, base: str, path: str) -> list[str]:
    if not path:
        return []
    try:
        resp = await client.get(f"{base}{path}")
        if resp.status_code != 200:
            return []
        info = resp.json().get("jobPostingInfo") or {}
    except Exception:  # detail is best-effort
        return []
    locs = [info.get("location")] + list(info.get("additionalLocations") or [])
    return [l for l in locs if l]


# --------------------------------------------------------------------------- Oracle Recruiting Cloud

_ORACLE_PAGE = 100
_ORACLE_DETAILS_MAX = 1500  # detail calls per poll, NYC postings only


async def poll_oracle(client: PoliteClient, board: Board, *, max_jobs: int = 30000) -> list[Posting]:
    host, site = board.token.split("|", 1)
    api = f"https://{host}/hcmRestApi/resources/latest"
    out, offset = [], 0
    while offset < max_jobs:
        # Oracle's finder syntax (semicolons and commas) must not be percent-encoded.
        url = (f"{api}/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations"
               f"&finder=findReqs;siteNumber={quote(site)},limit={_ORACLE_PAGE},offset={offset},sortBy=POSTING_DATES_DESC")
        resp = await client.get(url)
        _check(resp, board)
        items = resp.json().get("items") or []
        if not items:
            break
        search = items[0]
        reqs = search.get("requisitionList") or []
        for j in reqs:
            locs = [j.get("PrimaryLocation")] + [s.get("Name") for s in j.get("secondaryLocations") or []]
            locs = _dedupe([l for l in locs if l])
            wt = (j.get("WorkplaceType") or j.get("WorkplaceTypeCode") or "").lower().replace("-", "").replace(" ", "")
            wt = {"onsite": "onsite", "hybrid": "hybrid", "remote": "remote", "orawt_on_site": "onsite",
                  "orawt_hybrid": "hybrid", "orawt_remote": "remote"}.get(wt, "")
            out.append(Posting(
                ats="oracle", board_key=board.key, external_id=str(j.get("Id")),
                title=j.get("Title") or "", locations=locs,
                url=f"https://{host}/hcmUI/CandidateExperience/en/sites/{quote(site)}/job/{quote(str(j.get('Id')))}",
                posted_at=j.get("PostedDate") or "",
                department=j.get("JobFamily") or j.get("JobFunction") or "",
                description_text=html_to_text(j.get("ShortDescriptionStr")),
                workplace_type=wt, is_remote=wt == "remote" or any("remote" in l.lower() for l in locs),
                raw=j,
            ))
        total = int(search.get("TotalJobsCount") or 0)
        offset += len(reqs)
        if not reqs or offset >= total:
            break
    # Full descriptions come from one detail call per job, so only fetch them for NYC jobs.
    nyc = [p for p in out if any_nyc(p.locations)][:_ORACLE_DETAILS_MAX]
    for p in nyc:
        detail = await _oracle_detail(client, api, site, p.external_id)
        if detail:
            p.description_text = "\n\n".join(filter(None, (html_to_text(detail.get(k)) for k in (
                "ExternalDescriptionStr", "ExternalResponsibilitiesStr", "ExternalQualificationsStr")))) or p.description_text
    return out


async def _oracle_detail(client: PoliteClient, api: str, site: str, job_id: str) -> dict | None:
    url = (f"{api}/recruitingCEJobRequisitionDetails?expand=all&onlyData=true"
           f"&finder=ById;Id=%22{quote(job_id)}%22,siteNumber={quote(site)}")
    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            return None
        items = resp.json().get("items") or []
    except Exception:  # detail is best-effort
        return None
    return items[0] if items else None


# --------------------------------------------------------------------------- Amazon

# Amazon's search takes a point and radius; 24 km around City Hall covers the
# five boroughs (and some of New Jersey, which the NYC filter drops).
_AMAZON_SEARCH = "https://www.amazon.jobs/en/search.json"


async def poll_amazon(client: PoliteClient, board: Board, *, max_jobs: int = 10000) -> list[Posting]:
    out, offset, page = [], 0, 100
    while offset < max_jobs:
        resp = await client.get(_AMAZON_SEARCH, params={
            "latitude": "40.7128", "longitude": "-74.0060", "radius": "24km",
            "result_limit": page, "offset": offset, "sort": "recent"})
        _check(resp, board)
        data = resp.json()
        jobs = data.get("jobs") or []
        for j in jobs:
            loc = j.get("normalized_location") or j.get("location") or ""
            desc = "\n\n".join(filter(None, [
                html_to_text(j.get("description")),
                "Basic qualifications:\n" + html_to_text(j.get("basic_qualifications")) if j.get("basic_qualifications") else "",
                "Preferred qualifications:\n" + html_to_text(j.get("preferred_qualifications")) if j.get("preferred_qualifications") else "",
            ]))
            out.append(Posting(
                ats="amazon", board_key=board.key, external_id=str(j.get("id_icims") or j.get("id")),
                title=j.get("title") or "", locations=[loc] if loc else [],
                url="https://www.amazon.jobs" + (j.get("job_path") or ""),
                posted_at=j.get("posted_date") or "",
                department=j.get("job_category") or j.get("business_category") or "",
                description_text=desc, is_remote="virtual" in loc.lower() or "remote" in loc.lower(),
                raw={k: v for k, v in j.items() if k not in ("description", "basic_qualifications", "preferred_qualifications")},
            ))
        offset += len(jobs)
        if not jobs or offset >= int(data.get("hits") or 0):
            break
    return out


# --------------------------------------------------------------------------- City of New York

# "Jobs NYC Postings" on NYC Open Data: every open City job, refreshed daily.
_NYC_JOBS = "https://data.cityofnewyork.us/resource/kpav-sd4t.json"
_NYC_INTERVAL = {"annual": "year", "hourly": "hour", "daily": "day"}


async def poll_nycjobs(client: PoliteClient, board: Board) -> list[Posting]:
    resp = await client.get(_NYC_JOBS, params={"$limit": 50000, "$order": "job_id"})
    _check(resp, board)
    rows = resp.json()
    if not isinstance(rows, list):
        raise PollError(f"{board.key}: unexpected response")
    by_id: dict[str, dict] = {}
    for r in rows:  # each job can appear twice, as an internal and an external posting
        jid = str(r.get("job_id") or "")
        if jid and (jid not in by_id or (r.get("posting_type") or "").lower() == "external"):
            by_id[jid] = r
    out = []
    for jid, r in by_id.items():
        agency = (r.get("agency") or "").title().replace(" Of ", " of ").replace(" And ", " and ").replace(" For ", " for ")
        where = r.get("work_location") or r.get("work_location_1") or ""
        desc = "\n\n".join(filter(None, [
            f"Employer: City of New York, {agency}" if agency else "Employer: City of New York",
            r.get("job_description"),
            "Minimum qualifications: " + r["minimum_qual_requirements"] if r.get("minimum_qual_requirements") else "",
            "Preferred skills: " + r["preferred_skills"] if r.get("preferred_skills") else "",
            "Residency: " + r["residency_requirement"] if r.get("residency_requirement") else "",
        ]))
        out.append(Posting(
            ats="nycjobs", board_key=board.key, external_id=jid,
            title=r.get("business_title") or r.get("civil_service_title") or "",
            locations=[f"{where}, New York, NY" if where else "New York, NY"],
            url=("https://a127-jobs.nyc.gov/psc/nycjobs/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL"
                 f"?Page=HRS_APP_JBPST_FL&Action=U&FOCUS=Applicant&SiteId=1&JobOpeningId={quote(jid)}&PostingSeq=1"),
            posted_at=r.get("posting_date") or "",
            department=agency,
            description_text=desc,
            salary_min=_num(r.get("salary_range_from")), salary_max=_num(r.get("salary_range_to")),
            salary_currency="USD" if r.get("salary_range_from") else "",
            salary_interval=_NYC_INTERVAL.get((r.get("salary_frequency") or "").lower(), ""),
            raw={k: v for k, v in r.items() if k not in ("job_description", "minimum_qual_requirements",
                                                        "preferred_skills", "additional_information", "to_apply")},
        ))
    return out


def _num(v):
    try:
        return float(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None


# --------------------------------------------------------------------------- Bank of America

_BOFA = "https://careers.bankofamerica.com"


async def poll_bofa(client: PoliteClient, board: Board, *, max_jobs: int = 20000) -> list[Posting]:
    out, start, page = [], 0, 100
    while start < max_jobs:
        # "rows" is the end position, not the page size: start=100&rows=200 is the second page.
        resp = await client.get(f"{_BOFA}/services/jobssearchservlet",
                                params={"start": start, "rows": start + page, "search": "getAllJobs"})
        _check(resp, board)
        data = resp.json()
        jobs = data.get("jobsList") or []
        for j in jobs:
            locs = [j.get("primaryLocation")] + [l.strip() for l in (j.get("additionalLocationsList") or "").split(";")]
            locs = _dedupe([l for l in locs if l])
            years = j.get("minYearsOfExperience") or 0
            desc = "\n".join(filter(None, [
                f"Line of business: {j['lob']}" if j.get("lob") else "",
                f"Area: {j['area']}" if j.get("area") else "",
                f"Experience: at least {years} years" if years else "",
            ]))
            out.append(Posting(
                ats="bofa", board_key=board.key, external_id=str(j.get("jobRequisitionId") or j.get("jcrURL")),
                title=j.get("postingTitle") or "", locations=locs, url=_BOFA + (j.get("jcrURL") or ""),
                posted_at=j.get("postedDate") or "",
                department=j.get("family") or j.get("lob") or "", description_text=desc,
                raw=j,
            ))
        start += len(jobs)
        if not jobs or start >= int(data.get("totalMatches") or 0):
            break
    return out


# --------------------------------------------------------------------------- dispatch

POLLERS = {
    "greenhouse": poll_greenhouse,
    "lever": poll_lever,
    "ashby": poll_ashby,
    "smartrecruiters": poll_smartrecruiters,
    "workday": poll_workday,
    "oracle": poll_oracle,
    "amazon": poll_amazon,
    "nycjobs": poll_nycjobs,
    "bofa": poll_bofa,
}


async def poll_board(client: PoliteClient, board: Board) -> list[Posting]:
    try:
        return await POLLERS[board.ats](client, board)
    except (BoardGone, PollError):
        raise
    except ValueError as e:  # bad JSON
        raise PollError(f"{board.key}: bad response: {e}") from e
    except httpx.HTTPError as e:  # network failure after retries
        raise PollError(f"{board.key}: {type(e).__name__}: {e}") from e


def _dedupe(items):
    seen, out = set(), []
    for i in items:
        k = i.strip().lower()
        if k and k not in seen:
            seen.add(k)
            out.append(i.strip())
    return out
