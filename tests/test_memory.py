"""Tests — save_mail idempotency (round 8).

The real sdr.db grew to 205 duplicate iion mails for a single subject:
every dry-run and every re-run of a campaign appended an identical row.
A re-save of the same non-sent mail must now return the existing row
instead of piling up; a real send stays append-only — each send is its
own event.
"""
from backend.app import memory as mem


def _mail(**over):
    m = {
        "company": "iion",
        "recipient": "Wout van Damme",
        "email": "wout@iion.io",
        "subject": "I build autonomous agents with LangGraph",
        "body": "Hi Wout,\n\nI build agents with LangGraph.",
        "status": "draft (dry-run)",
        "message_id": "dry-run-iion-0",
    }
    m.update(over)
    return m


def test_save_mail_dedupes_identical_dry_run(tmp_path):
    conn = mem.connect(str(tmp_path / "dedupe.db"))
    try:
        first = mem.save_mail(conn, **_mail())
        second = mem.save_mail(conn, **_mail(message_id="dry-run-iion-1"))
        assert first == second
        assert conn.execute("SELECT COUNT(*) FROM mails").fetchone()[0] == 1
    finally:
        conn.close()


def test_save_mail_keeps_different_status_or_body(tmp_path):
    conn = mem.connect(str(tmp_path / "dedupe2.db"))
    try:
        mem.save_mail(conn, **_mail())
        mem.save_mail(conn, **_mail(status="blocked: body is only 6 words (min 60) — too thin to send"))
        mem.save_mail(conn, **_mail(status="draft (dry-run)", body="Hi Wout,\n\nRewritten body."))
        assert conn.execute("SELECT COUNT(*) FROM mails").fetchone()[0] == 3
    finally:
        conn.close()


def test_save_mail_sent_stays_append_only(tmp_path):
    conn = mem.connect(str(tmp_path / "dedupe3.db"))
    try:
        mem.save_mail(conn, **_mail(status="sent", message_id="<id-1>"))
        mem.save_mail(conn, **_mail(status="sent", message_id="<id-2>"))
        assert conn.execute("SELECT COUNT(*) FROM mails").fetchone()[0] == 2
    finally:
        conn.close()
