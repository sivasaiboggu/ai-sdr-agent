"""Sender Agent — Gmail, 5-minute gap, PDF resume attached.
Dry-run by default (GMAIL_SEND_ENABLED=false): drafts are logged, nothing
is sent. With GMAIL_SEND_ENABLED=true the backend sends the mail itself
over Gmail SMTP (see backend/app/gmail.py) — that needs a Gmail app
password in .env (GMAIL_APP_PASSWORD). A failed send is logged as
"failed: ..." and the batch continues with the next draft; it never
crashes the run and never claims a mail went out when it did not.
"""
import os
import time
from backend.app.config import settings
from backend.app import gmail as gmail_mod
from backend.app.quality import check_draft
from backend.app import memory as mem
from backend.app.boards import DO_NOT_MAIL

def gap_seconds() -> int:
    return settings.send_gap_seconds

def _resume_attachment() -> list[str]:
    """The approved PDF resume, if it exists at the configured path."""
    path = settings.resume_path
    return [path] if path and os.path.isfile(path) else []

def send_drafts(state: dict, dry_run: bool | None = None) -> dict:
    """Send drafts in order, sleeping `gap_seconds` between sends.
    Returns the drafts with status + message id.
    A real send happens only when the caller asked for it (dry_run=False)
    AND GMAIL_SEND_ENABLED=true — otherwise this is a dry-run, even if
    the caller passed dry_run=False (e.g. POST /approve with sending
    still disabled). Last line of defence: a draft that fails the quality
    gate is BLOCKED here and never mailed, even if it somehow reached
    the sender.

    The 5-minute gap is measured between real sends, not between list
    positions: a blocked or failed draft in the middle used to reset the
    gap (the old code only slept when the immediately previous draft had
    status "sent"), so two real mails could go out back-to-back. The gap
    now tracks the last real send on a monotonic clock, and dry-runs
    never sleep — nothing actually leaves the server in a dry-run."""
    if dry_run is None:
        dry = not settings.gmail_send_enabled
    else:
        dry = dry_run or not settings.gmail_send_enabled
    conn = mem.connect()
    sent = []
    last_sent_at: float | None = None
    blocked_addresses = {entry["email"].lower() for entry in DO_NOT_MAIL}

    def record(draft, status, message_id=None):
        if draft.get("approval_id"):
            mem.finish_draft(conn, draft["approval_id"], status, message_id)
        else:
            mem.save_mail(conn, state["company"], draft.get("name", ""), draft.get("to", ""),
                          draft.get("subject", ""), draft.get("body", ""), status, message_id)
        sent.append({**draft, "status": status, "message_id": message_id})

    try:
        blocked_addresses.update(mem.bounced_addresses(conn))
        for i, d in enumerate(state.get("drafts") or []):
            issues = check_draft(d)
            if (d.get("to") or "").strip().lower() in blocked_addresses:
                issues.append("address is on the do-not-mail list")
            if issues:
                record(d, "blocked: " + "; ".join(issues))
                continue
            if dry:
                mid = f"dry-run-{state['company']}-{i}"
                status = "draft (dry-run)"
            else:
                identity = (state["company"].strip().lower(), d["to"].strip().lower())
                claim = conn.execute(
                    "INSERT INTO mail_delivery_claims(company, email) VALUES (?, ?) ON CONFLICT DO NOTHING",
                    identity,
                )
                conn.commit()
                if not claim.rowcount:
                    record(d, "failed: another delivery is in progress")
                    continue
                already = conn.execute(
                    "SELECT 1 FROM mails WHERE lower(company) = ? AND lower(email) = ? AND status = 'sent'",
                    identity,
                ).fetchone()
                if already:
                    record(d, "already sent (duplicate blocked)")
                    conn.execute("DELETE FROM mail_delivery_claims WHERE company = ? AND email = ?", identity)
                    conn.commit()
                    continue
                # Enforce the gap from the last real send, however many
                # blocked/failed drafts came between them.
                if last_sent_at is not None:
                    wait = gap_seconds() - (time.monotonic() - last_sent_at)
                    if wait > 0:
                        time.sleep(wait)
                try:
                    mid = gmail_mod.send_mail(
                        d["to"], d["subject"], d["body"],
                        attachments=_resume_attachment(),
                    )
                    status = "sent"
                    last_sent_at = time.monotonic()
                except Exception as exc:  # logged, batch continues
                    mid = None
                    status = f"failed: {exc}"
            record(d, status, mid)
            if not dry:
                conn.execute("DELETE FROM mail_delivery_claims WHERE company = ? AND email = ?", identity)
                conn.commit()
    finally:
        conn.close()
    return {**state, "sent": sent}
