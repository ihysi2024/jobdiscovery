"""Find hiring-system boards in the Common Crawl URL index.

Common Crawl publishes a new crawl roughly monthly. Each has a CDX index that
answers wildcard URL queries, e.g. ``jobs.lever.co/*`` or ``*.myworkdayjobs.com``.
We only need the URLs, so we ask for the ``url`` field alone and pull every
page of results, then reduce them to unique boards.

The index server is a shared, free resource and rate-limits aggressively, so
this runs sequentially with backoff. A full pass over a few crawls takes a
while; it is meant to run occasionally (weekly or monthly), not per poll.
"""
from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass

from .boards import board_from_url
from .http import PoliteClient
from .models import Board

log = logging.getLogger(__name__)

COLLINFO_URL = "https://index.commoncrawl.org/collinfo.json"


@dataclass(frozen=True)
class Pattern:
    ats: str
    url: str  # CDX url parameter
    match_type: str = ""  # "" (prefix via trailing *), or "domain"


PATTERNS: tuple[Pattern, ...] = (
    Pattern("greenhouse", "boards.greenhouse.io/*"),
    Pattern("greenhouse", "job-boards.greenhouse.io/*"),
    Pattern("greenhouse", "job-boards.eu.greenhouse.io/*"),
    Pattern("lever", "jobs.lever.co/*"),
    Pattern("lever", "jobs.eu.lever.co/*"),
    Pattern("ashby", "jobs.ashbyhq.com/*"),
    Pattern("smartrecruiters", "jobs.smartrecruiters.com/*"),
    Pattern("smartrecruiters", "careers.smartrecruiters.com/*"),
    Pattern("workday", "myworkdayjobs.com", match_type="domain"),
)


async def latest_crawls(client: PoliteClient, n: int) -> list[dict]:
    resp = await client.get(COLLINFO_URL)
    resp.raise_for_status()
    crawls = resp.json()
    # collinfo.json is newest-first.
    return crawls[:n]


async def _num_pages(client: PoliteClient, api: str, pattern: Pattern) -> int:
    params = {"url": pattern.url, "output": "json", "showNumPages": "true"}
    if pattern.match_type:
        params["matchType"] = pattern.match_type
    resp = await client.get(api, params=params)
    if resp.status_code == 404:
        return 0
    resp.raise_for_status()
    text = resp.text.strip()
    try:
        data = json.loads(text)
        return int(data.get("pages", 0))
    except (ValueError, AttributeError):
        # Some servers answer with a bare integer.
        return int(text or 0)


async def _page_urls(client: PoliteClient, api: str, pattern: Pattern, page: int) -> list[str]:
    params = {"url": pattern.url, "output": "json", "fl": "url", "page": str(page)}
    if pattern.match_type:
        params["matchType"] = pattern.match_type
    resp = await client.get(api, params=params)
    if resp.status_code == 404:
        return []
    resp.raise_for_status()
    urls = []
    for line in resp.text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            urls.append(json.loads(line)["url"])
        except (ValueError, KeyError):
            continue
    return urls


async def discover_boards(client: PoliteClient, *, crawls: int = 2, ats: set[str] | None = None,
                          max_pages: int | None = None, on_progress=None, on_page=None,
                          deadline: float | None = None) -> set[Board]:
    """Return every board found for the chosen hiring systems across the latest crawls.

    ``on_page(boards)`` is called after each index page so callers can save as
    they go. ``deadline`` (a ``time.monotonic()`` value) stops the search early
    and returns what was found so far.
    """
    found: set[Board] = set()
    for crawl in await latest_crawls(client, crawls):
        api = crawl["cdx-api"]
        for pattern in PATTERNS:
            if ats and pattern.ats not in ats:
                continue
            pages = await _num_pages(client, api, pattern)
            if max_pages is not None:
                pages = min(pages, max_pages)
            log.info("%s %s: %d index pages", crawl["id"], pattern.url, pages)
            for page in range(pages):
                if deadline is not None and time.monotonic() >= deadline:
                    log.warning("time budget reached; stopping discovery early")
                    return found
                page_boards = set()
                for url in await _page_urls(client, api, pattern, page):
                    b = board_from_url(url)
                    if b and b.ats == pattern.ats:
                        page_boards.add(b)
                new = page_boards - found
                found |= page_boards
                if on_page and new:
                    on_page(new)
                if on_progress:
                    on_progress(crawl["id"], pattern.url, page + 1, pages, len(new), len(found))
    return found
