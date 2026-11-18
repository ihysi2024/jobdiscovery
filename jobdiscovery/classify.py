"""Classify a posting with Claude: role, industry, seniority, salary, interview process.

Uses structured outputs (``output_config.format`` with a JSON schema), so every
response parses into the same shape. Values come from the fixed lists in
``taxonomy.py`` so the app can filter on them.

Rules of thumb baked into the prompt:
* Never invent facts. Salary, years of experience and interview steps are
  filled only when the posting states them.
* Structured fields from the hiring system (salary, workplace type) win over
  anything extracted from text.
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field

from . import taxonomy as T

log = logging.getLogger(__name__)

DEFAULT_MODEL = os.environ.get("JOBDISCOVERY_MODEL", "claude-haiku-5-5")

# USD per million tokens for Claude Haiku 5.5 (prompts under 100k tokens).
PRICES = {"input": 0.10, "output": 0.50, "cache_write": 0.125, "cache_read": 0.01}

MAX_DESCRIPTION_CHARS = 12000


def _nullable(schema: dict) -> dict:
    return {"anyOf": [schema, {"type": "null"}]}


def _enum(values) -> dict:
    return {"type": "string", "enum": list(values)}


SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["company_name", "industry", "role_family", "role_title", "seniority", "employment_type",
                 "work_mode", "salary", "years_experience_min", "degree_required", "visa_sponsorship", "skills",
                 "interview_process", "summary"],
    "properties": {
        "company_name": _nullable({"type": "string"}),
        "industry": _enum(T.INDUSTRIES),
        "role_family": _enum(T.ROLE_FAMILIES),
        "role_title": {"type": "string"},
        "seniority": _enum(T.SENIORITY),
        "employment_type": _enum(T.EMPLOYMENT_TYPES),
        "work_mode": _nullable(_enum(T.WORK_MODES)),
        "salary": {
            "type": "object",
            "additionalProperties": False,
            "required": ["min", "max", "period", "currency"],
            "properties": {
                "min": _nullable({"type": "number"}),
                "max": _nullable({"type": "number"}),
                "period": _nullable(_enum(T.SALARY_PERIODS)),
                "currency": _nullable({"type": "string"}),
            },
        },
        "years_experience_min": _nullable({"type": "number"}),
        "degree_required": _enum(T.DEGREES),
        "visa_sponsorship": _enum(["yes", "no", "unknown"]),
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

SYSTEM = f"""You read one job posting and return structured facts about it for a job search app used by people in every field.

Rules:
- Use only what the posting says. If something isn't stated, use null (or "unknown" where offered). Never guess salary, years of experience or interview steps.
- company_name: the employer's name as written in the posting. If the posting never names it, use null.
- industry: the employer's industry, not the role's. A software engineer at a hospital is "Healthcare Providers".
- role_family: the kind of work the person does day to day.
- role_title: a clean version of the job title, without req numbers, locations or team codes. Keep the level words (Senior, Staff, II).
- seniority: intern; entry (0-2 yrs, new grad, junior, associate); mid (about 2-5 yrs, no level word); senior (Senior/Sr, about 5+ yrs); staff_principal (Staff, Principal, Distinguished, Lead IC); manager (manages people); director (Director, Head of); executive (VP and above, C-level, founder).
- employment_type: full_time unless the posting says otherwise.
- work_mode: onsite, hybrid or remote if the posting says; null if it doesn't.
- salary: the base pay range as written (numbers without symbols, e.g. 165000). period is how the numbers are stated (hour, year, ...). If only one number is given, put it in both min and max. Ignore equity, bonus and commission. Null if no pay is stated.
- years_experience_min: the smallest number of years asked for, as a number. Null if not stated.
- degree_required: the minimum degree required (not preferred). "unknown" if not stated.
- visa_sponsorship: "no" only if the posting says it won't sponsor; "yes" only if it says it will.
- skills: up to 10 concrete skills, tools or certifications the role asks for, most important first, short names ("Python", "RN license", "Excel", "Figma").
- interview_process: only if the posting describes its hiring steps. Map each step to the closest stage; put the posting's own words in detail. timeline: any stated duration ("about 3 weeks"). Otherwise null.
- summary: one plain sentence (max 30 words) on what the person in this job does. No hype, no company praise.

