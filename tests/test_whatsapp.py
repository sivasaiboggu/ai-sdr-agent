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


def test_whatsapp_replies_have_no_emoji_or_symbols():
    """Round 10: the bot used to prefix replies with emoji (🔍 👥 ✍️ ✅
    📊) and '→' arrows — the same decoration the copy guard bans in
    the dashboard. Every command's reply must be plain text."""
    import re
    from backend.app.whatsapp.webhook import handle_text as ht

    symbol_re = re.compile(
        r"[✨⭐🎉🚀💡🔥👉➜→←↑↓✓✔✗✘●○■◆►▶◀★☆]"
        r"|[\U0001F300-\U0001FAFF]"
        r"|[\u2600-\u27BF]"
    )
    handle_text("+919573719115", "research iion")
    replies = [
        ht("+919573719115", "help"),
        ht("+919573719115", "research iion"),
        ht("+919573719115", "draft mails"),
        ht("+919573719115", "status"),
        ht("+919573719115", "replies"),
        ht("+919573719115", "blabla"),
        ht("+919573719115", "NO"),
    ]
    for reply in replies:
        assert not symbol_re.search(reply), f"decorative symbol in {reply[:80]!r}"
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


def _cloud_body(message_id, text, sender=SENDER):
    return {"entry": [{"changes": [{"value": {"messages": [
        {"from": sender, "id": message_id, "text": {"body": text}}]}}]}]}


def test_webhook_redelivery_is_ignored(monkeypatch):
    """Meta/Twilio redeliver a webhook when the first attempt is slow.
    The same message id must be handled once — a redelivered 'research'
    must not re-run the campaign or send the reply twice."""
    import backend.app.whatsapp.webhook as wa_mod

    wa_mod._SEEN_MESSAGE_IDS.clear()
    calls = []
    monkeypatch.setattr(wa_mod, "send_whatsapp",
                        lambda to, text: calls.append((to, text)))
    body = _cloud_body("wamid.dedupe-1", "help")
    r1 = client.post("/whatsapp/webhook", json=body)
    r2 = client.post("/whatsapp/webhook", json=body)
    assert r1.status_code == 200 and r1.json()["status"] == "ok"
    assert r2.status_code == 200 and r2.json()["status"] == "duplicate"
    assert len(calls) == 1


def test_webhook_without_id_is_always_processed(monkeypatch):
    """A message with no id can't be deduped — it must still be handled
    (twice, if delivered twice), never silently dropped."""
    import backend.app.whatsapp.webhook as wa_mod

    wa_mod._SEEN_MESSAGE_IDS.clear()
    calls = []
    monkeypatch.setattr(wa_mod, "send_whatsapp",
                        lambda to, text: calls.append((to, text)))
    body = _cloud_body(None, "help")
    assert client.post("/whatsapp/webhook", json=body).json()["status"] == "ok"
    assert client.post("/whatsapp/webhook", json=body).json()["status"] == "ok"
    assert len(calls) == 2
