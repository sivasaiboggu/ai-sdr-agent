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
    the sender."""
    if dry_run is None:
        dry = not settings.gmail_send_enabled
    else:
        dry = dry_run or not settings.gmail_send_enabled
    conn = mem.connect()
    sent = []
    for i, d in enumerate(state.get("drafts") or []):
        issues = check_draft(d)
        if issues:
            status = "blocked: " + "; ".join(issues)
            mem.save_mail(conn, state["company"], d.get("name", ""), d.get("to", ""),
                          d.get("subject", ""), d.get("body", ""), status, None)
            sent.append({**d, "status": status, "message_id": None})
            continue
        if i > 0 and sent and sent[-1]["status"].startswith("sent"):
            time.sleep(gap_seconds())
        if dry:
            mid = f"dry-run-{state['company']}-{i}"
            status = "draft (dry-run)"
        else:
            try:
                mid = gmail_mod.send_mail(
                    d["to"], d["subject"], d["body"],
                    attachments=_resume_attachment(),
                )
                status = "sent"
            except Exception as exc:  # logged, batch continues
                mid = None
                status = f"failed: {exc}"
        mem.save_mail(conn, state["company"], d["name"], d["to"], d["subject"], d["body"], status, mid)
        sent.append({**d, "status": status, "message_id": mid})
    conn.close()
    return {**state, "sent": sent}
