"""Embeddings for matching people to jobs.

Uses BAAI/bge-small-en-v1.5 through fastembed: a small open model (384
dimensions) that runs on the CPU inside the GitHub Action, so there's no API
key or per-call cost. The app must embed resumes with the same model so the
vectors are comparable.
"""
from __future__ import annotations

import os

EMBED_MODEL = "BAAI/bge-small-en-v1.5"
EMBED_DIM = 384


def job_text(posting: dict, features: dict) -> str:
    """The text that represents a job for matching: what it is, not the boilerplate."""
    parts = [
        features.get("role_title") or posting.get("title", ""),
        " · ".join(x for x in [features.get("role_family"), features.get("seniority"), features.get("industry")] if x),
        features.get("company_name") or "",
        features.get("summary") or "",
    ]
    if features.get("skills"):
        parts.append("Skills: " + ", ".join(features["skills"]))
    desc = (posting.get("description_text") or "").strip()
    if desc:
        parts.append(desc[:1500])
    return "\n".join(p for p in parts if p)


class Embedder:
    def __init__(self, model_name: str = EMBED_MODEL, cache_dir: str | None = None):
        from fastembed import TextEmbedding
        self.model_name = model_name
        self._model = TextEmbedding(model_name=model_name,
                                    cache_dir=cache_dir or os.environ.get("FASTEMBED_CACHE_PATH"))

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [v.tolist() for v in self._model.embed(texts, batch_size=32)]
