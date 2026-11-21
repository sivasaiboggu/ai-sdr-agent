"""Research Agent — researches a company and returns a cited profile.
Every fact used in a mail must come from `sources` here.
"""
from backend.app.tools.search import search_company
from backend.app import memory as mem

def run(state: dict) -> dict:
    company = state["company"]
    profile = search_company(company)
    conn = mem.connect()
    try:
        mem.save_company(conn, profile["name"], profile.get("domain", ""),
                         profile["summary"], profile["sources"])
    finally:
        conn.close()
    return {**state, "profile": profile}
