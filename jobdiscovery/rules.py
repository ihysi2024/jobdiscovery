"""Deterministic extraction for the fields rules handle well.

Salary, seniority, years of experience, degree, visa sponsorship, work mode and
employment type follow predictable wording in job postings (NYC's pay
transparency law makes salary ranges especially regular), so plain rules are
fast, free and easy to audit. The LLM only handles fields that need judgment.

Every function returns None/"unknown" rather than guessing.
"""
from __future__ import annotations

import re

# ----------------------------------------------------------------- salary

_NUM = r"\$?\s?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+(?:\.\d+)?)\s?([kK])?"
_DASH = r"\s*(?:-|–|—|to|and)\s*"
_UNIT = r"(?:\s?/\s?(?:per\s+)?(?:h(?:ou)?r|y(?:ea)?r)|\s+(?:per|an|a)\s+(?:hour|year))?"
_RANGE = re.compile(r"(?:USD\s*)?\$\s?" + _NUM[3:] + _UNIT + _DASH + r"(?:USD\s*)?" + _NUM, re.I)
_SINGLE = re.compile(r"(?:USD\s*)?\$\s?" + _NUM[3:], re.I)

_PAY_CONTEXT = re.compile(
    r"salary|pay|compensation|base|wage|hourly|annual|per\s+(?:hour|year|annum)|/\s?(?:hr|hour|yr|year)|range|rate|earn|OTE",
    re.I)
_NOT_BASE_BEFORE = re.compile(r"bonus|equity|stock|RSU|commission|sign[- ]?on|stipend|reimburse|401|budget|revenue|funding|raised|valuation|\bARR\b|save|off\b", re.I)
_NOT_BASE_AFTER = re.compile(r"^\W{0,3}(?:sign[- ]?on|bonus|in equity|equity grant|stock|RSU|commission|stipend|budget|in funding|raised|million|billion|off\b)", re.I)


def _same_sentence_before(text: str, start: int, span: int = 60) -> str:
    before = text[max(0, start - span): start]
    cut = max(before.rfind("."), before.rfind("\n"), before.rfind(";"))
    # Ignore periods inside numbers like "45.00".
    while cut > 0 and cut + 1 < len(before) and before[cut + 1].isdigit():
        cut = max(before.rfind(".", 0, cut), before.rfind("\n", 0, cut), before.rfind(";", 0, cut))
    return before[cut + 1:] if cut >= 0 else before
_HOUR = re.compile(r"/\s?h(?:ou)?r\b|per\s+hour|hourly|an\s+hour|/hr", re.I)
_YEAR = re.compile(r"/\s?y(?:ea)?r\b|per\s+(?:year|annum)|annual|annually|yearly|a\s+year|salary", re.I)
_MONTH = re.compile(r"per\s+month|/\s?mo(?:nth)?\b|monthly", re.I)


def _to_number(num: str, k: str | None) -> float:
    v = float(num.replace(",", ""))
    return v * 1000 if k else v


def _period_near(text: str, start: int, end: int) -> str | None:
    window = text[max(0, start - 80): end + 60]
    after = text[end: end + 40]
    for pat, period in ((_HOUR, "hour"), (_MONTH, "month"), (_YEAR, "year")):
        if pat.search(after):
            return period
    for pat, period in ((_HOUR, "hour"), (_MONTH, "month"), (_YEAR, "year")):
        if pat.search(window):
            return period
    return None


