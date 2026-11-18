"""Turn hiring-system URLs (from Common Crawl or users) into Board identifiers."""
from __future__ import annotations

import re
from urllib.parse import parse_qs, unquote, urlsplit

from .models import Board

# Path segments that appear under the hosts below but are not employer boards.
_RESERVED = {
    "greenhouse": {"embed", "v1", "boards", "job_app", "jobs", "assets", "favicon.ico", "robots.txt", "sitemap.xml", ""},
    "lever": {"", "favicon.ico", "robots.txt", "sitemap.xml", "_next", "static"},
    "ashby": {"", "api", "favicon.ico", "robots.txt", "_next", "static", "sitemap.xml"},
    "smartrecruiters": {"", "sr-jobs", "oneclick-ui", "ui", "static", "favicon.ico", "robots.txt", "sitemap.xml", "search"},
}

_LOCALE = re.compile(r"^[a-z]{2}(-[A-Za-z]{2,4})?$")
_WORKDAY_HOST = re.compile(r"^(?P<tenant>[a-z0-9-]+)\.(?P<wd>wd\d+)\.myworkdayjobs\.com$", re.I)
_TOKEN_OK = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._ %-]{0,99}$")


def _first_segment(path: str) -> str:
    parts = [p for p in path.split("/") if p]
    return unquote(parts[0]) if parts else ""


def board_from_url(url: str) -> Board | None:
    """Return the Board a URL belongs to, or None if it isn't a known board URL."""
    if "://" not in url:
        url = "https://" + url
    try:
        parts = urlsplit(url)
    except ValueError:
        return None
    host = (parts.hostname or "").lower()
    path = parts.path or "/"

    # Greenhouse: boards.greenhouse.io/{token}, job-boards.greenhouse.io/{token},
    # and the embed form boards.greenhouse.io/embed/job_board?for={token}
    if host in {"boards.greenhouse.io", "job-boards.greenhouse.io", "job-boards.eu.greenhouse.io", "boards.eu.greenhouse.io"}:
        seg = _first_segment(path)
        if seg == "embed":
            token = (parse_qs(parts.query).get("for") or [""])[0]
        else:
            token = seg
        return _make("greenhouse", token)

    # Lever: jobs.lever.co/{token}, jobs.eu.lever.co/{token}
    if host in {"jobs.lever.co", "jobs.eu.lever.co"}:
        region = "eu" if ".eu." in host else ""
        return _make("lever", _first_segment(path), region)

    # Ashby: jobs.ashbyhq.com/{token}
    if host == "jobs.ashbyhq.com":
        return _make("ashby", _first_segment(path))

    # SmartRecruiters: jobs.smartrecruiters.com/{CompanyId}, careers.smartrecruiters.com/{CompanyId}
    if host in {"jobs.smartrecruiters.com", "careers.smartrecruiters.com"}:
        return _make("smartrecruiters", _first_segment(path))

    # Workday: {tenant}.wdN.myworkdayjobs.com/[locale/]{site}/...
    m = _WORKDAY_HOST.match(host)
    if m:
        segs = [unquote(p) for p in path.split("/") if p]
        if segs and _LOCALE.match(segs[0]):
            segs = segs[1:]
        if not segs or segs[0].lower() in {"wday", "favicon.ico", "robots.txt", "sitemap.xml"}:
            return None
        site = segs[0]
        if not _TOKEN_OK.match(site):
            return None
        tenant = m.group("tenant").lower()
        return Board("workday", f"{tenant}|{m.group('wd').lower()}|{site}")

    # Oracle Recruiting Cloud: {tenant}.fa[.region].oraclecloud.com/hcmUI/CandidateExperience/[lang/]sites/{site}/...
    if host.endswith(".oraclecloud.com"):
        m = _ORACLE_SITE.search(path)
        if m and _TOKEN_OK.match(m.group(1)):
            return Board("oracle", f"{host}|{m.group(1)}")
        return None

    # One-employer careers sites with their own public search endpoints.
    if host in {"amazon.jobs", "www.amazon.jobs"}:
        return Board("amazon", "amazon")
    if host in {"careers.bankofamerica.com"}:
        return Board("bofa", "bofa")
    if host in {"cityjobs.nyc.gov", "a127-jobs.nyc.gov"} or (host == "data.cityofnewyork.us" and "kpav-sd4t" in path):
        return Board("nycjobs", "nyc")

    return None


_ORACLE_SITE = re.compile(r"/hcmUI/CandidateExperience/(?:[a-z]{2}(?:-[A-Za-z]{2,4})?/)?sites/([A-Za-z0-9_]+)", re.I)


def _make(ats: str, token: str, region: str = "") -> Board | None:
    token = token.strip()
    if not token or token.lower() in _RESERVED.get(ats, set()):
        return None
    if not _TOKEN_OK.match(token):
        return None
    # Greenhouse and Lever tokens are case-insensitive in practice; normalize to
    # avoid polling the same board twice. Ashby and SmartRecruiters preserve case.
    if ats in {"greenhouse", "lever"}:
        token = token.lower()
    return Board(ats, token, region)


def boards_from_urls(urls) -> set[Board]:
    found: set[Board] = set()
    for url in urls:
        b = board_from_url(url)
        if b:
            found.add(b)
    return found
