"""Storage for boards, postings and run history (SQLite locally, Postgres in production).

Key behaviors:

* Fingerprints: an unchanged posting only gets ``last_seen_at`` bumped.
  ``content_hash != processed_hash`` marks rows that need (re)processing by
  later steps (LLM classification, embeddings).
* Closing: after a *successful* poll, any stored posting for that board that
  wasn't returned is marked ``closed_at``. Failed polls never close anything.
* Scheduling: boards with NYC jobs are polled daily; boards without are
  rechecked monthly; dead boards quarterly; errors back off.
* Runs: every discover/poll records a row in ``runs``. That row is also the
  lock that stops two runs of the same command overlapping, and the history
  the health check compares against.
"""
from __future__ import annotations

import json
import zlib
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from .db import DB
from .models import Board, Posting
from .nyc import any_nyc

_SCHEMA = """
CREATE TABLE IF NOT EXISTS boards (
    key             TEXT PRIMARY KEY,
    ats             TEXT NOT NULL,
    token           TEXT NOT NULL,
    region          TEXT NOT NULL DEFAULT '',
    source          TEXT NOT NULL,
    discovered_at   TEXT NOT NULL,
    company_name    TEXT,
    last_polled_at  TEXT,
    last_status     TEXT,
    last_error      TEXT,
    error_streak    INTEGER NOT NULL DEFAULT 0,
    open_jobs       INTEGER,
    nyc_jobs        INTEGER,
    next_poll_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS boards_next_poll ON boards(next_poll_at);
CREATE TABLE IF NOT EXISTS postings (
    id              {id_col},
    board_key       TEXT NOT NULL REFERENCES boards(key),
    external_id     TEXT NOT NULL,
    title           TEXT NOT NULL,
    locations       TEXT NOT NULL,
    is_nyc          INTEGER NOT NULL,
    is_remote       INTEGER NOT NULL,
    workplace_type  TEXT,
    url             TEXT,
    posted_at       TEXT,
    department      TEXT,
    salary_min      {float},
    salary_max      {float},
    salary_currency TEXT,
    salary_interval TEXT,
    description_text TEXT,
    payload         TEXT,
    content_hash    TEXT NOT NULL,
    processed_hash  TEXT,
    first_seen_at   TEXT NOT NULL,
    last_seen_at    TEXT NOT NULL,
    changed_at      TEXT,
    closed_at       TEXT,
    UNIQUE (board_key, external_id)
);
CREATE INDEX IF NOT EXISTS postings_open_nyc ON postings(is_nyc, closed_at);
CREATE TABLE IF NOT EXISTS runs (
    id              {id_col},
    command         TEXT NOT NULL,
    started_at      TEXT NOT NULL,
    heartbeat_at    TEXT NOT NULL,
    finished_at     TEXT,
    status          TEXT NOT NULL,
    stats           TEXT,
    error           TEXT
);
CREATE INDEX IF NOT EXISTS runs_command ON runs(command, started_at);
CREATE TABLE IF NOT EXISTS job_features (
    posting_id          BIGINT PRIMARY KEY REFERENCES postings(id) ON DELETE CASCADE,
    processed_hash      TEXT,
    processed_at        TEXT,
    model               TEXT,
    attempts            INTEGER NOT NULL DEFAULT 0,
    last_error          TEXT,
    company_name        TEXT,
    industry            TEXT,
    role_family         TEXT,
    role_title          TEXT,
    seniority           TEXT,
    employment_type     TEXT,
    work_mode           TEXT,
    salary_min_annual   {float},
    salary_max_annual   {float},
    salary_currency     TEXT,
    salary_source       TEXT,
    years_experience_min {float},
    degree_required     TEXT,
    visa_sponsorship    TEXT,
    skills              TEXT,
    interview_process   TEXT,
    summary             TEXT,
    embedding_model     TEXT,
    embedding           {vector}
);
CREATE INDEX IF NOT EXISTS job_features_role ON job_features(role_family, seniority);
CREATE INDEX IF NOT EXISTS job_features_industry ON job_features(industry)
"""

