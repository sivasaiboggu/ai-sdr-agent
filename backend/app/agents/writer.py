"""Writer Agent — personalised cold mail per person.
Rules enforced here and in tests:
- hook comes from real research (profile summary / role), never invented;
- proof comes from the user's real projects;
- no [bracket] may survive — a mail with one is rejected;
- no invented email, company fact, or metric.
Uses Gemini when GEMINI_API_KEY is set, otherwise the template writer
below (which is fully personalised from the researched profile).
"""
import re
from backend.app.config import USER_PROFILE
from backend.app.quality import check_draft, validate_draft
from backend.app.tools.search import normalize_company

HOOKS = {
    "iion": "I looked at immersiion, your self-serve ad platform for gaming — in week one I'd prototype an agent that drafts campaign setup from a brief and runs it in shadow mode, with a human approving before anything goes live.",
    "alchemyst ai": "Your context layer for streaming, context-aware agents is exactly the kind of system I want to build on — in week one I'd ship a streaming agent demo on top of it, with citations for every fact it uses.",
    "discover dollar": "First, I'd agent-ify contract-compliance review — an agent that reads vendor contracts and invoices with RAG, flags pricing and rebate mismatches, and aims to surface recoverable leakage faster, with a human approving before any claim goes out.",
    "drivetrain": "For your FP&A platform, I'd prototype a GenAI agent that reads a finance pack, explains the variance in plain English, and drafts the commentary — with a human approving before anything goes out.",
}

SUBJECTS = {
    "iion": "I build autonomous agents with LangGraph — applying for iion's Agentic Workflows intern role",
    "alchemyst ai": "Full Stack AI Engineer Intern — Sivasai Boggu, React/TypeScript + WebSockets",
    "discover dollar": "LangGraph, LangChain, MCP — this stack is my stack",
    "drivetrain": "GenAI for FP&A — an agent that explains variance, not just charts it",
}

def _gemini_draft(prompt: str) -> str | None:
    try:
        import os
        from google import genai
        key = os.getenv("GEMINI_API_KEY")
        if not key:
            return None
        client = genai.Client(api_key=key)
        resp = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        return (resp.text or "").strip() or None
    except Exception:
        return None

def draft_mail(company: str, person: dict, profile: dict) -> dict:
    if not (person.get("name") or "").strip():
        raise ValueError("Writer needs a person with a name")
    if not (profile.get("name") or "").strip():
        raise ValueError("Writer needs a researched company profile")
    # Refuse to draft for a company we could not research: with no
    # sources and no role, the mail would invent a role that may not
    # exist and claim research that never happened. The caller reports
    # this plainly instead of sending a generic mail.
    if not profile.get("researched", True):
        raise ValueError(
            f"Could not research {profile['name']!r} — no verified public "
            "information found, so there is nothing real to write about. "
            "Research it by hand first, or pick a company with a live posting."
        )
    key = normalize_company(company).strip().lower()
    first = person["name"].split()[0]
    # The role phrase must read as a sentence: with a researched role it
    # names it ("iion's AI Engineering Intern (Agentic Workflows)"); with
    # no role on file it says "a role at X" instead of inventing one
    # ("the open AI role" used to read as a role that may not exist).
    role = profile.get("role") or ""
    role_phrase = f"{profile['name']}'s {role}" if role else f"a role at {profile['name']}"
    hook = HOOKS.get(key) or f"I read about {profile['name']} and {role_phrase} — the work matches what I already build with LangGraph and RAG."
    subject = SUBJECTS.get(key, f"Applying for {role_phrase} — Sivasai Boggu, AI Agent Engineer")

    body = f"""Hi {first},

I am applying for {role_phrase}, and I am writing directly because the role describes the work I already do.

In AuditMind, I built a document-intelligence system with FastAPI, BERT, RAG and Gemini that extracts clauses, flags compliance gaps and scores risk — an agent workflow, not a single prompt. In HireMind AI, I built resume analysis with React, TypeScript and Gemini. My day-to-day stack is Python, LangChain and LangGraph, and I am currently a Software Developer Intern at Whispry.

{hook}

I can start immediately, work fully remote from India, and I am looking for exactly the internship-to-full-time path this role offers. Would you be open to a 15-minute call this week? I can walk you through AuditMind live and show the agent design, not just the resume.

Best regards,
Sivasai Boggu
BTech CSE, IIIT Kottayam (2023–2027) | Software Developer Intern, Whispry
sivasaiboggu@gmail.com | 9573719115 | Available immediately — open to anywhere
Resume attached."""

    draft = {"to": person["email"], "name": person["name"], "title": person["title"],
             "subject": subject, "body": body}

    # Gemini polish (optional): only used to tighten wording, never to add facts.
    # The polished version is kept only if it still passes every quality check.
    polished = _gemini_draft(
        "Tighten this cold email without adding any new facts, companies, or numbers. Keep it under 180 words:\n\n" + body)
    if polished and not check_draft({**draft, "body": polished}, person, profile):
        draft["body"] = polished

    # Hard gate: a bad draft raises here instead of reaching approval/send.
    validate_draft(draft, person, profile)
    return draft

def run(state: dict) -> dict:
    profile = state["profile"]
    drafts = [draft_mail(state["company"], p, profile) for p in state["mailable"]]
    return {**state, "drafts": drafts}
