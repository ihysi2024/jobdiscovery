"""Polite HTTP: identifiable user agent, retries with backoff, per-host limits."""
from __future__ import annotations

import asyncio
import logging
import os
import random
import time
from urllib.parse import urlsplit

import httpx

log = logging.getLogger(__name__)

DEFAULT_CONTACT = os.environ.get("JOBDISCOVERY_CONTACT", "set-JOBDISCOVERY_CONTACT@example.com")
USER_AGENT = f"jobdiscovery/0.1 (+mailto:{DEFAULT_CONTACT})"

RETRY_STATUSES = {429, 500, 502, 503, 504}


class PoliteClient:
    """Wraps httpx.AsyncClient.

    * ``per_host`` caps concurrent requests to any single host, so we never
      hammer one employer's board even when polling thousands in parallel.
    * Retries 429/5xx and network errors with exponential backoff and jitter,
      honoring Retry-After when the server sends it.
    * A ``host_limits`` key that starts with a dot (".myworkdayjobs.com") is a
      group: every host under it shares one limit. Use this for hiring systems
      that give each employer its own hostname but rate-limit by caller.
      ``min_interval`` spaces out request starts within a host or group, and a
      429 pauses the whole host or group, not just the request that got it.
    """

    def __init__(self, *, per_host: int = 2, timeout: float = 30.0, max_retries: int = 4,
                 transport: httpx.AsyncBaseTransport | None = None, base_delay: float = 1.0,
                 host_limits: dict[str, int] | None = None, min_interval: dict[str, float] | None = None):
        self._client = httpx.AsyncClient(
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            timeout=timeout,
            follow_redirects=True,
            transport=transport,
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
        )
        self._per_host = per_host
        self._host_limits = dict(host_limits or {})
        self._host_sems: dict[str, asyncio.Semaphore] = {}
        self._groups = sorted((k for k in self._host_limits if k.startswith(".")), key=len, reverse=True)
        self._min_interval = dict(min_interval or {})
        self._next_start: dict[str, float] = {}  # key -> monotonic time the next request may start
        self._pace_locks: dict[str, asyncio.Lock] = {}
        self._max_retries = max_retries
        self._base_delay = base_delay

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        await self._client.aclose()

    def _key(self, host: str) -> str:
        for g in self._groups:
            if host.endswith(g):
                return g
        return host

    async def _pace(self, key: str) -> None:
        lock = self._pace_locks.setdefault(key, asyncio.Lock())
        async with lock:
            wait = self._next_start.get(key, 0.0) - time.monotonic()
            if wait > 0:
                await asyncio.sleep(wait)
            self._next_start[key] = time.monotonic() + self._min_interval.get(key, 0.0)

    async def request(self, method: str, url: str, **kw) -> httpx.Response:
        key = self._key(urlsplit(url).hostname or "")
        sem = self._host_sems.get(key)
        if sem is None:
            sem = self._host_sems[key] = asyncio.Semaphore(self._host_limits.get(key, self._per_host))
        attempt = 0
        while True:
            try:
                async with sem:
                    await self._pace(key)
                    resp = await self._client.request(method, url, **kw)
                if resp.status_code not in RETRY_STATUSES or attempt >= self._max_retries:
                    return resp
                delay = _retry_after(resp) or self._backoff(attempt)
                if resp.status_code == 429:  # slow everyone sharing this limit, not just this request
                    self._next_start[key] = max(self._next_start.get(key, 0.0), time.monotonic() + delay)
                log.debug("retry %s %s -> %s in %.1fs", method, url, resp.status_code, delay)
            except (httpx.TransportError, httpx.TimeoutException) as e:
                if attempt >= self._max_retries:
                    raise
                delay = self._backoff(attempt)
                log.debug("retry %s %s after %r in %.1fs", method, url, e, delay)
            attempt += 1
            await asyncio.sleep(delay)

    async def get(self, url: str, **kw) -> httpx.Response:
        return await self.request("GET", url, **kw)

    async def post(self, url: str, **kw) -> httpx.Response:
        return await self.request("POST", url, **kw)

    def _backoff(self, attempt: int) -> float:
        return self._base_delay * (2 ** attempt) + random.uniform(0, self._base_delay)


def _retry_after(resp: httpx.Response) -> float | None:
    value = resp.headers.get("Retry-After")
    if not value:
        return None
    try:
        return min(float(value), 120.0)
    except ValueError:
        return None
