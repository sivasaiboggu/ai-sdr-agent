"""FastAPI — chat-first API + SSE live progress.
POST /chat {"message": "Research iion and draft mails"} -> runs the graph,
returns profile / people / drafts, and waits for approval before sending.
POST /chat/stream -> same run, but Server-Sent Events: `step` events as the
pipeline advances, then the reply streamed word by word, then `done` with
the drafts. The dashboard uses it for the live typing effect in Agent chat.
POST /approve {"company": "...", "approve": true} -> sends the drafts.
GET  /campaigns -> saved companies / people / mails from memory.

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

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, PositiveInt

from backend.app.config import settings
from backend.app.boards import DO_NOT_MAIL, get_boards
from backend.app.graph import run_campaign, stage_listener
from backend.app import memory as mem
from backend.app.agents import sender
from backend.app.quality import check_draft
from backend.app.whatsapp import webhook as wa

APP_VERSION = "0.9.7"

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


class ReplyRequest(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=3, max_length=200)
    text: str = Field(min_length=1, max_length=10000)
    from_name: str = Field(default="", max_length=200)
    hook: str = Field(default="", max_length=2000)


class ApproveRequest(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    approve: bool = True
    draft_ids: list[PositiveInt] | None = Field(default=None, min_length=1)


class DraftEditRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=10000)


@router.post("/replies")
def log_reply(req: ReplyRequest):
    """Log a reply to a sent mail: classify it, persist the class on the
    sent mail row, and return the class + follow-up timing. Replies used
    to be classified in memory only and dropped — the dashboard's reply
    counts and breakdown never moved. `recorded` is False when no sent
    mail matches (company, email), so a reply to an address never mailed
    is reported honestly instead of inventing a row."""
    from backend.app.agents.tracker import classify_reply, follow_up_due_days
    cls = classify_reply(req.text)
    recorded = False
    try:
        conn = mem.connect()
        try:
            recorded = mem.record_reply(conn, req.company, req.email, cls)
            if cls == "interested" and req.hook.strip():
                mem.record_learning(conn, "hook", req.hook.strip(), "interested reply")
        finally:
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not record reply: {e}")
    return {"class": cls, "follow_up_in_days": follow_up_due_days(cls), "recorded": recorded}


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
        # Boolean only — the app password itself never leaves the server.
        "gmail_configured": bool(settings.gmail_app_password),
        "gemini_configured": settings.has_gemini,
        "apollo_configured": settings.has_apollo,
    }


def _parse_company(message: str) -> str | None:
    """Plain-language parsing: 'research <company>' / 'draft mails for <company>'.
    The company name itself is returned clean: the chat suggestion chips
    read 'Research iion and draft mails', and the old parser returned the
    whole tail — 'iion and draft mails' — as the company, which the people
    agent then saved verbatim (see graph.run_campaign, which now also
    normalises). Trailing action phrases are stripped as suffixes, so a
    real 'and' inside a company name ('Smith and Co') survives."""
    msg = message.lower()
    for token in ["research ", "draft mails for ", "find leads at ", "mail founders of "]:
        if token in msg:
            idx = msg.find(token)
            company = message[idx + len(token):].strip()
            low = company.lower()
            for suffix in [" and draft mails", " and draft mail", " and send mails",
                           " and send mail", " and send", " and mail them",
                           " and email them", " and approve", " please"]:
                if low.endswith(suffix):
                    company = company[: -len(suffix)].strip()
                    low = company.lower()
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
        loop = asyncio.get_running_loop()
        events: asyncio.Queue[tuple[str, str] | None] = asyncio.Queue()

        def run():
            token = stage_listener.set(lambda key, state: loop.call_soon_threadsafe(events.put_nowait, (key, state)))
            try:
                return run_campaign(company, False)
            finally:
                stage_listener.reset(token)
                loop.call_soon_threadsafe(events.put_nowait, None)

        yield _sse("step", {"key": "research", "state": "start"})
        task = asyncio.create_task(asyncio.to_thread(run))
        reported = set()
        try:
            while True:
                try:
                    event = await asyncio.wait_for(events.get(), 15)
                except TimeoutError:
                    yield ": waiting for the agent\n\n"
                    continue
                if event is None:
                    break
                key, state = event
                if event != ("research", "start"):
                    reported.add(event)
                    yield _sse("step", {"key": key, "state": state})
            result = await task
        except ValueError as exc:
            yield _sse("error", {"detail": str(exc)})
            return
        except Exception as exc:
            yield _sse("error", {"detail": f"Agent run failed: {exc}"})
            return
        for key in ("research", "people", "writer", "approval"):
            if (key, "done") not in reported:
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


@router.post("/drafts/{draft_id}")
def edit_draft(draft_id: int, req: DraftEditRequest):
    conn = mem.connect()
    try:
        old = conn.execute(
            "SELECT company, recipient, email, subject, body FROM mails WHERE id = ?", (draft_id,),
        ).fetchone()
        if not old:
            raise HTTPException(status_code=404, detail="Draft not found.")
        company, recipient, email, subject, body = old
        pending = next((row for row in mem.pending_drafts(conn, company) if row[0] == draft_id), None)
        if pending is None:
            raise HTTPException(status_code=409, detail="This draft changed. Reopen it before editing.")
        changes = {"subject": req.subject.strip(), "body": req.body.strip()}
        issues = check_draft({**changes, "to": email}, person={"name": recipient})
        if issues:
            raise HTTPException(status_code=400, detail="; ".join(issues))
        if (subject, body) == (changes["subject"], changes["body"]):
            return {"id": draft_id}
        updated = conn.execute(
            f"UPDATE mails SET status = 'superseded' WHERE id = ? AND {mem.PENDING_MAIL}", (draft_id,),
        )
        if not updated.rowcount:
            raise HTTPException(status_code=409, detail="This draft changed. Reopen it before editing.")
        status = pending[5] if pending[5].startswith("failed: ") else "draft"
        new_id = mem.save_mail(conn, company, recipient, email, changes["subject"], changes["body"], status)
        conn.commit()
        return {"id": new_id}
    finally:
        conn.close()


@router.post("/approve")
def approve(req: ApproveRequest):
    if not req.approve:
        return {"sent": [], "company": req.company, "detail": "Not approved."}

    company = req.company.strip()
    conn = mem.connect()
    try:
        sent_count = conn.execute(
            "SELECT COUNT(*) FROM mails WHERE lower(company) = lower(?) AND status = 'sent'", (company,),
        ).fetchone()[0]
        active = conn.execute(
            "SELECT 1 FROM mails WHERE lower(company) = lower(?) AND status = 'sending' LIMIT 1", (company,),
        ).fetchone()
        if active:
            raise HTTPException(status_code=409, detail="An approval is still in progress for this company.")
        rows = mem.pending_drafts(conn, company)
        if sent_count and (req.draft_ids is None or any(not row[5].startswith("failed: ") for row in rows)):
            raise HTTPException(status_code=409, detail=f"Already sent {sent_count} mail(s) to {company}. Check the reply log before contacting them again.")
        ids = [row[0] for row in rows]
        if req.draft_ids is not None and sorted(ids) != sorted(req.draft_ids):
            raise HTTPException(status_code=409, detail="The review queue changed. Check the current drafts before approving.")
        if ids:
            placeholders = ", ".join("?" for _ in ids)
            claimed = conn.execute(
                f"UPDATE mails SET status = 'sending' WHERE id IN ({placeholders}) AND {mem.PENDING_MAIL}", ids,
            )
            if claimed.rowcount != len(ids):
                conn.rollback()
                raise HTTPException(status_code=409, detail="The review queue changed. Check the current drafts before approving.")
            conn.commit()
    finally:
        conn.close()

    if ids:
        drafts = [
            {"approval_id": draft_id, "name": recipient, "to": email, "subject": subject, "body": body}
            for draft_id, recipient, email, subject, body, _ in rows
        ]
        return {"sent": sender.send_drafts({"company": company, "drafts": drafts}, dry_run=False)["sent"], "company": company}

    # Older clients can still run the dry-run workflow on an empty queue.
    if settings.gmail_send_enabled:
        raise HTTPException(status_code=404, detail="No saved drafts. Research and review the company first.")
    try:
        result = run_campaign(company, approve=True, dry_run=False)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Agent run failed: {exc}")
    if not result.get("drafts"):
        raise HTTPException(status_code=404, detail=f"No drafts found for {company!r}.")
    return {"sent": result.get("sent", []), "company": company}


@router.get("/boards")
def boards():
    """The job boards the agent researches companies from. Never Internshala."""
    return {"boards": get_boards()}


@router.get("/coverage")
def coverage():
    """Companies already covered by this agent: researched, mailed, or sent.
    The dashboard uses this to dedupe — a covered company is never
    re-mailed or re-applied to without the user explicitly choosing to.
    `do_not_mail` lists addresses that bounced before and must never be used."""
    try:
        conn = mem.connect()
        try:
            companies = conn.execute("SELECT name, summary FROM companies").fetchall()
            mails = conn.execute(
                "SELECT MIN(company), COUNT(*), SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END), MAX(sent_at) "
                "FROM mails WHERE status <> 'superseded' GROUP BY lower(company)"
            ).fetchall()
            bounced = mem.bounced_addresses(conn)
        finally:
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not read coverage: {e}")
    mail_map = {m[0].lower(): {"mails": m[1], "sent": m[2] or 0, "last_sent_at": m[3]} for m in mails}
    out = []
    for name, summary in companies:
        entry = {"name": name, "summary": summary or "", "mails": 0, "sent": 0, "last_sent_at": None}
        entry.update(mail_map.get(name.lower(), {}))
        entry["status"] = "sent" if entry["sent"] else ("mailed" if entry["mails"] else "researched")
        out.append(entry)
    # Companies with mails but no companies-row (e.g. seeded memory) still count.
    known = {c["name"].lower() for c in out}
    for company, *_ in mails:
        if company.lower() not in known:
            counts = mail_map[company.lower()]
            out.append({"name": company, "summary": "", "mails": counts["mails"],
                        "sent": counts["sent"], "last_sent_at": counts["last_sent_at"],
                        "status": "sent" if counts["sent"] else "mailed"})
    blocked = {entry["email"].lower(): entry["reason"] for entry in DO_NOT_MAIL}
    for email in sorted(bounced):
        blocked.setdefault(email, "The reply tracker recorded a delivery bounce.")
    return {"companies": sorted(out, key=lambda c: c["name"].lower()),
            "do_not_mail": [{"email": email, "reason": reason} for email, reason in blocked.items()]}


@router.get("/campaigns")
def campaigns():
    try:
        conn = mem.connect()
        try:
            companies = conn.execute("SELECT name, summary FROM companies").fetchall()
            mails = conn.execute(
                "SELECT company, recipient, email, subject, body, status, reply_class, sent_at, replied_at, id "
                "FROM mails AS candidate WHERE status NOT IN ('superseded', 'sending') AND "
                f"(NOT {mem.PENDING_MAIL} OR id = (SELECT MAX(id) FROM mails "
                "WHERE lower(company) = lower(candidate.company) AND lower(email) = lower(candidate.email) "
                "AND status NOT IN ('superseded', 'draft (dry-run)'))) ORDER BY id DESC"
            ).fetchall()
        finally:
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not read campaign memory: {e}")
    return {"companies": [{"name": c[0], "summary": c[1]} for c in companies],
            "mails": [{"company": m[0], "recipient": m[1], "email": m[2], "subject": m[3], "body": m[4], "status": m[5],
                       "reply_class": m[6], "sent_at": m[7], "replied_at": m[8], "id": m[9]} for m in mails]}


@router.get("/people")
def people():
    """Every person the agent found, verified and unverified — the Leads
    page renders this live instead of its seeded list when the backend
    answers. Read-only; nothing here is mailed (only verified people
    with an email are mailable, see /campaigns)."""
    try:
        conn = mem.connect()
        try:
            rows = conn.execute(
                "SELECT company, name, title, email, verified, score, linkedin "
                "FROM people ORDER BY company, score DESC"
            ).fetchall()
        finally:
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not read people: {e}")
    return {"people": [{"company": r[0], "name": r[1], "title": r[2], "email": r[3] or "",
                        "verified": bool(r[4]), "score": r[5], "linkedin": r[6]} for r in rows]}


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
