"""One small adapter so the same SQL runs on SQLite (local) and Postgres (production).

SQL in this project is written with ``?`` placeholders and portable syntax
(``INSERT ... ON CONFLICT DO NOTHING``, ``CASE WHEN``). The adapter translates
placeholders for Postgres and gives both backends the same row and transaction
behavior.

Pick the backend with a URL:
    postgresql://user:pass@host:5432/dbname   -> Postgres (needs psycopg)
    jobs.sqlite  or  sqlite:///path/jobs.db    -> SQLite
"""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager


def is_postgres_url(url: str) -> bool:
    return url.startswith(("postgres://", "postgresql://"))


class DB:
    def __init__(self, url: str):
        self.url = url
        self.postgres = is_postgres_url(url)
        if self.postgres:
            try:
                import psycopg
                from psycopg.rows import dict_row
            except ImportError as e:  # pragma: no cover
                raise SystemExit('Postgres needs psycopg: pip install "jobdiscovery[postgres]"') from e
            self.conn = psycopg.connect(url, autocommit=True, row_factory=dict_row)
        else:
            path = url[len("sqlite:///"):] if url.startswith("sqlite:///") else url
            self.conn = sqlite3.connect(path, isolation_level=None)  # autocommit; tx() opens transactions
            self.conn.row_factory = sqlite3.Row
            self.conn.execute("PRAGMA journal_mode=WAL")
            self.conn.execute("PRAGMA foreign_keys=ON")
        self._in_tx = False

    # ------------------------------------------------------------------ core

    def _sql(self, sql: str, params) -> str:
        if self.postgres and params:
            return sql.replace("%", "%%").replace("?", "%s")
        return sql

    def execute(self, sql: str, params=()):
        params = tuple(params) if params else ()
        if self.postgres:
            cur = self.conn.cursor()
            cur.execute(self._sql(sql, params), params or None)
            return cur
        return self.conn.execute(sql, params)

    def executemany(self, sql: str, rows):
        rows = list(rows)
        if not rows:
            return 0
        if self.postgres:
            with self.conn.cursor() as cur:
                cur.executemany(self._sql(sql, rows[0]), rows)
                return cur.rowcount
        cur = self.conn.executemany(sql, rows)
        return cur.rowcount

    def one(self, sql: str, params=()):
        return self.execute(sql, params).fetchone()

    def all(self, sql: str, params=()):
        return self.execute(sql, params).fetchall()

    def scalar(self, sql: str, params=()):
        row = self.one(sql, params)
        if row is None:
            return None
        return next(iter(row.values())) if self.postgres else row[0]

    def script(self, sql: str):
        if self.postgres:
            for stmt in (s.strip() for s in sql.split(";")):
                if stmt:
                    self.execute(stmt)
        else:
            self.conn.executescript(sql)

    @contextmanager
    def tx(self):
        """Run a block in one transaction (nested calls join the outer one)."""
        if self._in_tx:
            yield
            return
        self._in_tx = True
        try:
            if self.postgres:
                with self.conn.transaction():
                    yield
            else:
                self.conn.execute("BEGIN")
                try:
                    yield
                except BaseException:
                    self.conn.execute("ROLLBACK")
                    raise
                else:
                    self.conn.execute("COMMIT")
        finally:
            self._in_tx = False

    def close(self):
        self.conn.close()
