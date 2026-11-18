"""Classify a posting: rules for the predictable fields, a language model for the rest.

Rules (``rules.py``) handle salary, seniority, years of experience, degree, visa
sponsorship, work mode and employment type. A model handles what needs
judgment: company, industry, role family, a clean title, skills, the interview
process and a one-line summary.

Model backends:
* ``LocalBackend``: Qwen3.5 4B (or any GGUF model) served by llama.cpp's
  ``llama-server`` on this machine. Free; the default.
* ``ClaudeBackend``: Claude Haiku via the Anthropic API. Optional.
* No backend: rules only.

Both model backends constrain output to the same JSON schema, built from the
fixed lists in ``taxonomy.py``.
"""
from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, field

import httpx

from . import rules
from . import taxonomy as T

log = logging.getLogger(__name__)


def _nullable(schema: dict) -> dict:
    return {"anyOf": [schema, {"type": "null"}]}


def _enum(values) -> dict:
    return {"type": "string", "enum": list(values)}


SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["company_name", "industry", "role_family", "role_title", "skills", "interview_process", "summary"],
    "properties": {
        "company_name": _nullable({"type": "string"}),
        "industry": _enum(T.INDUSTRIES),
        "role_family": _enum(T.ROLE_FAMILIES),
        "role_title": {"type": "string"},
        "skills": {"type": "array", "items": {"type": "string"}},
        "interview_process": _nullable({
            "type": "object",
            "additionalProperties": False,
            "required": ["stages", "timeline"],
            "properties": {
                "stages": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["stage", "detail"],
                        "properties": {"stage": _enum(T.INTERVIEW_STAGES), "detail": {"type": "string"}},
                    },
                },
                "timeline": _nullable({"type": "string"}),
            },
        }),
        "summary": {"type": "string"},
    },
}

SYSTEM = f"""You read one job posting and return structured facts for a job search app used by people in every field.

Rules:
- Use only what the posting says. Never guess.
- company_name: the employer's name as written. Null if the posting never names it.
- industry: the employer's industry, not the role's. A software engineer at a hospital is "Healthcare Providers".
- role_family: the kind of work the person does day to day.
- role_title: the job title without req numbers, locations or team codes. Keep level words (Senior, Staff, II).
- skills: up to 8 concrete skills, tools or licenses the role asks for, most important first, short names ("Python", "RN license", "Excel").
- interview_process: only if the posting describes its hiring steps. Map each step to the closest stage, with the posting's words in detail. timeline: any stated duration. Otherwise null.
- summary: one plain sentence, at most 25 words, on what the person does. No hype.

industry must be one of: {", ".join(T.INDUSTRIES)}
role_family must be one of: {", ".join(T.ROLE_FAMILIES)}"""

MAX_DESCRIPTION_CHARS = 3500
_INTERVIEW_HEADING = re.compile(r"interview process|hiring process|our process|what to expect|next steps|how we hire|recruit(?:ing|ment) process", re.I)


def trim_description(text: str, limit: int = MAX_DESCRIPTION_CHARS) -> str:
    """Keep the start of the posting plus any hiring-process section, within ``limit`` characters."""
    text = text or ""
    if len(text) <= limit:
        return text
    m = _INTERVIEW_HEADING.search(text, int(limit * 0.5))
    if m:
        tail = text[m.start(): m.start() + int(limit * 0.3)]
        return text[: limit - len(tail) - 7] + "\n[...]\n" + tail
    return text[:limit]


def build_prompt(p: dict, limit: int = MAX_DESCRIPTION_CHARS) -> str:
    locations = p.get("locations")
    if isinstance(locations, str):
        try:
            locations = json.loads(locations)
        except ValueError:
            locations = [locations]
    lines = [
        f"Job title: {p.get('title', '')}",
        f"Hiring board: {p.get('ats', '')} / {p.get('token', '')}",
        f"Locations: {'; '.join(locations or [])}",
    ]
    if p.get("department"):
        lines.append(f"Department: {p['department']}")
    lines += ["", "Job description:", trim_description(p.get("description_text") or "(none provided)", limit)]
    return "\n".join(lines)


# ----------------------------------------------------------------- salary helpers

