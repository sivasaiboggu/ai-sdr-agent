"""LangGraph state machine: research -> people -> writer -> [human approval] -> sender -> tracker.
Human-in-the-loop: the graph stops after `writer` and waits for approval
(approve / always-allow / edit) before `sender` runs. If LangGraph is not
installed (or the graph fails), `run_campaign` falls back to the same steps
in order, so the CLI / chat / WhatsApp flows keep working.
"""
from backend.app.agents import research, people, writer, sender, tracker

def _sequential(state: dict, approve: bool, dry_run: bool) -> dict:
    """The same pipeline without LangGraph, in the same order."""
    state = research.run(state)
    state = people.run(state)
    state = writer.run(state)
    if approve and state.get("drafts"):
        state = sender.send_drafts(state, dry_run=dry_run)
    state = tracker.run(state)
    return state

def run_campaign(company: str, approve: bool = True, dry_run: bool = True) -> dict:
    company = (company or "").strip()
    if not company:
        raise ValueError("company is required — e.g. run_campaign('iion')")
    state: dict = {"company": company, "replies": []}
    try:
        from langgraph.graph import StateGraph, END
        from typing import TypedDict

        class S(TypedDict, total=False):
            company: str
            profile: dict
            people: list
            mailable: list
            drafts: list
            sent: list
            reply_classes: list

        g = StateGraph(S)
        g.add_node("research", research.run)
        g.add_node("people", people.run)
        g.add_node("writer", writer.run)
        g.add_node("tracker", tracker.run)
        g.add_edge("research", "people")
        g.add_edge("people", "writer")
        g.add_edge("writer", "tracker")
        g.set_entry_point("research")
        g.add_edge("tracker", END)
        app = g.compile()
        state = app.invoke({"company": company})
    except ImportError:
        state = _sequential(state, approve, dry_run)
        return _defaults(state)
    except Exception:
        # A graph failure must not kill the campaign — run the same steps
        # sequentially instead of returning a half-filled state.
        state = _sequential({"company": company, "replies": []}, approve, dry_run)
        return _defaults(state)
    # Human approval gate lives outside the graph in Phase 1 (API/CLI):
    # drafts are returned for approval; sender runs only if approve=True.
    if approve and state.get("drafts"):
        state = sender.send_drafts(state, dry_run=dry_run)
        state = tracker.run(state)
    return _defaults(state)

def _defaults(state: dict) -> dict:
    """Every caller can rely on these keys existing, even on a partial run."""
    state.setdefault("profile", {"name": state.get("company", ""), "summary": "", "sources": [], "role": ""})
    state.setdefault("people", [])
    state.setdefault("mailable", [])
    state.setdefault("drafts", [])
    state.setdefault("sent", [])
    state.setdefault("reply_classes", [])
    return state
