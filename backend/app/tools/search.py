"""Web search tool — real search when available, mock data otherwise.
Every fact returned carries a source, so the Writer can cite it and
never invents a company detail in a mail.
"""
import os

# Verified, researched company profiles used in mock / offline mode.
# These came from real research on 19 Nov 2026 — they are the seed data,
# not live search results. Live search (DuckDuckGo HTML) is tried first.
KNOWN_COMPANIES = {
    "iion": {
        "name": "iion", "domain": "iion.io",
        "summary": "Self-serve ad platform for gaming (immersiion). Hiring an AI Engineering Intern for Agentic Workflows, remote in India, 6 months, to full-time. Stack: Python, LLM APIs, LangChain, LangGraph.",
        "sources": ["https://www.iion.io/careers", "https://builtin.com/job/ai-engineering-intern-agentic-workflows/12116203"],
        "role": "AI Engineering Intern (Agentic Workflows)",
    },
    "alchemyst ai": {
        "name": "Alchemyst AI", "domain": "getalchemystai.com",
        "summary": "Context layer for AI agents; hiring a Full Stack AI Engineer Intern (Next.js, React, TypeScript, WebSockets, streaming UIs), 0-1 years, team ~10.",
        "sources": ["https://getalchemystai.com/about", "https://wellfound.com/jobs/4126022-full-stack-ai-engineer-intern"],
        "role": "Full Stack AI Engineer Intern",
    },
    "discover dollar": {
        "name": "Discover Dollar", "domain": "discoverdollar.com",
        "summary": "Contract-compliance / revenue recovery for enterprises. Hiring an AI Engineer Intern (Agentic AI) in Bengaluru; posting names LangGraph, LangChain, DeepAgents and MCP.",
        "sources": ["https://www.shine.com/jobs/ai-engineer-intern-bangalore-east/discover-dollar/19794628"],
        "role": "AI Engineer Intern (Agentic AI)",
    },
    "drivetrain": {
        "name": "Drivetrain", "domain": "drivetrain.ai",
        "summary": "FP&A platform; hiring an Engineering Intern - Gen AI for the FP&A platform, remote in India, RAG / Agentic AI.",
        "sources": ["https://himalayas.app/companies/drivetrain/jobs/engineering-intern-gen-ai-for-fp-a-platform"],
        "role": "Engineering Intern - Gen AI for FP&A Platform",
    },
}

def _live_search(query: str):
    """Best-effort DuckDuckGo HTML search. Returns [] on any failure."""
    try:
        import requests
        r = requests.get("https://html.duckduckgo.com/html/",
                         params={"q": query}, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        if r.status_code != 200:
            return []
        import re
        results = []
        for m in re.finditer(r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', r.text):
            title = re.sub(r"<[^>]+>", "", m.group(2)).strip()
            results.append({"title": title, "url": m.group(1)})
            if len(results) >= 5:
                break
        return results
    except Exception:
        return []

def normalize_company(text: str) -> str:
    """Map a free-text mention to a known company name, else return it cleaned.
    Handles multi-word names like 'Alchemyst AI' / 'Discover Dollar'."""
    low = text.lower()
    for key in KNOWN_COMPANIES:
        if key in low:
            return KNOWN_COMPANIES[key]["name"]
    # Strip trailing filler words from a chat command.
    for filler in [" and draft mails", " and draft", " draft mails", " please"]:
        low = low.replace(filler, "")
    return low.strip().title() or text.strip()

def search_company(company: str) -> dict:
    """Research one company. Returns summary + cited sources."""
    company = normalize_company(company)
    key = company.strip().lower()
    live = _live_search(f"{company} company careers hiring")
    known = KNOWN_COMPANIES.get(key)
    if known:
        sources = list(dict.fromkeys(known["sources"] + [r["url"] for r in live]))
        return {**known, "sources": sources, "live_results": live}
    if live:
        return {"name": company, "domain": "", "summary": f"Found {len(live)} web results for {company}; top: {live[0]['title']}.",
                "sources": [r["url"] for r in live], "role": "", "live_results": live}
    return {"name": company, "domain": "", "summary": f"No verified public information found for {company} in this run.",
            "sources": [], "role": "", "live_results": []}
