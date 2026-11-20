"""FastAPI — chat-first API + WebSocket live progress.
POST /chat {"message": "Research iion and draft mails"} -> runs the graph,
returns profile / people / drafts, and waits for approval before sending.
POST /approve {"company": "...", "approve": true} -> sends the drafts.
GET  /campaigns -> saved companies / people / mails from memory.
WS   /ws -> live agent progress events.
"""
from fastapi import FastAPI, WebSocket, Request
from pydantic import BaseModel
from backend.app.graph import run_campaign
from backend.app import memory as mem
from backend.app.whatsapp import webhook as wa

app = FastAPI(title="AI SDR Agent", version="0.2.0")

class WhatsAppTestRequest(BaseModel):
    from_number: str = "+919573719115"
    text: str = "help"

class ChatRequest(BaseModel):
    message: str

class ApproveRequest(BaseModel):
    company: str
    approve: bool = True

@app.get("/health")
def health():
    return {"status": "ok", "agent": "ai-sdr-agent"}

@app.post("/chat")
def chat(req: ChatRequest):
    # Plain-language parsing, Phase 1: "research <company>" / "draft mails for <company>"
    msg = req.message.lower()
    company = None
    for token in ["research ", "draft mails for ", "find leads at ", "mail founders of "]:
        if token in msg:
            idx = msg.find(token)
            company = req.message[idx + len(token):].strip()
            break
    if not company:
        return {"reply": "Tell me a company to research, e.g. 'Research iion and draft mails'.", "drafts": []}
    # Draft only — do NOT send until /approve.
    result = run_campaign(company, approve=False)
    return {
        "reply": f"Researched {result['profile']['name']}: {result['profile']['summary']} Found {len(result['mailable'])} mailable people and drafted {len(result['drafts'])} mails. Approve to send with a 5-minute gap.",
        "company": result["profile"],
        "people": result["mailable"],
        "drafts": result["drafts"],
    }

@app.post("/approve")
def approve(req: ApproveRequest):
    # Re-run the graph with approval; sender respects the 5-min gap.
    result = run_campaign(req.company, approve=req.approve, dry_run=False)
    return {"sent": result.get("sent", []), "company": req.company}

@app.get("/campaigns")
def campaigns():
    conn = mem.connect()
    companies = conn.execute("SELECT name, summary FROM companies").fetchall()
    mails = conn.execute("SELECT company, recipient, email, subject, status FROM mails ORDER BY id DESC LIMIT 50").fetchall()
    conn.close()
    return {"companies": [{"name": c[0], "summary": c[1]} for c in companies],
            "mails": [{"company": m[0], "recipient": m[1], "email": m[2], "subject": m[3], "status": m[4]} for m in mails]}

@app.websocket("/ws")
async def ws(ws: WebSocket):
    await ws.accept()
    await ws.send_json({"event": "connected", "message": "AI SDR Agent live — send a chat message to start a campaign."})
    await ws.close()

# --- WhatsApp (free Cloud API / Twilio sandbox, see README) ---
@app.get("/whatsapp/webhook")
async def wa_verify(request: Request):
    return await wa.webhook_get(request)

@app.post("/whatsapp/webhook")
async def wa_incoming(request: Request):
    return await wa.webhook_post(request)

@app.post("/whatsapp/test")
def wa_test(req: WhatsAppTestRequest):
    """Free local test — no WhatsApp account needed. Returns the agent's reply."""
    return {"from": req.from_number, "reply": wa.handle_text(req.from_number, req.text)}