Allowed values:
industry: {", ".join(T.INDUSTRIES)}
role_family: {", ".join(T.ROLE_FAMILIES)}"""


@dataclass
class Usage:
    calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cache_write_tokens: int = 0
    cache_read_tokens: int = 0

    def add(self, u) -> None:
        self.calls += 1
        self.input_tokens += getattr(u, "input_tokens", 0) or 0
        self.output_tokens += getattr(u, "output_tokens", 0) or 0
        self.cache_write_tokens += getattr(u, "cache_creation_input_tokens", 0) or 0
        self.cache_read_tokens += getattr(u, "cache_read_input_tokens", 0) or 0

    @property
    def cost_usd(self) -> float:
        return (self.input_tokens * PRICES["input"] + self.output_tokens * PRICES["output"]
                + self.cache_write_tokens * PRICES["cache_write"] + self.cache_read_tokens * PRICES["cache_read"]) / 1e6


def _trim(text: str) -> str:
    text = text or ""
    if len(text) <= MAX_DESCRIPTION_CHARS:
        return text
    head = int(MAX_DESCRIPTION_CHARS * 0.75)
    tail = MAX_DESCRIPTION_CHARS - head
    # Hiring steps and pay are often near the end, so keep both ends.
    return text[:head] + "\n[...]\n" + text[-tail:]


def build_prompt(p: dict) -> str:
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
    if p.get("workplace_type"):
        lines.append(f"Workplace type (from hiring system): {p['workplace_type']}")
    if p.get("salary_min") is not None or p.get("salary_max") is not None:
        lines.append(f"Salary (from hiring system): {p.get('salary_min')} - {p.get('salary_max')} "
                     f"{p.get('salary_currency') or ''} {p.get('salary_interval') or ''}".strip())
    lines += ["", "Job description:", _trim(p.get("description_text") or "(none provided)")]
    return "\n".join(lines)


# ----------------------------------------------------------------- salary

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
    # Throw away numbers that can't be a real annual salary (typos, equity amounts, ...).
    if lo is not None and not (10_000 <= lo <= 2_000_000 and 10_000 <= hi <= 2_000_000):
        return None, None
    return lo, hi


def finalize(p: dict, raw: dict) -> dict:
    """Merge the model's answer with the hiring system's own structured fields."""
    out = {k: raw.get(k) for k in ("company_name", "industry", "role_family", "role_title", "seniority",
                                   "employment_type", "years_experience_min", "degree_required",
                                   "visa_sponsorship", "summary")}
    out["skills"] = [s.strip() for s in (raw.get("skills") or []) if s and s.strip()][:10]
    out["interview_process"] = raw.get("interview_process") or None
    if out["interview_process"] and not out["interview_process"].get("stages"):
        out["interview_process"] = None

    # Work mode: the hiring system's field is authoritative.
    wt = (p.get("workplace_type") or "").lower()
    out["work_mode"] = wt if wt in T.WORK_MODES else raw.get("work_mode")

    # Salary: structured fields first, then what the model read from the text.
    lo = hi = None
    source = None
    if p.get("salary_min") is not None or p.get("salary_max") is not None:
        lo, hi = annualize(p.get("salary_min"), p.get("salary_max"), period_from_interval(p.get("salary_interval")) or "year")
        if lo is not None:
            source = "hiring_system"
            out["salary_currency"] = p.get("salary_currency") or "USD"
    if lo is None:
        s = raw.get("salary") or {}
        lo, hi = annualize(s.get("min"), s.get("max"), s.get("period"))
        if lo is not None:
            source = "description"
            out["salary_currency"] = (s.get("currency") or "USD").upper()[:3]
    out["salary_min_annual"], out["salary_max_annual"] = lo, hi
    out["salary_source"] = source
    if lo is None:
        out["salary_currency"] = None
    return out


# ----------------------------------------------------------------- client

@dataclass
class Classifier:
    client: object  # anthropic.AsyncAnthropic or a test double with .messages.create
    model: str = DEFAULT_MODEL
    max_tokens: int = 1200
    usage: Usage = field(default_factory=Usage)

    @classmethod
    def from_env(cls, model: str | None = None) -> "Classifier":
        import anthropic
        key = os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            raise SystemExit("Set ANTHROPIC_API_KEY to classify jobs.")
        return cls(client=anthropic.AsyncAnthropic(api_key=key, max_retries=5), model=model or DEFAULT_MODEL)

    async def classify(self, posting: dict) -> dict:
        resp = await self.client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": build_prompt(posting)}],
            output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
        )
        self.usage.add(getattr(resp, "usage", None))
        if getattr(resp, "stop_reason", None) == "max_tokens":
            raise ValueError("response cut off at max_tokens")
        text = next((b.text for b in resp.content if getattr(b, "type", "") == "text"), None)
        if not text:
            raise ValueError(f"no text in response (stop_reason={getattr(resp, 'stop_reason', None)})")
        return finalize(posting, json.loads(text))
