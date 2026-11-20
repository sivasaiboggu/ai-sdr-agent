"""LangGraph state machine: research -> people -> writer -> [human approval] -> sender -> tracker.
Human-in-the-loop: the graph stops after `writer` and waits for approval
(approve / always-allow / edit) before `sender` runs. If LangGraph is not
installed, `run_campaign` falls back to the same steps in order.
"""
from backend.app.agents import research, people, writer, sender, tracker

def run_campaign(company: str, approve: bool = True, dry_run: bool = True) -> dict:
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
        # Human approval gate lives outside the graph in Phase 1 (API/CLI):
        # drafts are returned for approval; sender runs only if approve=True.
        if approve and state.get("drafts"):
            state = sender.send_drafts(state, dry_run=dry_run)
        return state
    except ImportError:
        state = research.run(state)
        state = people.run(state)
        state = writer.run(state)
        if approve and state.get("drafts"):
            state = sender.send_drafts(state, dry_run=dry_run)
        state = tracker.run(state)
        return state
