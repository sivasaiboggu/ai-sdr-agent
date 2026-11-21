"""Tests — WhatsApp handler (free / no-keys mode)."""
from fastapi.testclient import TestClient

from backend.app.api import app
from backend.app.whatsapp.client import WHATSAPP_VERIFY_TOKEN
from backend.app.whatsapp.webhook import handle_text

client = TestClient(app, raise_server_exceptions=False)
SENDER = "+919573719115"


def test_webhook_verify_returns_raw_challenge():
    """Meta compares the response body to the challenge string, so it
    must come back as plain text, not a JSON number."""
    r = client.get("/whatsapp/webhook", params={
        "hub.mode": "subscribe",
        "hub.verify_token": WHATSAPP_VERIFY_TOKEN,
        "hub.challenge": "123456",
    })
    assert r.status_code == 200
    assert r.text == "123456"


def test_webhook_verify_wrong_token_is_403():
    """Regression: the old handler returned a (body, 403) tuple, which
    FastAPI serialises as a JSON array with status 200 — a failed
    verification looked successful."""
    r = client.get("/whatsapp/webhook", params={
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong-token",
        "hub.challenge": "123456",
    })
    assert r.status_code == 403


def test_whatsapp_yes_dry_run_says_so(monkeypatch, tmp_path):
    """YES with Gmail sending off must say it was a dry-run — the old
    reply claimed the mails were going out while nothing was sent."""
    from backend.app import memory as mem

    monkeypatch.setattr(mem, "DB_PATH", str(tmp_path / "wa-dry.db"))
    monkeypatch.setattr("backend.app.config.settings.gmail_send_enabled", False)
    handle_text("+919573719116", "research iion")
    reply = handle_text("+919573719116", "YES")
    assert "dry-run" in reply.lower()
    assert "nothing was really sent" in reply.lower()


def test_whatsapp_yes_sends_when_gmail_enabled(monkeypatch, tmp_path):
    """Regression: YES used to pass dry_run=True unconditionally, so
    WhatsApp approval could never actually send, even with Gmail on."""
    from backend.app import memory as mem

    monkeypatch.setattr(mem, "DB_PATH", str(tmp_path / "wa-live.db"))
    monkeypatch.setattr("backend.app.config.settings.gmail_send_enabled", True)
    monkeypatch.setattr("backend.app.config.settings.send_gap_seconds", 0)
    monkeypatch.setattr("backend.app.gmail.send_mail",
                        lambda *a, **k: "<test-id@sdr-agent.local>")
    handle_text("+919573719117", "research iion")
    reply = handle_text("+919573719117", "YES")
    assert "sending" in reply.lower()
    assert "dry-run" not in reply.lower()
    assert ": sent" in reply

def test_whatsapp_help():
    assert "research" in handle_text("+919573719115", "help").lower()

def test_whatsapp_research_iion():
    reply = handle_text("+919573719115", "research iion")
    assert "iion" in reply.lower()
    assert "draft" in reply.lower()

def test_whatsapp_drafts_then_no():
    handle_text("+919573719115", "research iion")
    drafts = handle_text("+919573719115", "draft mails")
    assert "Subject:" in drafts
    assert "nothing sent" in handle_text("+919573719115", "NO").lower()

def test_whatsapp_unknown():
    assert "help" in handle_text("+919573719115", "blabla").lower()