# What the web app may read. On Supabase, tables in the public schema are reachable
# with the public (publishable) key unless row-level security is on, so the raw
# tables are locked and only this view of open NYC jobs is granted to the app's
# roles. The poller connects as the table owner, which RLS doesn't restrict.
PUBLIC_API_SQL = ("""
CREATE OR REPLACE VIEW job_listings AS
SELECT p.id, p.board_key, b.ats, b.token,
       COALESCE(f.company_name, b.company_name, b.token) AS company_name,
       COALESCE(f.role_title, p.title) AS title, p.title AS posted_title,
       p.locations, p.workplace_type, p.url, p.posted_at, p.first_seen_at, p.department,
       p.description_text,
       f.industry, f.role_family, f.seniority, f.employment_type, f.work_mode,
       f.salary_min_annual, f.salary_max_annual, f.salary_currency, f.salary_source,
       f.years_experience_min, f.degree_required, f.visa_sponsorship,
       f.skills, f.interview_process, f.summary, f.processed_at
FROM postings p
JOIN boards b ON b.key = p.board_key
LEFT JOIN job_features f ON f.posting_id = p.id
WHERE p.closed_at IS NULL AND p.is_nyc = 1
""", """
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
    ALTER TABLE postings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE job_features ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON boards, postings, runs, job_features FROM anon, authenticated;
    REVOKE ALL ON job_listings FROM anon, authenticated;
    GRANT SELECT ON job_listings TO anon, authenticated;
  END IF;
END $$
""")

from .embed import EMBED_DIM  # noqa: E402  (keeps the schema in step with the embedding model)

DAILY = timedelta(days=1)
MONTHLY = timedelta(days=30)
QUARTERLY = timedelta(days=90)
LOCK_STALE_AFTER = timedelta(minutes=30)  # a run with no heartbeat this long is presumed dead


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def iso(dt: datetime) -> str:
    return dt.isoformat()


class LockHeld(Exception):
    """Another run of the same command is still in progress."""


@dataclass
class PollStats:
    new: int = 0
    changed: int = 0
    unchanged: int = 0
    closed: int = 0
    open_jobs: int = 0
    nyc_jobs: int = 0