def extract_salary(text: str) -> dict | None:
    """Find the base pay range in posting text.

    Returns {"min", "max", "period", "currency"} with numbers as written
    (not annualized), or None. Ranges near bonus/equity/funding words are skipped.
    """
    if not text or "$" not in text and "USD" not in text:
        return None
    candidates = []
    for m in _RANGE.finditer(text):
        lo = _to_number(m.group(1), m.group(2))
        hi = _to_number(m.group(3), m.group(4))
        # "$120-150K": the k applies to both numbers.
        if m.group(4) and not m.group(2) and lo < 1000 <= hi:
            lo *= 1000
        candidates.append((m.start(), m.end(), lo, hi))
    if not candidates:
        for m in _SINGLE.finditer(text):
            v = _to_number(m.group(1), m.group(2))
            candidates.append((m.start(), m.end(), v, v))

    best = None
    for start, end, lo, hi in candidates:
        context = text[max(0, start - 120): end + 60]
        if _NOT_BASE_BEFORE.search(_same_sentence_before(text, start)) or _NOT_BASE_AFTER.search(text[end: end + 25]):
            continue
        if not _PAY_CONTEXT.search(context):
            continue
        if lo > hi:
            lo, hi = hi, lo
        period = _period_near(text, start, end)
        if period is None:
            period = "hour" if hi < 500 else "year"
        # Plausibility per period; drops "$5 - $10 off", "$2,000,000 raised", etc.
        bounds = {"hour": (7, 500), "month": (800, 60000), "year": (15000, 2000000)}[period]
        if not (bounds[0] <= lo and hi <= bounds[1]):
            continue
        score = 2 if re.search(r"salary|pay range|compensation|base|wage", context, re.I) else 1
        if best is None or score > best[0]:
            best = (score, lo, hi, period)
        if score == 2:
            break
    if best is None:
        return None
    _, lo, hi, period = best
    return {"min": lo, "max": hi, "period": period, "currency": "USD"}


# ----------------------------------------------------------------- seniority

_IC_MANAGER = re.compile(
    r"\b(product|project|program|account|case|community|content|social media|partner(?:ship)?s?|customer success|"
    r"relationship|talent|marketing|brand|campaign|category|channel|growth|portfolio|property|asset|"
    r"implementation|solutions|release|vendor|office|events?|data|research|clinical trial|study)\s+manager\b",
    re.I)

_SENIORITY_RULES = [
    ("intern", re.compile(r"\bintern(ship)?\b|\bco-?op\b|\bsummer (analyst|associate)\b", re.I)),
    ("executive", re.compile(r"\b(chief|c[etofi]o|cxo|vice president|svp|evp|\bvp\b|president|founder|partner,? managing|general counsel)\b", re.I)),
    ("director", re.compile(r"\b(director|head of|dir\.)\b", re.I)),
    ("staff_principal", re.compile(r"\b(staff|principal|distinguished|fellow|architect)\b", re.I)),
    ("manager", re.compile(r"\b(manager|mgr|supervisor|team lead)\b", re.I)),
    ("senior", re.compile(r"\b(senior|sr\.?|lead|iii|iv|level 3|l3|l4)\b", re.I)),
    ("entry", re.compile(r"\b(junior|jr\.?|entry[- ]level|new grad|graduate|apprentice|trainee|assistant|associate|i)\b(?!\s*-)", re.I)),
    ("mid", re.compile(r"\b(ii|level 2|l2|mid[- ]level)\b", re.I)),
]


def seniority_from_title(title: str, years_min: float | None = None) -> str:
    t = title or ""
    for level, pat in _SENIORITY_RULES:
        if not pat.search(t):
            continue
        if level == "manager" and _IC_MANAGER.search(t) and not re.search(r"\b(senior|sr)\b", t, re.I):
            # "Product Manager" etc. are individual-contributor roles.
            return "mid"
        if level == "entry" and re.search(r"\bassociate\b", t, re.I) and re.search(r"\b(director|principal|partner|vp)\b", t, re.I):
            continue
        if level == "manager" and _IC_MANAGER.search(t):
            return "senior"  # "Senior Product Manager"
        return level
    if years_min is not None:
        if years_min >= 8:
            return "senior"
        if years_min >= 5:
            return "senior"
        if years_min <= 1:
            return "entry"
    return "mid"


# ----------------------------------------------------------------- experience, degree, visa

