"""WhatsApp webhook + conversation handler.
FastAPI routes:
  GET  /whatsapp/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
       -> Meta verification handshake.
  POST /whatsapp/webhook  -> incoming message (Cloud API or Twilio sandbox).
  POST /whatsapp/test     -> free local test: {"from": "+91...", "text": "research iion"}
       -> returns the agent's reply, no WhatsApp account needed.
"""
from fastapi import Request
from backend.app.graph import run_campaign
from backend.app import memory as mem
from backend.app.whatsapp.client import send_whatsapp, WHATSAPP_VERIFY_TOKEN

HELP = """👋 Hi, I'm your AI SDR Agent.

Try:
• research <company> — e.g. research iion
• draft mails — drafts for the last company
• YES — approve & send (5-min gap, PDF attached)
• NO — don't send, tell me what to change
• status — companies / mails so far
• replies — reply classes + follow-ups due
• help — this menu

I only mail verified emails, never guessed ones."""

# Per-sender pending state (in-memory for Phase 1; campaigns are in SQLite).
_PENDING: dict[str, dict] = {}

def handle_text(sender: str, text: str) -> str:
    msg = text.strip()
    low = msg.lower()

    if low in ("start", "hi", "hello", "help", "menu"):
        return HELP

    if low.startswith("research "):
        company = msg[len("research "):].strip()
        result = run_campaign(company, approve=False)
        _PENDING[sender] = {"company": company, "drafts": result["drafts"]}
        people = "\n".join(
            f"• {p['name']} — {p['title']} — {p['email']}"
            for p in result["mailable"]) or "No verified emails found."
        return (f"🔍 {result['profile']['name']}\n{result['profile']['summary']}\n\n"
                f"👥 People (verified only):\n{people}\n\n"
                f"✍️ {len(result['drafts'])} draft mails ready. Reply 'draft mails' to see them, or 'YES' to send.")

    if low in ("draft mails", "drafts", "show drafts"):
        pending = _PENDING.get(sender)
        if not pending or not pending["drafts"]:
            return "No drafts yet — first send 'research <company>'."
        out = []
        for d in pending["drafts"]:
            out.append(f"To: {d['name']} <{d['to']}>\nSubject: {d['subject']}\n{d['body']}")
        return "\n\n---\n\n".join(out) + "\n\nReply YES to send (5-min gap), or NO to change something."

    if low in ("yes", "approve", "send", "yes send"):
        pending = _PENDING.get(sender)
        if not pending:
            return "Nothing to send yet — first send 'research <company>'."
        from backend.app.agents import sender as sender_agent
        state = {"company": pending["company"], "drafts": pending["drafts"]}
        # Dry-run unless GMAIL_SEND_ENABLED=true; the reply tells the truth.
        sent = sender_agent.send_drafts(state, dry_run=True)
        _PENDING.pop(sender, None)
        lines = "\n".join(f"• {s['to']}: {s['status']}" for s in sent["sent"])
        return f"✅ Sending {len(sent['sent'])} mails, one every 5 minutes, PDF attached:\n{lines}"

    if low in ("no", "edit", "don't send"):
        _PENDING.pop(sender, None)
        return "OK — nothing sent. Tell me what to change (e.g. 'make the hook about their FP&A product') and I'll re-draft."

    if low == "status":
        conn = mem.connect()
        companies = conn.execute("SELECT name FROM companies").fetchall()
        mails = conn.execute("SELECT company, recipient, status FROM mails ORDER BY id DESC LIMIT 10").fetchall()
        conn.close()
        c = "\n".join(f"• {r[0]}" for r in companies) or "No companies yet."
        m = "\n".join(f"• {r[0]} → {r[1]}: {r[2]}" for r in mails) or "No mails yet."
        return f"📊 Status\nCompanies:\n{c}\n\nMails:\n{m}"

    if low == "replies":
        conn = mem.connect()
        rows = conn.execute("SELECT company, recipient, reply_class FROM mails WHERE reply_class IS NOT NULL").fetchall()
        conn.close()
        if not rows:
            return "No classified replies yet. I'll check replies and tell you when one comes in."
        return "\n".join(f"• {r[0]} → {r[1]}: {r[2]}" for r in rows)

    return ("I didn't understand that. Reply 'help' for the menu, or try "
            "'research iion'.")

async def webhook_get(request: Request):
    """Meta verification handshake."""
    q = request.query_params
    if q.get("hub.mode") == "subscribe" and q.get("hub.verify_token") == WHATSAPP_VERIFY_TOKEN:
        return int(q.get("hub.challenge", "0"))
    return {"error": "verification failed"}, 403

async def webhook_post(request: Request):
    """Incoming message — Cloud API shape, with Twilio sandbox shape handled too."""
    body = await request.json()
    # Cloud API: entry[0].changes[0].value.messages[0]
    try:
        msg = body["entry"][0]["changes"][0]["value"]["messages"][0]
        sender = msg["from"]
        text = msg["text"]["body"]
    except Exception:
        # Twilio sandbox posts form fields From / Body instead.
        form = await request.form()
        sender = str(form.get("From", "")).replace("whatsapp:", "")
        text = str(form.get("Body", ""))
        if not text:
            return {"status": "ignored"}
    reply = handle_text(sender, text)
    send_whatsapp(sender, reply)
    return {"status": "ok"}