_PERIOD_MULTIPLIER = {"year": 1, "month": 12, "week": 52, "day": 260, "hour": 2080}


def period_from_interval(interval: str | None) -> str | None:
    """Map hiring-system interval strings ('per-year-salary', '1 HOUR', 'yearly') to a period."""
    s = (interval or "").lower()
    for key in ("hour", "day", "week", "month", "year", "annual"):
        if key in s:
            return "year" if key == "annual" else key
    return None


def annualize(lo, hi, period: str | None) -> tuple[float | None, float | None]:
    if period not in _PERIOD_MULTIPLIER:
        return None, None
    m = _PERIOD_MULTIPLIER[period]
    lo = float(lo) * m if lo is not None else None
    hi = float(hi) * m if hi is not None else None
    if lo is None and hi is not None:
        lo = hi
    if hi is None and lo is not None:
        hi = lo
    if lo is not None and hi is not None and lo > hi:
        lo, hi = hi, lo
    if lo is not None and not (10_000 <= lo <= 2_000_000 and 10_000 <= hi <= 2_000_000):
        return None, None
    return lo, hi


def finalize(p: dict, rule: dict, llm: dict | None) -> dict:
    """Merge rule fields, model fields and the hiring system's own structured data."""
    llm = llm or {}
    out = {
        "company_name": llm.get("company_name"),
        "industry": llm.get("industry"),
        "role_family": llm.get("role_family"),
        "role_title": llm.get("role_title") or p.get("title"),
        "summary": llm.get("summary"),
        "skills": [s.strip() for s in (llm.get("skills") or []) if s and s.strip()][:8],
        "interview_process": llm.get("interview_process") or None,
        "seniority": rule.get("seniority"),
        "years_experience_min": rule.get("years_experience_min"),
        "degree_required": rule.get("degree_required"),
        "visa_sponsorship": rule.get("visa_sponsorship"),
        "work_mode": rule.get("work_mode"),
        "employment_type": rule.get("employment_type"),
    }
    if out["interview_process"] and not out["interview_process"].get("stages"):
        out["interview_process"] = None

    # Salary: the hiring system's structured fields first, then the posting text.
    lo = hi = None
    source = currency = None
    if p.get("salary_min") is not None or p.get("salary_max") is not None:
        lo, hi = annualize(p.get("salary_min"), p.get("salary_max"),
                           period_from_interval(p.get("salary_interval")) or "year")
        if lo is not None:
            source, currency = "hiring_system", p.get("salary_currency") or "USD"
    if lo is None and rule.get("salary"):
        s = rule["salary"]
        lo, hi = annualize(s["min"], s["max"], s["period"])
        if lo is not None:
            source, currency = "description", s.get("currency") or "USD"
    out.update(salary_min_annual=lo, salary_max_annual=hi, salary_source=source,
               salary_currency=(currency or "").upper()[:3] or None)
    return out


# ----------------------------------------------------------------- backends

@dataclass
class Usage:
    calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cache_write_tokens: int = 0
    cache_read_tokens: int = 0
    prices: dict = field(default_factory=dict)  # USD per million tokens; empty = free

    def add(self, input_tokens=0, output_tokens=0, cache_write=0, cache_read=0) -> None:
        self.calls += 1
        self.input_tokens += input_tokens or 0
        self.output_tokens += output_tokens or 0
        self.cache_write_tokens += cache_write or 0
        self.cache_read_tokens += cache_read or 0

    @property
    def cost_usd(self) -> float:
        if not self.prices:
            return 0.0
        p = self.prices
        return (self.input_tokens * p["input"] + self.output_tokens * p["output"]
                + self.cache_write_tokens * p.get("cache_write", 0) + self.cache_read_tokens * p.get("cache_read", 0)) / 1e6