class Store:
    def __init__(self, url: str):
        self.db = DB(url)
        self.has_pgvector = False
        if self.db.postgres:
            self.has_pgvector = self._enable_pgvector()
            vector = f"vector({EMBED_DIM})" if self.has_pgvector else "TEXT"
            schema = _SCHEMA.format(id_col="BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY",
                                    float="DOUBLE PRECISION", vector=vector)
        else:
            schema = _SCHEMA.format(id_col="INTEGER PRIMARY KEY AUTOINCREMENT", float="REAL", vector="TEXT")
        self.db.script(schema)
        if self.db.postgres:
            for stmt in PUBLIC_API_SQL:
                self.db.execute(stmt)

    def _enable_pgvector(self) -> bool:
        """Use pgvector for embeddings when the database allows it (Supabase and Neon do)."""
        try:
            self.db.execute("CREATE EXTENSION IF NOT EXISTS vector")
            return True
        except Exception:
            # Not installed or no permission: embeddings are stored as JSON text instead.
            return False

    def close(self):
        self.db.close()

    # ------------------------------------------------------------------ runs / lock

    def start_run(self, command: str, *, when: datetime | None = None) -> int:
        when = when or now_utc()
        with self.db.tx():
            if self.db.postgres:
                self.db.execute("SELECT pg_advisory_xact_lock(?)", (zlib.crc32(command.encode()) & 0x7FFFFFFF,))
            row = self.db.one(
                "SELECT id, heartbeat_at FROM runs WHERE command=? AND finished_at IS NULL "
                "ORDER BY id DESC LIMIT 1", (command,))
            if row is not None:
                beat = datetime.fromisoformat(row["heartbeat_at"])
                if when - beat < LOCK_STALE_AFTER:
                    raise LockHeld(f"{command} run #{row['id']} is still running (last heartbeat {row['heartbeat_at']})")
                self.db.execute("UPDATE runs SET finished_at=?, status='abandoned' WHERE id=?", (iso(when), row["id"]))
            self.db.execute("INSERT INTO runs (command, started_at, heartbeat_at, status) VALUES (?, ?, ?, 'running')",
                            (command, iso(when), iso(when)))
            return self.db.scalar("SELECT MAX(id) FROM runs WHERE command=?", (command,))

    def heartbeat(self, run_id: int, *, when: datetime | None = None):
        self.db.execute("UPDATE runs SET heartbeat_at=? WHERE id=?", (iso(when or now_utc()), run_id))

    def finish_run(self, run_id: int, status: str, stats: dict | None = None, error: str | None = None,
                   *, when: datetime | None = None):
        self.db.execute("UPDATE runs SET finished_at=?, status=?, stats=?, error=? WHERE id=?",
                        (iso(when or now_utc()), status, json.dumps(stats or {}), (error or "")[:2000] or None, run_id))

    def latest_finished_runs(self, prefix: str) -> list[dict]:
        """The most recent finished run of every command named ``prefix`` or ``prefix:<anything>``."""
        rows = self.db.all(
            "SELECT * FROM runs r WHERE (command=? OR command LIKE ?) AND finished_at IS NOT NULL "
            "AND id = (SELECT MAX(id) FROM runs r2 WHERE r2.command = r.command AND r2.finished_at IS NOT NULL)",
            (prefix, prefix + ":%"))
        return [dict(r) for r in rows]

    def recent_runs(self, command: str, limit: int = 10) -> list[dict]:
        rows = self.db.all("SELECT * FROM runs WHERE command=? AND finished_at IS NOT NULL "
                           "ORDER BY id DESC LIMIT ?", (command, limit))
        out = []
        for r in rows:
            d = dict(r)
            d["stats"] = json.loads(d["stats"]) if d.get("stats") else {}
            out.append(d)
        return out

    # ------------------------------------------------------------------ boards

    def add_boards(self, boards, source: str, *, when: datetime | None = None) -> int:
        """Insert boards that aren't known yet. Returns how many were new."""
        when = when or now_utc()
        rows = [(b.key, b.ats, b.token, b.region, source, iso(when), iso(when)) for b in boards]
        if not rows:
            return 0
        before = self.db.scalar("SELECT COUNT(*) FROM boards")
        with self.db.tx():
            self.db.executemany(
                "INSERT INTO boards (key, ats, token, region, source, discovered_at, next_poll_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING", rows)
        return self.db.scalar("SELECT COUNT(*) FROM boards") - before

    def due_boards(self, *, when: datetime | None = None, limit: int | None = None,
                   ats: set[str] | None = None, include_not_due: bool = False) -> list[Board]:
        when = when or now_utc()
        sql = "SELECT ats, token, region FROM boards WHERE 1=1"
        args: list = []
        if not include_not_due:
            sql += " AND next_poll_at <= ?"
            args.append(iso(when))
        if ats:
            sql += f" AND ats IN ({','.join('?' * len(ats))})"
            args.extend(sorted(ats))
        # Boards known to have NYC jobs first, then never-polled, then the rest.
        sql += (" ORDER BY CASE WHEN COALESCE(nyc_jobs,0) > 0 THEN 0 ELSE 1 END,"
                " CASE WHEN last_polled_at IS NULL THEN 0 ELSE 1 END, next_poll_at, key")
        if limit:
            sql += " LIMIT ?"
            args.append(limit)
        return [Board(r["ats"], r["token"], r["region"]) for r in self.db.all(sql, args)]

    def mark_gone(self, board: Board, *, when: datetime | None = None):
        when = when or now_utc()
        with self.db.tx():
            self.db.execute(
                "UPDATE boards SET last_polled_at=?, last_status='gone', last_error=NULL, error_streak=0, "
                "open_jobs=0, nyc_jobs=0, next_poll_at=? WHERE key=?",
                (iso(when), iso(when + QUARTERLY), board.key))
            self.db.execute("UPDATE postings SET closed_at=? WHERE board_key=? AND closed_at IS NULL",
                            (iso(when), board.key))

    def mark_error(self, board: Board, error: str, *, when: datetime | None = None):
        when = when or now_utc()
        streak = (self.db.scalar("SELECT error_streak FROM boards WHERE key=?", (board.key,)) or 0) + 1
        delay = min(timedelta(hours=6) * (2 ** (streak - 1)), timedelta(days=14))
        self.db.execute(
            "UPDATE boards SET last_polled_at=?, last_status='error', last_error=?, error_streak=?, next_poll_at=? "
            "WHERE key=?", (iso(when), error[:500], streak, iso(when + delay), board.key))

    # ---------------------------------------------------------------- postings

    def apply_poll(self, board: Board, postings: list[Posting], *, when: datetime | None = None,
                   all_locations: bool = False) -> PollStats:
        """Record one successful poll of a board.

        Only NYC postings are stored unless ``all_locations`` is set; counts of
        all open jobs are kept on the board either way.
        """
        when = when or now_utc()
        ts = iso(when)
        stats = PollStats(open_jobs=len(postings))
        seen_ids: list[str] = []

        with self.db.tx():
            for p in postings:
                is_nyc = any_nyc(p.locations)
                stats.nyc_jobs += is_nyc
                if not (is_nyc or all_locations):
                    continue
                if p.external_id in seen_ids:
                    continue  # some boards list the same job twice
                seen_ids.append(p.external_id)
                h = p.fingerprint()
                row = self.db.one(
                    "SELECT id, content_hash, closed_at FROM postings WHERE board_key=? AND external_id=?",
                    (board.key, p.external_id))
                values = (p.title, json.dumps(p.locations), int(is_nyc), int(p.is_remote), p.workplace_type,
                          p.url, p.posted_at, p.department, p.salary_min, p.salary_max, p.salary_currency,
                          p.salary_interval, p.description_text, json.dumps(p.raw, ensure_ascii=False))
                if row is None:
                    self.db.execute(
                        "INSERT INTO postings (board_key, external_id, title, locations, is_nyc, is_remote, "
                        "workplace_type, url, posted_at, department, salary_min, salary_max, salary_currency, "
                        "salary_interval, description_text, payload, content_hash, first_seen_at, last_seen_at) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (board.key, p.external_id, *values, h, ts, ts))
                    stats.new += 1
                elif row["content_hash"] == h and row["closed_at"] is None:
                    self.db.execute("UPDATE postings SET last_seen_at=? WHERE id=?", (ts, row["id"]))
                    stats.unchanged += 1
                else:
                    self.db.execute(
                        "UPDATE postings SET title=?, locations=?, is_nyc=?, is_remote=?, workplace_type=?, url=?, "
                        "posted_at=?, department=?, salary_min=?, salary_max=?, salary_currency=?, salary_interval=?, "
                        "description_text=?, payload=?, content_hash=?, last_seen_at=?, changed_at=?, closed_at=NULL "
                        "WHERE id=?", (*values, h, ts, ts, row["id"]))
                    self.db.execute("UPDATE job_features SET attempts=0, last_error=NULL WHERE posting_id=?", (row["id"],))
                    stats.changed += 1

            # Close anything stored for this board that wasn't in this poll.
            if seen_ids:
                placeholders = ",".join("?" * len(seen_ids))
                cur = self.db.execute(
                    f"UPDATE postings SET closed_at=? WHERE board_key=? AND closed_at IS NULL "
                    f"AND external_id NOT IN ({placeholders})", (ts, board.key, *seen_ids))
            else:
                cur = self.db.execute(
                    "UPDATE postings SET closed_at=? WHERE board_key=? AND closed_at IS NULL", (ts, board.key))
            stats.closed = cur.rowcount

            nxt = when + (DAILY if stats.nyc_jobs else MONTHLY)
            self.db.execute(
                "UPDATE boards SET last_polled_at=?, last_status='ok', last_error=NULL, error_streak=0, "
                "open_jobs=?, nyc_jobs=?, next_poll_at=? WHERE key=?",
                (ts, stats.open_jobs, stats.nyc_jobs, iso(nxt), board.key))
        return stats

    # ---------------------------------------------------------------- processing

    def postings_to_process(self, *, limit: int | None = None, max_attempts: int = 3,
                            shard: tuple[int, int] | None = None) -> list[dict]:
        """Open postings whose content hasn't been classified yet (new, changed, or failed < max_attempts).

        ``shard=(i, n)`` returns only postings with ``id % n == i``, so n workers can split the queue."""
        sql = ("SELECT p.id, p.board_key, p.title, p.locations, p.department, p.workplace_type, p.is_remote, "
               "p.salary_min, p.salary_max, p.salary_currency, p.salary_interval, p.description_text, "
               "p.content_hash, b.ats, b.token "
               "FROM postings p JOIN boards b ON b.key = p.board_key "
               "LEFT JOIN job_features f ON f.posting_id = p.id "
               "WHERE p.closed_at IS NULL AND (p.processed_hash IS NULL OR p.processed_hash != p.content_hash) "
               "AND COALESCE(f.attempts, 0) < ?")
        args: list = [max_attempts]
        if shard is not None:
            sql += " AND p.id % ? = ?"
            args += [shard[1], shard[0]]
        sql += " ORDER BY p.first_seen_at DESC, p.id"
        if limit:
            sql += " LIMIT ?"
            args.append(limit)
        return [dict(r) for r in self.db.all(sql, args)]

    _FEATURE_COLS = ("company_name", "industry", "role_family", "role_title", "seniority", "employment_type",
                     "work_mode", "salary_min_annual", "salary_max_annual", "salary_currency", "salary_source",
                     "years_experience_min", "degree_required", "visa_sponsorship", "skills", "interview_process",
                     "summary")

    def save_features(self, posting_id: int, content_hash: str, features: dict, *, model: str,
                      embedding: list[float] | None = None, embedding_model: str | None = None,
                      when: datetime | None = None):
        """Store classification results and mark the posting processed for this exact content."""
        ts = iso(when or now_utc())
        vals = []
        for col in self._FEATURE_COLS:
            v = features.get(col)
            if isinstance(v, (list, dict)):
                v = json.dumps(v, ensure_ascii=False)
            vals.append(v)
        emb = json.dumps([round(x, 6) for x in embedding]) if embedding is not None else None
        emb_sql = "CAST(? AS vector)" if self.has_pgvector else "?"
        cols = ", ".join(self._FEATURE_COLS)
        marks = ", ".join("?" * len(self._FEATURE_COLS))
        updates = ", ".join(f"{c}=excluded.{c}" for c in self._FEATURE_COLS)
        with self.db.tx():
            self.db.execute(
                f"INSERT INTO job_features (posting_id, processed_hash, processed_at, model, attempts, last_error, "
                f"{cols}, embedding_model, embedding) VALUES (?, ?, ?, ?, 0, NULL, {marks}, ?, {emb_sql}) "
                f"ON CONFLICT (posting_id) DO UPDATE SET processed_hash=excluded.processed_hash, "
                f"processed_at=excluded.processed_at, model=excluded.model, attempts=0, last_error=NULL, {updates}, "
                f"embedding_model=excluded.embedding_model, embedding=excluded.embedding",
                (posting_id, content_hash, ts, model, *vals, embedding_model, emb))
            # Only mark processed if the posting hasn't changed while we were working on it.
            self.db.execute("UPDATE postings SET processed_hash=? WHERE id=? AND content_hash=?",
                            (content_hash, posting_id, content_hash))

    def record_feature_error(self, posting_id: int, error: str):
        self.db.execute(
            "INSERT INTO job_features (posting_id, attempts, last_error) VALUES (?, 1, ?) "
            "ON CONFLICT (posting_id) DO UPDATE SET attempts=job_features.attempts + 1, last_error=excluded.last_error",
            (posting_id, error[:1000]))

    def features_for(self, posting_id: int) -> dict | None:
        row = self.db.one("SELECT * FROM job_features WHERE posting_id=?", (posting_id,))
        return dict(row) if row else None

    # ---------------------------------------------------------------- queries

    def summary(self) -> dict:
        q = self.db.scalar
        by_ats = {r["ats"]: {k: (v if k == "ats" or v is None else int(v)) for k, v in dict(r).items()}
                  for r in self.db.all(
            "SELECT ats, COUNT(*) AS boards, "
            "SUM(CASE WHEN last_polled_at IS NOT NULL THEN 1 ELSE 0 END) AS polled, "
            "SUM(CASE WHEN last_status='ok' THEN 1 ELSE 0 END) AS ok, "
            "SUM(CASE WHEN last_status='gone' THEN 1 ELSE 0 END) AS gone, "
            "SUM(CASE WHEN last_status='error' THEN 1 ELSE 0 END) AS errors, "
            "SUM(CASE WHEN COALESCE(nyc_jobs,0) > 0 THEN 1 ELSE 0 END) AS boards_with_nyc, "
            "SUM(COALESCE(nyc_jobs,0)) AS nyc_jobs, SUM(COALESCE(open_jobs,0)) AS open_jobs "
            "FROM boards GROUP BY ats ORDER BY ats")}
        return {
            "boards": q("SELECT COUNT(*) FROM boards"),
            "polled": q("SELECT COUNT(*) FROM boards WHERE last_polled_at IS NOT NULL"),
            "boards_with_nyc_jobs": q("SELECT COUNT(*) FROM boards WHERE nyc_jobs > 0"),
            "open_nyc_postings": q("SELECT COUNT(*) FROM postings WHERE is_nyc=1 AND closed_at IS NULL"),
            "nyc_postings_with_salary": q("SELECT COUNT(*) FROM postings WHERE is_nyc=1 AND closed_at IS NULL "
                                          "AND (salary_min IS NOT NULL OR description_text LIKE '%$%')"),
            "needs_processing": q("SELECT COUNT(*) FROM postings WHERE closed_at IS NULL "
                                  "AND (processed_hash IS NULL OR processed_hash != content_hash)"),
            "processed_open": q("SELECT COUNT(*) FROM postings p JOIN job_features f ON f.posting_id = p.id "
                                "WHERE p.closed_at IS NULL AND f.processed_hash = p.content_hash"),
            "by_ats": by_ats,
        }

    def boards_with_nyc(self):
        return self.db.all(
            "SELECT key, ats, token, region, nyc_jobs, open_jobs, last_polled_at FROM boards "
            "WHERE nyc_jobs > 0 ORDER BY nyc_jobs DESC, key")

    def open_nyc_postings(self):
        return self.db.all(
            "SELECT p.board_key, b.ats, p.title, p.locations, p.workplace_type, p.salary_min, p.salary_max, "
            "p.salary_currency, p.salary_interval, p.department, p.posted_at, p.url, p.first_seen_at "
            "FROM postings p JOIN boards b ON b.key = p.board_key "
            "WHERE p.is_nyc=1 AND p.closed_at IS NULL ORDER BY p.board_key, p.title")

