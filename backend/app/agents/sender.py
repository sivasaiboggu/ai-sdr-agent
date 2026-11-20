"""Sender Agent — Gmail, 5-minute gap, PDF resume attached.
Dry-run by default (GMAIL_SEND_ENABLED=false): drafts are logged, nothing
is sent. Real sends go through the user's Gmail with an approval step in
the chat UI; this module never sends without that flag.
"""
import time
from backend.app.config import settings
from backend.app.quality import check_draft
from backend.app import memory as mem

def gap_seconds() -> int:
    return settings.send_gap_seconds

def send_drafts(state: dict, dry_run: bool | None = None) -> dict:
    """Send drafts in order, sleeping `gap_seconds` between sends.
    Returns the drafts with status + (in dry-run) a fake message id.
    Last line of defence: a draft that fails the quality gate is BLOCKED
    here and never mailed, even if it somehow reached the sender."""
    dry = settings.gmail_send_enabled is False if dry_run is None else dry_run
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
        if i > 0 and sent and not sent[-1]["status"].startswith("blocked"):
            time.sleep(gap_seconds())
        if dry:
            mid = f"dry-run-{state['company']}-{i}"
            status = "draft (dry-run)"
        else:
            # Real send is done by the parent agent via Gmail (approval card),
            # so this path is only reached when the user explicitly enabled it.
            mid = None
            status = "ready-to-send"
        mem.save_mail(conn, state["company"], d["name"], d["to"], d["subject"], d["body"], status, mid)
        sent.append({**d, "status": status, "message_id": mid})
    conn.close()
    return {**state, "sent": sent}
