"""FastAPI — chat-first API + WebSocket live progress.
POST /chat {"message": "Research iion and draft mails"} -> runs the graph,
returns profile / people / drafts, and waits for approval before sending.
POST /approve {"company": "...", "approve": true} -> sends the drafts.
GET  /campaigns -> saved companies / people / mails from memory.
WS   /ws -> live agent progress events.

Safety: nothing is sent without approval, and a draft that fails the
quality gate is blocked by the sender instead of mailed.
"""
from fastapi import FastAPI, HTTPException, WebSocket, Request
from pydantic import BaseModel, Field
from backend.app.graph import run_campaign
from backend.app import memory as mem
from backend.app.whatsapp import webhook as wa

app = FastAPI(title="AI SDR Agent", version="0.3.0")

class WhatsAppTestRequest(BaseModel):
    from_number: str = Field(default="+919573719115", min_length=5, max_length=20)
    text: str = Field(default="help", min_length=1, max_length=2000)

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)

class ApproveRequest(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    approve: bool = True

@app.get("/health")
def health():
    return {"status": "ok", "agent": "ai-sdr-agent"}

def _parse_company(message: str) -> str | None:
    """Plain-language parsing: 'research <company>' / 'draft mails for <company>'."""
    msg = message.lower()
    for token in ["research ", "draft mails for ", "find leads at ", "mail founders of "]:
        if token in msg:
            idx = msg.find(token)
            company = message[idx + len(token):].strip()
            return company or None
    return None

@app.post("/chat")
def chat(req: ChatRequest):
    company = _parse_company(req.message)
    if not company:
        return {"reply": "Tell me a company to research, e.g. 'Research iion and draft mails'.", "drafts": []}
    try:
        # Draft only — do NOT send until /approve.
        result = run_campaign(company, approve=False)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Agent run failed: {e}")
    return {
        "reply": f"Researched {result['profile']['name']}: {result['profile']['summary']} Found {len(result['mailable'])} mailable people and drafted {len(result['drafts'])} mails. Approve to send with a 5-minute gap.",
        "company": result["profile"],
        "people": result["mailable"],
        "drafts": result["drafts"],
    }

@app.post("/approve")
def approve(req: ApproveRequest):
    if not req.approve:
        return {"sent": [], "company": req.company, "detail": "Not approved — nothing sent."}
    try:
        # Re-run the graph with approval; sender respects the 5-min gap.
        result = run_campaign(req.company, approve=True, dry_run=False)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Agent run failed: {e}")
    if not result.get("drafts"):
        raise HTTPException(status_code=404, detail=f"No drafts found for {req.company!r} — research it first, or no verified emails exist for it.")
    return {"sent": result.get("sent", []), "company": req.company}

@app.get("/campaigns")
def campaigns():
    try:
        conn = mem.connect()
        companies = conn.execute("SELECT name, summary FROM companies").fetchall()
        mails = conn.execute("SELECT company, recipient, email, subject, status FROM mails ORDER BY id DESC LIMIT 50").fetchall()
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not read campaign memory: {e}")
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
