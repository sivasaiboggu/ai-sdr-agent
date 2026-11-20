"""FastAPI — chat-first API + WebSocket live progress.
POST /chat {"message": "Research iion and draft mails"} -> runs the graph,
returns profile / people / drafts, and waits for approval before sending.
POST /chat/stream -> same run, but Server-Sent Events: `step` events as the
pipeline advances, then the reply streamed word by word, then `done` with
the drafts. The dashboard uses it for the live typing effect in Agent chat.
POST /approve {"company": "...", "approve": true} -> sends the drafts.
GET  /campaigns -> saved companies / people / mails from memory.
WS   /ws -> live agent progress events.

Every route is also served under `/api` (`/api/chat`, `/api/campaigns`,
...) — the dashboard calls `/api/*` (dev proxy and `VITE_API_URL` builds),
so the unprefixed-only routes used to 404 every dashboard call.

CORS: the deployed frontend (Vercel) is a different origin, so browsers
block cross-origin calls unless the backend allows it. Allowed origins
come from `CORS_ORIGINS` (see `backend/app/config.py`); local dev
(localhost:5173) is allowed by default.

Safety: nothing is sent without approval, and a draft that fails the
quality gate is blocked by the sender instead of mailed.
"""
import asyncio
import json

from fastapi import APIRouter, FastAPI, HTTPException, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.app.config import settings
from backend.app.graph import run_campaign
from backend.app import memory as mem
from backend.app.whatsapp import webhook as wa

APP_VERSION = "0.7.0"

app = FastAPI(title="AI SDR Agent", version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

router = APIRouter()


class WhatsAppTestRequest(BaseModel):
    from_number: str = Field(default="+919573719115", min_length=5, max_length=20)
    text: str = Field(default="help", min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class ApproveRequest(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    approve: bool = True


@router.get("/health")
def health():
    # No secrets here — only which optional integrations are configured,
    # so a deploy health check can tell a misconfigured backend apart
    # from a healthy one without leaking keys.
    return {
        "status": "ok",
        "agent": "ai-sdr-agent",
        "version": APP_VERSION,
        "database": settings.database_kind,
        "gmail_send_enabled": settings.gmail_send_enabled,
        "gemini_configured": settings.has_gemini,
        "apollo_configured": settings.has_apollo,
    }


def _parse_company(message: str) -> str | None:
    """Plain-language parsing: 'research <company>' / 'draft mails for <company>'."""
    msg = message.lower()
    for token in ["research ", "draft mails for ", "find leads at ", "mail founders of "]:
        if token in msg:
            idx = msg.find(token)
            company = message[idx + len(token):].strip()
            return company or None
    return None


@router.post("/chat")
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


def _sse(event: str, payload: dict) -> str:
    """One Server-Sent Events frame."""
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Streaming twin of /chat. Emits `step` events (research -> people ->
    writer -> approval) around the real run, then streams the reply word by
    word as `token` events, then a `done` event carrying the drafts. The
    run itself is synchronous, so it executes in a worker thread while the
    response streams. Nothing is sent — drafts only, same as /chat."""
    company = _parse_company(req.message)

    async def generate():
        if not company:
            yield _sse("done", {"reply": "Tell me a company to research, e.g. 'Research iion and draft mails'.", "drafts": []})
            return
        yield _sse("step", {"key": "research", "state": "start"})
        try:
            # Draft only — do NOT send until /approve.
            result = await asyncio.to_thread(run_campaign, company, False)
        except ValueError as e:
            yield _sse("error", {"detail": str(e)})
            return
        except Exception as e:
            yield _sse("error", {"detail": f"Agent run failed: {e}"})
            return
        for key in ("people", "writer", "approval"):
            yield _sse("step", {"key": key, "state": "done"})
        reply = (
            f"Researched {result['profile']['name']}: {result['profile']['summary']} "
            f"Found {len(result['mailable'])} mailable people and drafted {len(result['drafts'])} "
            "mails. Approve to send with a 5-minute gap."
        )
        # Stream the reply in small word chunks so the chat UI types it out.
        words = reply.split(" ")
        for i in range(0, len(words), 3):
            yield _sse("token", {"text": " ".join(words[i:i + 3]) + (" " if i + 3 < len(words) else "")})
            await asyncio.sleep(0.02)
        yield _sse("done", {"reply": reply, "company": result["profile"], "people": result["mailable"], "drafts": result["drafts"]})

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/approve")
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


@router.get("/campaigns")
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


@router.websocket("/ws")
async def ws(ws: WebSocket):
    await ws.accept()
    await ws.send_json({"event": "connected", "message": "AI SDR Agent live — send a chat message to start a campaign."})
    await ws.close()


# --- WhatsApp (free Cloud API / Twilio sandbox, see README) ---
@router.get("/whatsapp/webhook")
async def wa_verify(request: Request):
    return await wa.webhook_get(request)


@router.post("/whatsapp/webhook")
async def wa_incoming(request: Request):
    return await wa.webhook_post(request)


@router.post("/whatsapp/test")
def wa_test(req: WhatsAppTestRequest):
    """Free local test — no WhatsApp account needed. Returns the agent's reply."""
    return {"from": req.from_number, "reply": wa.handle_text(req.from_number, req.text)}


# Same routes with and without the /api prefix: the dashboard (and the
# README) use /api/*, direct curl/CLI users use the bare paths.
app.include_router(router)
app.include_router(router, prefix="/api")
