"""Memory — SQLite by default, Postgres if DATABASE_URL says so.
Stores companies, people, mails, replies and what worked, so the agent
remembers every campaign and learns which hooks / subjects got replies.
"""
import json
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

def connect(db_path: str | None = None):
    path = db_path or str(DB_PATH)
    conn = sqlite3.connect(path)
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
    cur = conn.execute(
        "INSERT INTO mails(company, recipient, email, subject, body, status, message_id, sent_at) VALUES (?,?,?,?,?,?,?,?)",
        (company, recipient, email, subject, body, status, message_id, time.time() if status == "sent" else None),
    )
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