_YEARS = re.compile(
    r"(\d{1,2})(?:\s*(?:\+|plus))?\s*(?:-|–|to)?\s*(?:\d{1,2})?\s*\+?\s*(?:years?|yrs?)\b(?:[^.\n]{0,60}?)\b(experience|exp\b|working|in\b|of\b|professional)",
    re.I)
_WORD_NUM = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}
_YEARS_WORDS = re.compile(r"\b(" + "|".join(_WORD_NUM) + r")\s*(?:\(\d+\))?\s*\+?\s*years?\b[^.\n]{0,60}?experience", re.I)


def years_experience(text: str) -> float | None:
    found = []
    for m in _YEARS.finditer(text or ""):
        n = int(m.group(1))
        if 0 < n <= 30:
            found.append((m.start(), n))
    for m in _YEARS_WORDS.finditer(text or ""):
        found.append((m.start(), _WORD_NUM[m.group(1).lower()]))
    if not found:
        return None
    # The first mention is almost always the headline requirement.
    return float(sorted(found)[0][1])


_DEGREES = [
    ("high_school", re.compile(r"high school|\bGED\b|secondary school diploma", re.I)),
    ("associate", re.compile(r"associate'?s? degree", re.I)),
    ("bachelors", re.compile(r"bachelor|\bB\.?S\.?\b|\bB\.?A\.?\b|\bBSc\b|undergraduate degree|4-year degree|four-year degree|college degree", re.I)),
    ("masters", re.compile(r"master'?s|\bM\.?S\.?\b(?! office)|\bMBA\b|\bMSc\b|\bMPH\b|\bMSW\b", re.I)),
    ("phd", re.compile(r"\bPh\.?D\b|doctorate|doctoral degree", re.I)),
    ("professional", re.compile(r"\bM\.?D\.?\b|\bJ\.?D\.?\b|\bPharm\.?D\b|\bDDS\b|\bDMD\b|\bDVM\b|\bDNP\b", re.I)),
]


def degree_required(text: str) -> str:
    """The lowest degree the posting mentions ("Bachelor's required, Master's preferred" -> bachelors)."""
    t = text or ""
    if not re.search(r"degree|diploma|bachelor|master|ph\.?d|doctor|\bB\.?S\.?\b|\bM\.?S\.?\b|\bGED\b|\bMBA\b|\bJ\.?D\b|\bM\.?D\b", t, re.I):
        return "unknown"
    for level, pat in _DEGREES:
        if pat.search(t):
            return level
    if re.search(r"no degree required|degree not required", t, re.I):
        return "none"
    return "unknown"


_NO_SPONSOR = re.compile(
    r"(unable|not able|cannot|can ?not|will not|won'?t|do(?:es)? not|are not able|is not able)\s+(?:to\s+)?(?:currently\s+)?(?:provide\s+|offer\s+)?(?:visa\s+|immigration\s+|employment\s+)?sponsor|"
    r"no\s+(?:visa\s+)?sponsorship|without\s+(?:the\s+)?(?:need\s+for\s+)?(?:current\s+or\s+future\s+)?(?:visa\s+|employer\s+)?sponsorship|"
    r"sponsorship\s+(?:is\s+)?not\s+(?:available|provided|offered)|not\s+eligible\s+for\s+(?:visa\s+)?sponsorship|"
    # Roles open only to citizens or permanent residents can't be sponsored either.
    r"\bITAR\b|must\s+be\s+(?:a\s+)?U\.?S\.?\s+(?:citizen|person)|U\.?S\.?\s+citizenship\s+(?:is\s+)?required|"
    r"(?:active|current)\s+(?:secret|top\s+secret|TS/SCI|security)\s+clearance",
    re.I)
