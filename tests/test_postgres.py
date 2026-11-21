"""Tests — Postgres backend for memory.py (v0.9).

Translation tests run with no server. Live tests run only when
``SDR_TEST_POSTGRES_URL`` is set (e.g. a local Postgres), and are
skipped otherwise, so the default suite stays SQLite-only and fast.
"""
import os

import pytest

from backend.app import memory as mem

PG_URL = os.environ.get("SDR_TEST_POSTGRES_URL", "")


def test_translate_insert_or_replace_companies():
    sql = mem._translate_sql(
        "INSERT OR REPLACE INTO companies(name, domain, summary, sources, created_at) VALUES (?,?,?,?,?)"
    )
    assert sql.startswith("INSERT INTO companies (name, domain, summary, sources, created_at)")
    assert "ON CONFLICT (name) DO UPDATE SET" in sql
    assert "domain=EXCLUDED.domain" in sql
    assert "summary=EXCLUDED.summary" in sql
    assert sql.count("%s") == 5


def test_translate_insert_or_replace_people():
    sql = mem._translate_sql(
        "INSERT OR REPLACE INTO people(company, name, title, email, verified, score, linkedin, created_at) VALUES (?,?,?,?,?,?,?,?)"
    )
    assert "ON CONFLICT (company, email) DO UPDATE SET" in sql
    assert "name=EXCLUDED.name" in sql
    assert sql.count("%s") == 8


def test_translate_placeholders_and_plain_select():
    assert mem._translate_sql("SELECT * FROM mails WHERE lower(company) = lower(?) AND status = 'sent'") == (
        "SELECT * FROM mails WHERE lower(company) = lower(%s) AND status = 'sent'"
    )


def test_database_kind_follows_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@localhost:5432/db")
    assert mem.database_kind() == "postgres"
    assert mem.postgres_url().startswith("postgresql://")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./sdr.db")
    assert mem.database_kind() == "sqlite"
    assert mem.postgres_url() == ""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert mem.database_kind() == "sqlite"


@pytest.fixture()
def pg_conn(monkeypatch):
    if not PG_URL:
        pytest.skip("SDR_TEST_POSTGRES_URL not set — live Postgres test skipped")
    monkeypatch.setenv("DATABASE_URL", PG_URL)
    conn = mem.connect()
    assert getattr(conn, "is_postgres", False) is True
    # Clean slate for the round-trip (test DB only).
    conn.execute("DELETE FROM learnings")
    conn.execute("DELETE FROM mails")
    conn.execute("DELETE FROM people")
    conn.execute("DELETE FROM companies")
    conn.commit()
    yield conn
    conn.close()


def test_postgres_round_trip(pg_conn):
    conn = pg_conn
    mem.save_company(conn, "Acme", "acme.example", "First summary", ["https://acme.example"])
    mem.save_company(conn, "Acme", "acme.example", "Updated summary", ["https://acme.example"])
    rows = conn.execute("SELECT name, summary FROM companies").fetchall()
    assert rows == [("Acme", "Updated summary")]  # upsert, not a duplicate

    mem.save_person(conn, "Acme", "Ada Lovelace", "CTO", "ada@acme.example", True, 90, "")
    mem.save_person(conn, "Acme", "Ada Lovelace", "CEO", "ada@acme.example", True, 95, "")
    rows = conn.execute("SELECT title, score FROM people WHERE email=?", ("ada@acme.example",)).fetchall()
    assert rows == [("CEO", 95)]

    mail_id = mem.save_mail(conn, "Acme", "Ada Lovelace", "ada@acme.example",
                            "Hello", "Body text", status="sent", message_id="<abc>")
    assert isinstance(mail_id, int) and mail_id > 0
    # The re-mail guard query the /approve endpoint runs.
    already = conn.execute(
        "SELECT COUNT(*), MAX(sent_at) FROM mails WHERE lower(company) = lower(?) AND status = 'sent'",
        ("acme",),
    ).fetchone()
    assert already[0] == 1 and already[1] is not None

    mem.record_learning(conn, "hook", "Mentioned their hiring post", "replied")
    assert mem.best_hooks(conn) == [{"text": "Mentioned their hiring post", "outcome": "replied"}]

    # Coverage aggregation the dashboard runs.
    mails = conn.execute(
        "SELECT company, COUNT(*), SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END), MAX(sent_at) "
        "FROM mails GROUP BY company"
    ).fetchall()
    assert mails[0][0] == "Acme" and mails[0][1] == 1 and mails[0][2] == 1


def test_postgres_schema_is_idempotent(monkeypatch):
    if not PG_URL:
        pytest.skip("SDR_TEST_POSTGRES_URL not set — live Postgres test skipped")
    monkeypatch.setenv("DATABASE_URL", PG_URL)
    first = mem.connect()
    second = mem.connect()  # second connect re-runs CREATE TABLE IF NOT EXISTS
    assert getattr(first, "is_postgres", False) and getattr(second, "is_postgres", False)
    first.close()
    second.close()
