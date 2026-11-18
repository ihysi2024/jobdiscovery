"""Polite HTTP: identifiable user agent, retries with backoff, per-host limits."""
from __future__ import annotations

import asyncio
import logging
import os
import random
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
    """

    def __init__(self, *, per_host: int = 2, timeout: float = 30.0, max_retries: int = 4,
                 transport: httpx.AsyncBaseTransport | None = None, base_delay: float = 1.0,
                 host_limits: dict[str, int] | None = None):
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
        self._max_retries = max_retries
        self._base_delay = base_delay

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        await self._client.aclose()

    async def request(self, method: str, url: str, **kw) -> httpx.Response:
        host = urlsplit(url).hostname or ""
        sem = self._host_sems.get(host)
        if sem is None:
            sem = self._host_sems[host] = asyncio.Semaphore(self._host_limits.get(host, self._per_host))
        attempt = 0
        while True:
            try:
                async with sem:
                    resp = await self._client.request(method, url, **kw)
                if resp.status_code not in RETRY_STATUSES or attempt >= self._max_retries:
                    return resp
                delay = _retry_after(resp) or self._backoff(attempt)
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
