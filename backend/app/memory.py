"""Memory — SQLite by default, Postgres when DATABASE_URL says so.
Stores companies, people, mails, replies and what worked, so the agent
remembers every campaign and learns which hooks / subjects got replies.

Backend selection (read at each ``connect()`` call, so tests and redeploys
can flip it without restarting the process):
- ``DATABASE_URL`` starting with ``postgres://`` or ``postgresql://`` ->
  Postgres, via ``psycopg`` (v3). The schema is created on first connect
  (``CREATE TABLE IF NOT EXISTS`` — the migration is idempotent, no
  separate migration step). No credentials are hardcoded: the URL comes
  from the environment only.
- Anything else (unset, empty, or a ``sqlite://`` URL) -> the local
  SQLite file at ``DB_PATH`` (an explicit ``db_path`` argument to
  ``connect()`` always means a SQLite file, so tests can use scratch DBs).

Both backends expose the same small DB-API surface the callers use:
``conn.execute(sql, params)`` with ``?`` placeholders, ``.fetchone()`` /
``.fetchall()``, ``.rowcount``, ``.lastrowid`` (SQLite) and ``conn.commit()``
/ ``conn.close()``. The Postgres wrapper translates ``?`` to ``%s`` and
rewrites SQLite-only ``INSERT OR REPLACE`` to Postgres
``ON CONFLICT ... DO UPDATE`` using each table's UNIQUE key, so no caller
had to change.
"""
import json
import os
import re
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "sdr.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY, name TEXT UNIQUE, domain TEXT, summary TEXT,
  sources TEXT, created_at REAL
);
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY, company TEXT, name TEXT, title TEXT, email TEXT,
  verified INTEGER, score INTEGER, linkedin TEXT, created_at REAL,
  UNIQUE(company, email)
);
CREATE TABLE IF NOT EXISTS mails (
  id INTEGER PRIMARY KEY, company TEXT, recipient TEXT, email TEXT,
  subject TEXT, body TEXT, status TEXT, message_id TEXT, sent_at REAL,
  reply_class TEXT
);
CREATE TABLE IF NOT EXISTS learnings (
  id INTEGER PRIMARY KEY, kind TEXT, text TEXT, outcome TEXT, created_at REAL
);
"""

# Same tables for Postgres. Only the auto-incrementing id differs:
# SQLite's bare INTEGER PRIMARY KEY becomes SERIAL, everything else
# (TEXT / REAL / INTEGER flags) is valid in both.
PG_SCHEMA = """
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY, name TEXT UNIQUE, domain TEXT, summary TEXT,
  sources TEXT, created_at DOUBLE PRECISION
);
CREATE TABLE IF NOT EXISTS people (
  id SERIAL PRIMARY KEY, company TEXT, name TEXT, title TEXT, email TEXT,
  verified INTEGER, score INTEGER, linkedin TEXT, created_at DOUBLE PRECISION,
  UNIQUE(company, email)
);
CREATE TABLE IF NOT EXISTS mails (
  id SERIAL PRIMARY KEY, company TEXT, recipient TEXT, email TEXT,
  subject TEXT, body TEXT, status TEXT, message_id TEXT, sent_at DOUBLE PRECISION,
  reply_class TEXT
);
CREATE TABLE IF NOT EXISTS learnings (
  id SERIAL PRIMARY KEY, kind TEXT, text TEXT, outcome TEXT, created_at DOUBLE PRECISION
);
"""

# UNIQUE key per table, used to rewrite INSERT OR REPLACE as ON CONFLICT.
_CONFLICT_COLS = {
    "companies": ["name"],
    "people": ["company", "email"],
}


def postgres_url():
    """The configured Postgres URL, or "" when SQLite is in use."""
    url = os.environ.get("DATABASE_URL", "").strip()
    if url.startswith(("postgres://", "postgresql://")):
        return url
    return ""


def database_kind():
    """'postgres' when DATABASE_URL points at Postgres, else 'sqlite'."""
    return "postgres" if postgres_url() else "sqlite"


# ---------------------------------------------------------------------------
# Postgres compatibility wrapper (psycopg, DB-API surface of sqlite3)
# ---------------------------------------------------------------------------

def _translate_sql(sql):
    """Rewrite SQLite-dialect SQL to Postgres dialect.

    - ``?`` placeholders -> ``%s`` (none of our queries has a literal
      ``?`` inside a string, so a plain replace is safe here).
    - ``INSERT OR REPLACE INTO t (cols...) VALUES (...)`` ->
      ``INSERT INTO t (cols...) VALUES (...) ON CONFLICT (key) DO UPDATE
      SET col=EXCLUDED.col, ...`` for every non-key column.
    - ``INSERT OR IGNORE INTO t ...`` -> ``... ON CONFLICT DO NOTHING``.
    """
    sql = sql.strip()
    m = re.match(
        r"INSERT OR REPLACE INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)",
        sql, re.IGNORECASE | re.DOTALL,
    )
    if m:
        table, cols_raw, vals_raw = m.group(1), m.group(2), m.group(3)
        cols = [c.strip() for c in cols_raw.split(",")]
        key = _CONFLICT_COLS.get(table.lower())
        if not key:
            raise ValueError(f"No ON CONFLICT key known for table {table!r}")
        rest = sql[m.end():]
        assignments = ", ".join(
            f"{c}=EXCLUDED.{c}" for c in cols if c not in key
        )
        sql = (
            f"INSERT INTO {table} ({', '.join(cols)}) "
            f"VALUES ({vals_raw}) ON CONFLICT ({', '.join(key)}) "
            f"DO UPDATE SET {assignments}{rest}"
        )
    elif re.match(r"INSERT OR IGNORE INTO", sql, re.IGNORECASE):
        sql = re.sub(r"INSERT OR IGNORE INTO", "INSERT INTO", sql,
                     count=1, flags=re.IGNORECASE)
        # Append ON CONFLICT DO NOTHING after the VALUES (...) list.
        sql = sql.rstrip()
        if sql.endswith(")"):
            sql += " ON CONFLICT DO NOTHING"
    return sql.replace("?", "%s")


class _PGCursor:
    """Wraps a psycopg cursor; rows come back as plain tuples."""

    def __init__(self, cur):
        self._cur = cur
        self._lastrowid = None

    def execute(self, sql, params=None):
        # save_mail appends RETURNING id for Postgres; fetch it here so
        # callers can read .lastrowid exactly like sqlite3.
        returning = sql.rstrip().rstrip(";").upper().endswith("RETURNING ID")
        self._cur.execute(_translate_sql(sql), params or ())
        if returning:
            row = self._cur.fetchone()
            self._lastrowid = row[0] if row else None
        return self

    def executemany(self, sql, seq):
        self._cur.executemany(_translate_sql(sql), seq or [])
        return self

    def fetchone(self):
        row = self._cur.fetchone()
        return None if row is None else tuple(row)

    def fetchall(self):
        return [tuple(r) for r in self._cur.fetchall()]

    @property
    def rowcount(self):
        return self._cur.rowcount

    @property
    def lastrowid(self):
        return self._lastrowid

    def close(self):
        self._cur.close()


class _PGConnection:
    """Wraps a psycopg connection with the sqlite3 surface callers use."""

    is_postgres = True

    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql, params=None):
        return _PGCursor(self._conn.cursor()).execute(sql, params)

    def executescript(self, script):
        with self._conn.cursor() as cur:
            cur.execute(script)
        return self

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        if exc[0] is None:
            self.commit()
        else:
            self.rollback()
        self.close()
        return False


def _connect_postgres(url):
    try:
        import psycopg
    except ImportError as e:  # pragma: no cover - missing dependency
        raise RuntimeError(
            "DATABASE_URL points at Postgres but psycopg is not installed; "
            "install it with: pip install 'psycopg[binary]'"
        ) from e
    conn = _PGConnection(psycopg.connect(url))
    conn.executescript(PG_SCHEMA)
    conn.commit()
    return conn


def connect(db_path: str | None = None):
    # An explicit path is always a SQLite file (tests use scratch DBs).
    # timeout=30: the API serves requests from a thread pool and several
    # can write at once; the 5s default turned a busy moment into a
    # "database is locked" error instead of waiting briefly.
    if db_path is not None:
        conn = sqlite3.connect(db_path, timeout=30)
        conn.executescript(SCHEMA)
        return conn
    url = postgres_url()
    if url:
        return _connect_postgres(url)
    conn = sqlite3.connect(str(DB_PATH), timeout=30)
    conn.executescript(SCHEMA)
    return conn

def save_company(conn, name, domain="", summary="", sources=None):
    conn.execute(
        "INSERT OR REPLACE INTO companies(name, domain, summary, sources, created_at) VALUES (?,?,?,?,?)",
        (name, domain, summary, json.dumps(sources or []), time.time()),
    )
    conn.commit()

def save_person(conn, company, name, title, email, verified, score, linkedin=""):
    conn.execute(
        "INSERT OR REPLACE INTO people(company, name, title, email, verified, score, linkedin, created_at) VALUES (?,?,?,?,?,?,?,?)",
        (company, name, title, email, 1 if verified else 0, score, linkedin, time.time()),
    )
    conn.commit()

def save_mail(conn, company, recipient, email, subject, body, status="draft", message_id=None):
    sql = (
        "INSERT INTO mails(company, recipient, email, subject, body, status, message_id, sent_at) VALUES (?,?,?,?,?,?,?,?)"
    )
    params = (company, recipient, email, subject, body, status, message_id, time.time() if status == "sent" else None)
    if getattr(conn, "is_postgres", False):
        # Postgres has no lastrowid; RETURNING id gives the same value.
        cur = conn.execute(sql + " RETURNING id", params)
    else:
        cur = conn.execute(sql, params)
    conn.commit()
    return cur.lastrowid

def record_learning(conn, kind, text, outcome):
    conn.execute(
        "INSERT INTO learnings(kind, text, outcome, created_at) VALUES (?,?,?,?)",
        (kind, text, outcome, time.time()),
    )
    conn.commit()

def best_hooks(conn, limit=5):
    """What worked before — hooks/subjects linked to a reply. Self-improvement."""
    rows = conn.execute(
        "SELECT text, outcome FROM learnings WHERE kind='hook' ORDER BY created_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    return [{"text": r[0], "outcome": r[1]} for r in rows]
