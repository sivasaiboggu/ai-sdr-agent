"""Sender Agent — Gmail, 5-minute gap, PDF resume attached.
Dry-run by default (GMAIL_SEND_ENABLED=false): drafts are logged, nothing
is sent. Real sends go through the user's Gmail with an approval step in
the chat UI; this module never sends without that flag.
"""
import time
from backend.app.config import settings
from backend.app import memory as mem

def gap_seconds() -> int:
    return settings.send_gap_seconds

def send_drafts(state: dict, dry_run: bool | None = None) -> dict:
    """Send drafts in order, sleeping `gap_seconds` between sends.
    Returns the drafts with status + (in dry-run) a fake message id."""
    dry = settings.gmail_send_enabled is False if dry_run is None else dry_run
    conn = mem.connect()
    sent = []
    for i, d in enumerate(state["drafts"]):
        if i > 0:
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
