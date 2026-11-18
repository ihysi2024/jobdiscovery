"""Tell a human when an unattended run goes wrong.

Two channels, both optional and both free:

1. Exit code. A failed run or failed health check exits non-zero, so the
   GitHub Actions run fails and GitHub emails you (by default it notifies the
   person who last changed the workflow's schedule).
2. Webhook. If ``ALERT_WEBHOOK_URL`` is set, the message is also posted there.
   The payload carries both ``text`` (Slack) and ``content`` (Discord) so either
   kind of incoming webhook works.
"""
from __future__ import annotations

import logging
import os
import sys

import httpx

log = logging.getLogger(__name__)


def alert(message: str) -> None:
    print(f"ALERT: {message}", file=sys.stderr)
    url = os.environ.get("ALERT_WEBHOOK_URL")
    if not url:
        return
    text = f"jobdiscovery: {message}"
    try:
        httpx.post(url, json={"text": text, "content": text[:1900]}, timeout=15)
    except httpx.HTTPError as e:  # never let alerting crash the run
        log.warning("could not send alert: %s", e)
