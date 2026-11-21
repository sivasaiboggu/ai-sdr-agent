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
    try:
        for i, d in enumerate(state.get("drafts") or []):
            issues = check_draft(d)
            if issues:
                status = "blocked: " + "; ".join(issues)
                mem.save_mail(conn, state["company"], d.get("name", ""), d.get("to", ""),
                              d.get("subject", ""), d.get("body", ""), status, None)
                sent.append({**d, "status": status, "message_id": None})
                continue
            if dry:
                mid = f"dry-run-{state['company']}-{i}"
                status = "draft (dry-run)"
            else:
                # Duplicate-send guard at the send boundary: /approve
                # checks for already-sent mails before the graph runs,
                # but two approves in flight (or the same person twice
                # in one batch) can both pass that check. Re-check here,
                # on the same connection that records the send, so a
                # second attempt to the same address is blocked, never
                # mailed twice.
                already = conn.execute(
                    "SELECT COUNT(*) FROM mails WHERE lower(company) = lower(?) "
                    "AND lower(email) = lower(?) AND status = 'sent'",
                    (state["company"], d["to"]),
                ).fetchone()
                if already and already[0]:
                    status = "already sent (duplicate blocked)"
                    mem.save_mail(conn, state["company"], d.get("name", ""), d.get("to", ""), d.get("subject", ""), d.get("body", ""), status, None)
                    sent.append({**d, "status": status, "message_id": None})
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
            mem.save_mail(conn, state["company"], d.get("name", ""), d.get("to", ""), d.get("subject", ""), d.get("body", ""), status, mid)
            sent.append({**d, "status": status, "message_id": mid})
    finally:
        conn.close()
    return {**state, "sent": sent}
