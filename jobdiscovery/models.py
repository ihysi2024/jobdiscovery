"""Shared data types."""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from typing import Any

ATS_NAMES = ("greenhouse", "lever", "ashby", "smartrecruiters", "workday", "oracle", "amazon", "nycjobs", "bofa")

# Sources that are one employer's own careers site rather than a hiring system
# many employers share. Their board name is the employer.
SINGLE_EMPLOYER = {"amazon": "Amazon", "nycjobs": "City of New York", "bofa": "Bank of America"}


@dataclass(frozen=True)
class Board:
    """One employer's public job board on one hiring system.

    ``token`` is the board identifier used in the API URL. Workday needs more
    than a token (host and site), so those go in ``extra``-style fields encoded
    in ``token`` as ``tenant|wdN|site``.
    """

    ats: str
    token: str
    region: str = ""  # Lever: "" (global) or "eu"

    @property
    def key(self) -> str:
        return f"{self.ats}:{self.region + ':' if self.region else ''}{self.token}"


@dataclass
class Posting:
    """A job posting normalized across hiring systems."""

    ats: str
    board_key: str
    external_id: str
    title: str
    locations: list[str]
    url: str
    is_remote: bool = False
    workplace_type: str = ""  # onsite | hybrid | remote | ""
    posted_at: str = ""
    department: str = ""
    description_text: str = ""
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str = ""
    salary_interval: str = ""
    raw: dict[str, Any] = field(default_factory=dict, repr=False)

    def fingerprint(self) -> str:
        """Hash of the fields that matter to users.

        If this is unchanged since the last poll, nothing downstream (LLM
        classification, embeddings) needs to run again.
        """
        parts = {
            "title": self.title.strip(),
            "locations": sorted(loc.strip() for loc in self.locations),
            "remote": self.is_remote,
            "workplace": self.workplace_type,
            "description": " ".join(self.description_text.split()),
            "salary": [self.salary_min, self.salary_max, self.salary_currency, self.salary_interval],
        }
        blob = json.dumps(parts, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(blob.encode("utf-8")).hexdigest()
