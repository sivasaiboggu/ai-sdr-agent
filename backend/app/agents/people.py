"""People Agent — finds founders / HR / hiring leads, verified emails only.
Never guesses an email: people without a verified address are returned
with email='' and are NOT mailed.
"""
from backend.app.tools.apollo import find_people
from backend.app import memory as mem

def run(state: dict) -> dict:
    company = state["company"]
    people = find_people(company)
    conn = mem.connect()
    for p in people:
        mem.save_person(conn, company, p["name"], p["title"], p["email"],
                        p["verified"], p["score"], p.get("linkedin", ""))
    conn.close()
    mailable = [p for p in people if p["verified"] and p["email"]]
    return {**state, "people": people, "mailable": mailable}
