"""Research, leads and drafting share the same steps across chat and CLI."""
from contextvars import ContextVar
from typing import Callable, TypedDict

from backend.app import memory
from backend.app.agents import people, research, sender, tracker, writer
from backend.app.tools.search import normalize_company

stage_listener: ContextVar[Callable[[str, str], None] | None] = ContextVar("stage_listener", default=None)


class CampaignState(TypedDict, total=False):
    company: str
    profile: dict
    people: list
    mailable: list
    drafts: list
    sent: list
    reply_classes: list


def run_campaign(company: str, approve: bool = True, dry_run: bool = True) -> dict:
    company = normalize_company((company or "").strip())
    if not company:
        raise ValueError("company is required — e.g. run_campaign('iion')")

    notify = stage_listener.get()

    def stage(key, run):
        def execute(state):
            if notify:
                notify(key, "start")
            result = run(state)
            if notify:
                notify(key, "done")
            return result
        return execute

    steps = [(key, stage(key, agent.run)) for key, agent in (
        ("research", research), ("people", people), ("writer", writer),
    )]
    state = {"company": company}
    try:
        from langgraph.graph import END, StateGraph
    except ImportError:
        for _, run in steps:
            state = run(state)
    else:
        graph = StateGraph(CampaignState)
        for key, run in steps:
            graph.add_node(key, run)
        graph.set_entry_point("research")
        graph.add_edge("research", "people")
        graph.add_edge("people", "writer")
        graph.add_edge("writer", END)
        state = graph.compile().invoke(state)

    drafts = state.get("drafts") or []
    if drafts and approve:
        state = sender.send_drafts(state, dry_run=dry_run)
    elif drafts:
        conn = memory.connect()
        try:
            state["drafts"] = memory.save_drafts(conn, state["company"], drafts)
        finally:
            conn.close()
    state = tracker.run(state)
    state.setdefault("profile", {"name": company, "summary": "", "sources": [], "role": ""})
    for key in ("people", "mailable", "drafts", "sent", "reply_classes"):
        state.setdefault(key, [])
    return state
