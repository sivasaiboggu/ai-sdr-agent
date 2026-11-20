"""Tracker Agent — classifies replies and schedules follow-ups.
Classes: interested / not now / bounce / out of office / other.
A reply classified 'interested' is recorded as a learning, so the
Writer reuses the hook / subject that worked.
"""
import re
from backend.app import memory as mem

def classify_reply(text: str) -> str:
    t = text.lower()
    if "undeliverable" in t or "550" in t or "does not exist" in t or "mail delivery" in t:
        return "bounce"
    if "out of office" in t or "out-of-office" in t or "on leave" in t:
        return "out of office"
    if any(w in t for w in ["let's talk", "let us talk", "schedule", "call", "interview", "interested", "sounds good", "send your resume", "share your"]):
        return "interested"
    if any(w in t for w in ["not hiring", "no opening", "not now", "not at the moment", "no vacancy"]):
        return "not now"
    return "other"

def follow_up_due_days(reply_class: str) -> int | None:
    return 4 if reply_class in ("other", "not now") else None

def run(state: dict) -> dict:
    # In Phase 1 the tracker runs over replies supplied in state["replies"].
    results = []
    conn = mem.connect()
    for r in state.get("replies", []):
        cls = classify_reply(r.get("text", ""))
        results.append({"from": r.get("from", ""), "class": cls, "follow_up_in_days": follow_up_due_days(cls)})
        if cls == "interested":
            mem.record_learning(conn, "hook", r.get("hook", "personalised research hook"), "interested reply")
    conn.close()
    return {**state, "reply_classes": results}