class LocalBackend:
    """A model served by llama.cpp's llama-server (OpenAI-compatible API).

    Start the server with, for example:
        llama-server -hf bartowski/Qwen_Qwen3.5-4B-GGUF:Q4_K_M --no-mmproj -c 8192 -np 2 --port 8080
    """

    def __init__(self, url: str | None = None, model_label: str = "qwen3.5-4b", *,
                 transport: httpx.BaseTransport | None = None, timeout: float = 600.0):
        self.url = (url or os.environ.get("JOBDISCOVERY_LLM_URL") or "http://127.0.0.1:8080").rstrip("/")
        self.name = model_label
        self.usage = Usage()
        self._transport, self._timeout = transport, timeout
        self._http: httpx.AsyncClient | None = None

    @property
    def _client(self) -> httpx.AsyncClient:
        if self._http is None:  # created per run, inside that run's event loop
            self._http = httpx.AsyncClient(timeout=self._timeout, transport=self._transport)
        return self._http

    async def check(self) -> None:
        try:
            r = await self._client.get(f"{self.url}/health")
        except httpx.HTTPError as e:
            raise SystemExit(f"No model server at {self.url} ({type(e).__name__}). Start llama-server first; see README.") from e
        if r.status_code != 200:
            raise SystemExit(f"Model server at {self.url} isn't ready (HTTP {r.status_code}: {r.text[:200]}).")

    async def extract(self, prompt: str) -> dict:
        body = {
            "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}],
            "temperature": 0.2,
            "top_p": 0.8,
            "max_tokens": 700,
            "response_format": {"type": "json_schema", "json_schema": {"name": "job", "schema": SCHEMA, "strict": True}},
            # Qwen3.5 "thinks" by default; we want the answer only.
            "chat_template_kwargs": {"enable_thinking": False},
        }
        r = await self._client.post(f"{self.url}/v1/chat/completions", json=body)
        if r.status_code != 200:
            raise RuntimeError(f"model server HTTP {r.status_code}: {r.text[:300]}")
        data = r.json()
        u = data.get("usage") or {}
        self.usage.add(u.get("prompt_tokens", 0), u.get("completion_tokens", 0))
        choice = (data.get("choices") or [{}])[0]
        if choice.get("finish_reason") == "length":
            raise ValueError("response cut off at max_tokens")
        return json.loads(choice["message"]["content"])

    async def close(self):
        if self._http is not None:
            await self._http.aclose()
            self._http = None


class ClaudeBackend:
    """Claude via the Anthropic API (structured outputs). Needs ANTHROPIC_API_KEY."""

    PRICES = {"input": 0.10, "output": 0.50, "cache_write": 0.125, "cache_read": 0.01}  # Haiku 5.5, USD/MTok

    def __init__(self, client=None, model: str | None = None):
        if client is None:
            import anthropic
            key = os.environ.get("ANTHROPIC_API_KEY")
            if not key:
                raise SystemExit("Set ANTHROPIC_API_KEY to use --backend claude.")
            client = anthropic.AsyncAnthropic(api_key=key, max_retries=5)
        self.client = client
        self.name = model or os.environ.get("JOBDISCOVERY_MODEL", "claude-haiku-5-5")
        self.usage = Usage(prices=self.PRICES)

    async def check(self) -> None:
        return None

    async def extract(self, prompt: str) -> dict:
        resp = await self.client.messages.create(
            model=self.name, max_tokens=900,
            system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": prompt}],
            output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
        )
        u = getattr(resp, "usage", None)
        self.usage.add(getattr(u, "input_tokens", 0), getattr(u, "output_tokens", 0),
                       getattr(u, "cache_creation_input_tokens", 0), getattr(u, "cache_read_input_tokens", 0))
        if getattr(resp, "stop_reason", None) == "max_tokens":
            raise ValueError("response cut off at max_tokens")
        text = next((b.text for b in resp.content if getattr(b, "type", "") == "text"), None)
        if not text:
            raise ValueError(f"no text in response (stop_reason={getattr(resp, 'stop_reason', None)})")
        return json.loads(text)

    async def close(self):
        return None


@dataclass
class Classifier:
    backend: object | None  # LocalBackend, ClaudeBackend, or None for rules only

    @property
    def method(self) -> str:
        return "rules" if self.backend is None else f"rules+{self.backend.name}"

    @property
    def usage(self) -> Usage:
        return self.backend.usage if self.backend is not None else Usage()

    async def classify(self, posting: dict) -> dict:
        rule = rules.extract(posting)
        llm = await self.backend.extract(build_prompt(posting)) if self.backend is not None else None
        return finalize(posting, rule, llm)
