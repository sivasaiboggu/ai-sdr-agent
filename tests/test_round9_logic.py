"""Round 9 — logic fixes: unresearched companies, persisted replies.

- A company with no verified information must not get a drafted mail
  (the Writer used to invent "the open AI role" for it).
- A classified reply must be written back onto the sent mail row, or
  the dashboard's reply counts and breakdown stay at zero forever.
- "On leave, let's schedule a call" is a live lead, not out-of-office.
"""
import pytest
from fastapi.testclient import TestClient

from backend.app import memory as mem
from backend.app.agents import tracker, writer
from backend.app.tools import search as search_mod


def test_search_marks_unknown_company_unresearched(monkeypatch):
    monkeypatch.setattr(search_mod, "_live_search", lambda q: [])
    profile = search_mod.search_company("Some Random Startup XYZ")
    assert profile["researched"] is False
    assert profile["sources"] == []
    assert profile["role"] == ""


def test_search_marks_known_company_researched(monkeypatch):
    monkeypatch.setattr(search_mod, "_live_search", lambda q: [])
    profile = search_mod.search_company("iion")
    assert profile["researched"] is True
    assert profile["sources"]


def test_writer_refuses_unresearched_company():
    profile = {"name": "Some Random Startup XYZ", "role": "", "summary": "No verified public information found.",
               "sources": [], "researched": False}
    person = {"name": "Jane Doe", "title": "Founder", "email": "jane@example.com"}
    with pytest.raises(ValueError, match="Could not research"):
        writer.draft_mail("Some Random Startup XYZ", person, profile)


def test_writer_role_phrase_without_role():
    """No role on file must read as 'a role at X', never invent one."""
    profile = {"name": "Acme Corp", "role": "", "summary": "Found web results.",
               "sources": ["https://acme.example"], "researched": True}
    person = {"name": "Jane Doe", "title": "Founder", "email": "jane@acme.example"}
    mail = writer.draft_mail("Acme Corp", person, profile)
    assert "the open AI role" not in mail["body"]
    assert "a role at Acme Corp" in mail["body"]


def test_tracker_leave_but_talk_is_interested():
    assert tracker.classify_reply("I'm on leave next week, let's schedule a call") == "interested"
    assert tracker.classify_reply("Out of office until Monday") == "out of office"


def _seed_sent_mail(conn, company="iion", email="wout@iion.io", subject="S1", body="B1"):
    return mem.save_mail(conn, company, "Wout van Damme", email, subject, body, "sent", "<id-1>")


def test_record_reply_updates_latest_sent_mail():
    conn = mem.connect()
    try:
        first = _seed_sent_mail(conn, subject="First")
        second = _seed_sent_mail(conn, subject="Second")
        assert mem.record_reply(conn, "iion", "wout@iion.io", "interested") is True
        rows = conn.execute(
            "SELECT id, reply_class, replied_at FROM mails WHERE email = 'wout@iion.io' ORDER BY id").fetchall()
    finally:
        conn.close()
    assert rows[0][:2] == (first, None)
    assert rows[0][2] is None
    assert rows[1][:2] == (second, "interested")
    # The reply carries its own timestamp, so the activity chart can
    # bucket it on the day it arrived, not the day the mail was sent.
    assert rows[1][2] is not None and rows[1][2] > 0


def test_replied_at_column_migrates_onto_old_databases():
    """A database created before replied_at existed still works:
    connect() adds the column and record_reply writes to it."""
    import sqlite3
    import tempfile
    import os
    path = os.path.join(tempfile.mkdtemp(), "old.db")
    old = sqlite3.connect(path)
    old.executescript(
        "CREATE TABLE mails (id INTEGER PRIMARY KEY, company TEXT, recipient TEXT, "
        "email TEXT, subject TEXT, body TEXT, status TEXT, message_id TEXT, "
        "sent_at REAL, reply_class TEXT);"
    )
    old.execute(
        "INSERT INTO mails (company, recipient, email, subject, body, status, sent_at) "
        "VALUES ('iion', 'Wout', 'wout@iion.io', 'S', 'B', 'sent', 1000)")
    old.commit()
    old.close()
    conn = mem.connect(db_path=path)
    try:
        assert mem.record_reply(conn, "iion", "wout@iion.io", "bounce") is True
        row = conn.execute(
            "SELECT reply_class, replied_at FROM mails WHERE email = 'wout@iion.io'").fetchone()
    finally:
        conn.close()
    assert row[0] == "bounce"
    assert row[1] is not None and row[1] > 0


def test_record_reply_false_without_sent_mail():
    conn = mem.connect()
    try:
        assert mem.record_reply(conn, "iion", "nobody@iion.io", "interested") is False
    finally:
        conn.close()


def test_tracker_run_persists_reply_class():
    conn = mem.connect()
    try:
        _seed_sent_mail(conn)
    finally:
        conn.close()
    result = tracker.run({"company": "iion", "replies": [
        {"from": "Wout van Damme", "company": "iion", "email": "wout@iion.io",
         "text": "Let's schedule a call this week"},
    ]})
    assert result["reply_classes"][0]["class"] == "interested"
    assert result["reply_classes"][0]["recorded"] is True
    conn = mem.connect()
    try:
        row = conn.execute("SELECT reply_class FROM mails WHERE email = 'wout@iion.io'").fetchone()
    finally:
        conn.close()
    assert row == ("interested",)


def test_replies_endpoint_classifies_and_persists():
    from backend.app.api import app
    conn = mem.connect()
    try:
        _seed_sent_mail(conn)
    finally:
        conn.close()
    client = TestClient(app)
    r = client.post("/api/replies", json={
        "company": "iion", "email": "wout@iion.io",
        "text": "Sounds good — send your resume over", "from_name": "Wout van Damme",
    })
    assert r.status_code == 200, r.text
    assert r.json() == {"class": "interested", "follow_up_in_days": None, "recorded": True}
    conn = mem.connect()
    try:
        row = conn.execute("SELECT reply_class FROM mails WHERE email = 'wout@iion.io'").fetchone()
    finally:
        conn.close()
    assert row == ("interested",)


def test_replies_endpoint_honest_when_nothing_was_sent():
    from backend.app.api import app
    client = TestClient(app)
    r = client.post("/api/replies", json={
        "company": "iion", "email": "ghost@iion.io", "text": "Not interested, thanks",
    })
    assert r.status_code == 200, r.text
    assert r.json() == {"class": "not now", "follow_up_in_days": 4, "recorded": False}


def test_default_resume_path_resolves_to_a_real_file():
    """The old default was CWD-relative and broke every real send when
    uvicorn started from the project directory."""
    from backend.app.config import _default_resume_path
    import os
    path = _default_resume_path()
    assert os.path.isfile(path), f"default resume path does not exist: {path}"
    assert path.endswith("Sivasai_Boggu_Resume.pdf")
