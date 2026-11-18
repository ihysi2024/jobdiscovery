"""Decide whether a posting's location is in New York City.

Location strings are free text and inconsistent across hiring systems
("New York, NY", "NYC - Hybrid", "Brooklyn", "10013", "New York (Remote)").
This is a deliberately conservative heuristic: it should almost never call a
non-NYC job NYC, at the cost of missing a few odd spellings. The LLM cleanup
step later can recover those.
"""
from __future__ import annotations

import re

_SPLIT = re.compile(r"\s*(?:;|\||/|\bor\b|\band\b|•|\n)\s*", re.I)

_BOROUGHS_AND_AREAS = (
    "manhattan", "brooklyn", "queens", "the bronx", "bronx", "staten island",
    "long island city", "astoria", "flushing", "jamaica, ny", "harlem",
    "williamsburg", "dumbo", "hudson yards", "midtown", "soho", "tribeca",
    "chelsea, ny", "flatiron", "fidi", "financial district, ny",
)

_POSITIVE = re.compile(
    r"\bnew york city\b|\bnyc\b|\bny,?\s*ny\b|"
    r"\bnew york\s*[,\-–]?\s*(?:ny|n\.y\.|new york|us|usa|united states|u\.s\.)\b|"
    r"\bny\s*[,\-–]\s*new york\b|"
    r"\b(?:" + "|".join(re.escape(a) for a in _BOROUGHS_AND_AREAS) + r")\b",
    re.I,
)

# Bare "New York" with nothing else is usually the city on job boards.
_BARE_NEW_YORK = re.compile(r"^\W*new york\W*(?:\(?(?:hybrid|on-?site|in[- ]office|office|hq|headquarters)\)?)?\W*$", re.I)
_NEW_YORK_WITH_QUALIFIER = re.compile(r"^\W*new york\s*[-–(,:]\s*(?:hybrid|on-?site|in[- ]office|office|hq)\b", re.I)

# NYC ZIP code prefixes: Manhattan 100-102, Staten Island 103, Bronx 104,
# Queens 111/113/114/116, Brooklyn 112. (110 and 115 are mostly Nassau County.)
_ZIP = re.compile(r"\b(?:10[0-4]|11[1-46])\d{2}\b")

# Other New York State places that must not count as NYC.
_NOT_NYC = re.compile(
    r"\b(?:albany|buffalo|rochester|syracuse|ithaca|white plains|yonkers|tarrytown|"
    r"westchester|long island(?! city)|hauppauge|melville|garden city|mineola|"
    r"uniondale|poughkeepsie|schenectady|binghamton|utica|purchase, ny|rye, ny|armonk|"
    r"sleepy hollow|valhalla|new rochelle|new york state|upstate|nassau|suffolk|"
    r"new jersey|nj\b)",
    re.I,
)

# "Remote - New York" or "New York (Remote)" means remote within the state, not an NYC office.
_REMOTE_ATTACHED = re.compile(
    r"remote\s*[-–(,:]?\s*(?:in\s+|within\s+|based in\s+)?new york\b|new york\s*[-–(,:]?\s*\(?remote\)?\s*$",
    re.I,
)


def location_is_nyc(location: str) -> bool:
    """True if any piece of this location string is in New York City."""
    if not location:
        return False
    for piece in _SPLIT.split(location):
        piece = piece.strip()
        if piece and _piece_is_nyc(piece):
            return True
    return False


def _piece_is_nyc(piece: str) -> bool:
    if _NOT_NYC.search(piece):
        return False
    if _REMOTE_ATTACHED.search(piece) and not re.search(r"\bnyc\b|new york city|\bny,?\s*ny\b|new york,?\s*ny\b", piece, re.I):
        return False
    if _POSITIVE.search(piece):
        return True
    if _BARE_NEW_YORK.match(piece) or _NEW_YORK_WITH_QUALIFIER.match(piece):
        return True
    if _ZIP.search(piece) and re.search(r"\bny\b|new york", piece, re.I):
        return True
    return False


def any_nyc(locations) -> bool:
    return any(location_is_nyc(loc) for loc in locations)