_YES_SPONSOR = re.compile(
    r"(?:visa|H-?1B|immigration)\s+sponsorship\s+(?:is\s+)?(?:available|provided|offered)|will\s+sponsor|we\s+(?:do\s+)?sponsor|"
    r"sponsorship\s+(?:is\s+)?(?:available|provided|offered)|open\s+to\s+sponsor",
    re.I)


def visa_sponsorship(text: str) -> str:
    t = text or ""
    if _NO_SPONSOR.search(t):
        return "no"
    if _YES_SPONSOR.search(t):
        return "yes"
    return "unknown"


# ----------------------------------------------------------------- work mode, employment type

# "No remote or hybrid work", "remote work is not available", "non-remote": these mention
# a mode only to rule it out, so they're removed before looking for one.
_MODE_NEGATED = re.compile(
    r"\b(?:no|not|non|never)[- ](?:\w+\s+){0,2}?(?:remote|hybrid)(?:\s+or\s+(?:remote|hybrid))?\b|"
    r"\b(?:remote|hybrid)\b(?:[\s,/-]+\w+){0,4}?\s+(?:is\s+|are\s+)?not\s+(?:available|an option|possible|offered|permitted|allowed|eligible|supported)",
    re.I)
_STRONG_REMOTE = re.compile(
    r"(?:this|the)\s+(?:role|position|job)\s+is\s+(?:fully\s+)?remote|remote[- ]first|work\s+(?:from\s+)?(?:anywhere|remotely)|"
    r"100%\s+remote|fully\s+remote", re.I)


def work_mode(structured: str | None, locations: list[str], title: str, text: str) -> str | None:
    s = (structured or "").lower()
    if s in ("onsite", "hybrid", "remote"):
        return s
    head = _MODE_NEGATED.sub(" ", " ".join(locations or []) + " " + (title or ""))
    body = _MODE_NEGATED.sub(" ", (text or "")[:4000])
    for blob in (head, body):
        if re.search(r"\bhybrid\b", blob, re.I):
            return "hybrid"
        # In the title or location line any "remote" counts; in the body only a clear statement does.
        if re.search(r"\bremote\b", blob, re.I) and (blob is head or _STRONG_REMOTE.search(blob)):
            return "remote"
        if re.search(r"\bon-?site\b|\bin[- ]office\b|\bin[- ]person\b|five days a week in", blob, re.I):
            return "onsite"
    return None


def employment_type(title: str, text: str) -> str:
    t = (title or "") + " " + (text or "")[:3000]
    tl = title or ""
    if re.search(r"\bintern(ship)?\b|\bco-?op\b", tl, re.I):
        return "internship"
    if re.search(r"\bfellow(ship)?\b", tl, re.I):
        return "fellowship"
    if re.search(r"\bpart[- ]time\b", t, re.I) and not re.search(r"\bfull[- ]time\b", tl, re.I):
        return "part_time"
    if re.search(r"\b(contract|contractor|freelance|1099)\b", tl, re.I) or re.search(r"\bcontract (role|position|assignment)\b|\b\d+[- ]month contract\b", t, re.I):
        return "contract"
    if re.search(r"\b(temporary|temp|seasonal|per diem)\b", tl, re.I):
        return "temporary"
    return "full_time"


# ----------------------------------------------------------------- all together

def extract(posting: dict) -> dict:
    """All rule-based fields for one posting (salary as written; annualized later)."""
    import json as _json
    text = posting.get("description_text") or ""
    title = posting.get("title") or ""
    locations = posting.get("locations") or []
    if isinstance(locations, str):
        try:
            locations = _json.loads(locations)
        except ValueError:
            locations = [locations]
    years = years_experience(text)
    return {
        "salary": extract_salary(text),
        "years_experience_min": years,
        "seniority": seniority_from_title(title, years),
        "degree_required": degree_required(text),
        "visa_sponsorship": visa_sponsorship(text),
        "work_mode": work_mode(posting.get("workplace_type"), locations, title, text),
        "employment_type": employment_type(title, text),
    }
