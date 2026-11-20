"""Tests — WhatsApp handler (free / no-keys mode)."""
from backend.app.whatsapp.webhook import handle_text

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
