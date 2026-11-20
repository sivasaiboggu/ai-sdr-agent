"""People tool — Apollo (real, when APOLLO_API_KEY is set) + verified seed data.
NEVER guesses an email. An address is returned only if Apollo shows it
as verified, or it is in the verified seed list below.
"""
import os
import requests
from backend.app.tools.search import normalize_company

# Verified in Apollo on 19 Nov 2026 (23 credits left of 100 at that time).
VERIFIED_PEOPLE = {
    "iion": [
        {"name": "Sanjaya Molligoda", "title": "Co-Founder", "email": "sanjaya@iion.io", "verified": True, "linkedin": "https://www.linkedin.com/in/sanjayamolligoda/"},
        {"name": "Wout van Damme", "title": "Co-Founder", "email": "wout@iion.io", "verified": True, "linkedin": "https://www.linkedin.com/in/woutvandamme/"},
        {"name": "Giuseppe Martoriello", "title": "Co-Founder", "email": "giuseppe.martoriello@iion.io", "verified": True, "linkedin": "https://www.linkedin.com/in/giuseppe-martoriello-iion/"},
        {"name": "Ullas Sahadevan", "title": "Senior Talent Acquisition Manager", "email": "ullas@iion.io", "verified": True, "linkedin": ""},
    ],
    "alchemyst ai": [
        {"name": "Uttaran Nayak", "title": "Co-Founder | CEO", "email": "uttaran@getalchemystai.com", "verified": True, "linkedin": "https://www.linkedin.com/in/uttarannayak/"},
        {"name": "Anuran Roy", "title": "Co-founder and CTO", "email": "anuran@getalchemystai.com", "verified": True, "linkedin": "https://www.linkedin.com/in/anuran-roy/"},
        {"name": "Prithwijit Dey", "title": "Chief Operating Officer", "email": "prithwijit@getalchemystai.com", "verified": True, "linkedin": "https://www.linkedin.com/in/prithwijitdey/"},
    ],
    "discover dollar": [
        {"name": "Dheemanth Ramesh", "title": "Chief Technology Officer", "email": "dheemanth@discoverdollar.com", "verified": True, "linkedin": ""},
        {"name": "Pawan Kuldip", "title": "People & Culture", "email": "pawan.kuldip@discoverdollar.com", "verified": True, "linkedin": ""},
    ],
    "drivetrain": [
        {"name": "Saurav Bhagat", "title": "Co-Founder", "email": "", "verified": False, "linkedin": "https://www.linkedin.com/in/saurav-bhagat-83216886/"},
        {"name": "Alok Goel", "title": "Co-founder and CEO/CFO", "email": "", "verified": False, "linkedin": "https://www.linkedin.com/in/goelalok/"},
        {"name": "Swapna Thomas", "title": "Senior Associate - HR Business Partner", "email": "", "verified": False, "linkedin": "https://www.linkedin.com/in/swapna-thomas-a51470188/"},
        {"name": "Ashwathy Philip", "title": "Leading People & Culture", "email": "", "verified": False, "linkedin": "https://www.linkedin.com/in/ashwathy-philip/"},
    ],
}

def lead_score(title: str) -> int:
    """Founder > C-level > HR / hiring lead > other. Used to order outreach."""
    t = title.lower()
    if "founder" in t or "ceo" in t:
        return 100
    if "cto" in t or "coo" in t or "operating officer" in t or "chief" in t:
        return 90
    if "talent" in t or "people" in t or "hr" in t or "hiring" in t:
        return 80
    return 50

def find_people(company: str) -> list[dict]:
    """Return verified people for a company, scored. Unverified = email ''."""
    key = normalize_company(company).strip().lower()
    people = [dict(p, score=lead_score(p["title"])) for p in VERIFIED_PEOPLE.get(key, [])]
    # Real Apollo lookup when a key is set — only verified emails are kept.
    api_key = os.getenv("APOLLO_API_KEY")
    if api_key:
        try:
            r = requests.post("https://api.apollo.io/v1/mixed_people/search",
                headers={"X-Api-Key": api_key, "Content-Type": "application/json"},
                json={"q_organization_name": company, "page": 1, "per_page": 10}, timeout=15)
            for p in (r.json().get("people") or []):
                email = (p.get("email") or "")
                if p.get("email_status") == "verified" and email:
                    people.append({"name": p.get("name", ""), "title": p.get("title", ""),
                                   "email": email, "verified": True,
                                   "linkedin": p.get("linkedin_url", ""),
                                   "score": lead_score(p.get("title", ""))})
        except Exception:
            pass
    people.sort(key=lambda p: -p["score"])
    return people
