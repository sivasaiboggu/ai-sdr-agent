"""Tests — real Gmail sending (mocked SMTP): the backend sends itself
when GMAIL_SEND_ENABLED=true, never claims a send it did not make, and
blocked drafts never reach SMTP."""
from unittest.mock import MagicMock, patch

import pytest

from backend.app import gmail as gmail_mod
from backend.app.agents.sender import send_drafts

GOOD = {
    "name": "Sanjaya Molligoda",
    "to": "sanjaya@iion.io",
    "subject": "I build autonomous agents with LangGraph — applying for iion's Agentic Workflows intern role",
    "body": (
        "Hi Sanjaya,\n\nI looked at immersiion, your self-serve ad platform for "
        "gaming — in week one I'd prototype an agent that drafts campaign setup "
        "from a brief and runs it in shadow mode, with a human approving before "
        "anything goes live.\n\nAt Whispry I build MERN apps and REST APIs, and "
        "I built HireMind AI, a React and TypeScript resume analysis app using "
        "Gemini. I also built an AI SDR agent with LangGraph that researches a "
        "company, finds verified people and drafts personalised cold mails.\n\n"
        "Could we talk for 15 minutes this week?\n\nBest,\nSivasai Boggu, "
        "BTech Computer Science, IIIT Kottayam (2023-2027), CGPA 7.73"
    ),
}


def _mock_smtp(monkeypatch):
    server = MagicMock()
    server.__enter__.return_value = server
    server.__exit__.return_value = False
    smtp_cls = MagicMock(return_value=server)
    monkeypatch.setattr("backend.app.gmail.smtplib.SMTP_SSL", smtp_cls)
    return server


def test_send_mail_uses_smtp_and_attaches_resume(monkeypatch, tmp_path):
    monkeypatch.setattr("backend.app.config.settings.gmail_app_password", "app-pass-123")
    resume = tmp_path / "resume.pdf"
    resume.write_bytes(b"%PDF-fake")
    server = _mock_smtp(monkeypatch)
    mid = gmail_mod.send_mail("sanjaya@iion.io", "Subject", "Body", attachments=[str(resume)])
    assert mid.startswith("<") and mid.endswith(">")
    server.login.assert_called_once_with("sivasaiboggu@gmail.com", "app-pass-123")
    sent_msg = server.send_message.call_args[0][0]
    assert sent_msg["To"] == "sanjaya@iion.io"
    assert sent_msg["Subject"] == "Subject"
    assert any(part.get_filename() == "resume.pdf" for part in sent_msg.iter_attachments())


def test_send_mail_without_app_password_sends_nothing(monkeypatch):
    monkeypatch.setattr("backend.app.config.settings.gmail_app_password", "")
    server = _mock_smtp(monkeypatch)
    with pytest.raises(gmail_mod.GmailNotConfiguredError):
        gmail_mod.send_mail("sanjaya@iion.io", "Subject", "Body")
    server.login.assert_not_called()
    server.send_message.assert_not_called()


def test_sender_flag_off_never_sends_even_when_asked(monkeypatch):
    """POST /approve passes dry_run=False; with GMAIL_SEND_ENABLED=false
    that must still be a dry-run, never a real send attempt."""
    monkeypatch.setattr("backend.app.config.settings.send_gap_seconds", 0)
    monkeypatch.setattr("backend.app.config.settings.gmail_send_enabled", False)
    monkeypatch.setattr("backend.app.config.settings.gmail_app_password", "app-pass-123")
    server = _mock_smtp(monkeypatch)
    result = send_drafts({"company": "iion", "drafts": [GOOD]}, dry_run=False)
    assert result["sent"][0]["status"] == "draft (dry-run)"
    server.send_message.assert_not_called()


def test_sender_real_send_records_sent(monkeypatch, tmp_path):
    # Isolated memory: the real sdr.db already holds a sent mail to this
    # address from Nov 2026, and the sender's duplicate guard (rightly)
    # blocks re-mailing it — this test is about the send path, so it
    # runs against an empty database instead of the real one.
    monkeypatch.setattr("backend.app.memory.DB_PATH", str(tmp_path / "gmail-sent.db"))
    monkeypatch.setattr("backend.app.config.settings.send_gap_seconds", 0)
    monkeypatch.setattr("backend.app.config.settings.gmail_send_enabled", True)
    monkeypatch.setattr("backend.app.config.settings.gmail_app_password", "app-pass-123")
    monkeypatch.setattr("backend.app.config.settings.resume_path", str(tmp_path / "missing.pdf"))
    _mock_smtp(monkeypatch)
    result = send_drafts({"company": "iion", "drafts": [GOOD]}, dry_run=False)
    assert result["sent"][0]["status"] == "sent"
    assert result["sent"][0]["message_id"]


def test_sender_smtp_failure_is_logged_not_claimed(monkeypatch, tmp_path):
    # Isolated memory — see test_sender_real_send_records_sent: the real
    # sdr.db already holds a sent mail to this address.
    monkeypatch.setattr("backend.app.memory.DB_PATH", str(tmp_path / "gmail-fail.db"))
    monkeypatch.setattr("backend.app.config.settings.send_gap_seconds", 0)
    monkeypatch.setattr("backend.app.config.settings.gmail_send_enabled", True)
    monkeypatch.setattr("backend.app.config.settings.gmail_app_password", "app-pass-123")
    server = _mock_smtp(monkeypatch)
    server.send_message.side_effect = RuntimeError("SMTP refused")
    result = send_drafts({"company": "iion", "drafts": [GOOD]}, dry_run=False)
    assert result["sent"][0]["status"].startswith("failed:")
    assert result["sent"][0]["message_id"] is None


def test_sender_blocked_draft_never_reaches_smtp(monkeypatch, tmp_path):
    # Isolated memory — see test_sender_real_send_records_sent.
    monkeypatch.setattr("backend.app.memory.DB_PATH", str(tmp_path / "gmail-blocked.db"))
    monkeypatch.setattr("backend.app.config.settings.send_gap_seconds", 0)
    monkeypatch.setattr("backend.app.config.settings.gmail_send_enabled", True)
    monkeypatch.setattr("backend.app.config.settings.gmail_app_password", "app-pass-123")
    server = _mock_smtp(monkeypatch)
    bad = {**GOOD, "body": "Hi [name], see [company] for details."}
    result = send_drafts({"company": "iion", "drafts": [bad, GOOD]}, dry_run=False)
    assert result["sent"][0]["status"].startswith("blocked:")
    assert result["sent"][1]["status"] == "sent"
    assert server.send_message.call_count == 1
