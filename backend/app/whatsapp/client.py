"""WhatsApp interface — FREE path only.
Default: Meta WhatsApp Cloud API (free tier, 1,000 service conversations/month
free as of 2024-25) via a FastAPI webhook.
Test path: Twilio WhatsApp Sandbox (free, no approval needed) — same webhook
shape, different sender. Both are documented in README; neither is required
to run the core demo — the CLI / dashboard work without WhatsApp at all.

Flow (human-in-the-loop stays):
  user: "research iion"        -> agent researches, replies with profile + people
  user: "draft mails"          -> agent replies with the drafts
  user: "YES" / "approve"      -> agent sends, one every 5 min, PDF attached
  user: "NO" / "edit"          -> agent asks what to change, re-drafts
  user: "status"               -> companies / mails / replies so far
  user: "replies"              -> reply classes + follow-ups due
  user: "help" / "start"       -> this menu

No paid service is required. Gemini is free-tier / mock fallback,
search is DuckDuckGo (free), Apollo is free credits, Gmail is free,
SQLite is free.
"""
import os

# --- Config (all from env, see .env.example) ---
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "sdr-agent-verify")
WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN", "")          # Cloud API permanent token
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_ID", "")    # Cloud API phone number id
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")  # sandbox number

def provider() -> str:
    """Which free path is configured? cloud > twilio > none (demo mode)."""
    if WHATSAPP_TOKEN and WHATSAPP_PHONE_ID:
        return "whatsapp-cloud"
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        return "twilio-sandbox"
    return "none"

def send_whatsapp(to: str, text: str) -> dict:
    """Send a WhatsApp message. In demo mode (no keys) it just returns the
    text that WOULD be sent, so the whole flow is testable for free."""
    p = provider()
    if p == "whatsapp-cloud":
        import requests
        r = requests.post(
            f"https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_ID}/messages",
            headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}"},
            json={"messaging_product": "whatsapp", "to": to,
                  "type": "text", "text": {"body": text}}, timeout=15)
        # Surface a bad token / rejected send instead of silently
        # reporting success while the user never got the reply.
        r.raise_for_status()
        return {"provider": p, "status": r.status_code, "response": r.text[:500]}
    if p == "twilio-sandbox":
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        m = client.messages.create(from_=TWILIO_WHATSAPP_FROM, to=f"whatsapp:{to}", body=text)
        return {"provider": p, "status": "sent", "sid": m.sid}
    # Demo / no-keys mode — free, testable, nothing sent.
    return {"provider": "none (demo mode — set WHATSAPP_TOKEN to send for real)",
            "status": "would-send", "to": to, "text": text}
