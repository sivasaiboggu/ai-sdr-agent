"""Draft quality checks — the gate every mail must pass before it can be
approved or sent. A draft that fails is never mailed; the writer (or the
sender, as a last line of defence) must fix it first.

Checks:
- no [bracket] / placeholder text may survive (TODO, TBD, Lorem, <...>),
- recipient must be a syntactically valid, verified-looking email,
- subject present and not absurdly long,
- body greets the person by first name,
- body carries a personalised hook: the company name or the role,
- body carries proof from the user's real projects (never invented),
- body is a real mail, not a stub: 60-300 words.
"""
import re

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
PLACEHOLDER_RE = re.compile(r"\[.*?\]|<[^>]+>|\bTODO\b|\bTBD\b|\bLorem\b|\bXXX\b", re.IGNORECASE)
PROOF_PROJECTS = ("AuditMind", "HireMind", "SecureFlow", "Whispry")

MIN_WORDS = 60
MAX_WORDS = 300
MAX_SUBJECT_CHARS = 120


def is_valid_email(email: str) -> bool:
    """Syntactic check only — verification status comes from Apollo/seed data."""
    return bool(email) and bool(EMAIL_RE.match(email.strip()))


def check_draft(draft: dict, person: dict | None = None, profile: dict | None = None) -> list[str]:
    """Return a list of quality issues; empty list means the draft is good."""
    issues: list[str] = []
    body = (draft.get("body") or "")
    subject = (draft.get("subject") or "").strip()
    to = (draft.get("to") or "").strip()

    if not is_valid_email(to):
        issues.append(f"recipient email is not a valid address: {to!r}")
    if not subject:
        issues.append("subject is empty")
    elif len(subject) > MAX_SUBJECT_CHARS:
        issues.append(f"subject is {len(subject)} chars (max {MAX_SUBJECT_CHARS})")
    if not body.strip():
        issues.append("body is empty")
        return issues

    if PLACEHOLDER_RE.search(body):
        issues.append("body still contains a bracket or placeholder (e.g. [name], TODO)")
    if PLACEHOLDER_RE.search(subject):
        issues.append("subject still contains a bracket or placeholder")

    words = body.split()
    if len(words) < MIN_WORDS:
        issues.append(f"body is only {len(words)} words (min {MIN_WORDS}) — too thin to send")
    elif len(words) > MAX_WORDS:
        issues.append(f"body is {len(words)} words (max {MAX_WORDS}) — too long for a cold mail")

    if person and person.get("name"):
        first = person["name"].split()[0]
        if first not in body:
            issues.append(f"body does not greet {first} by name — not personalised")

    if profile:
        name = (profile.get("name") or "").strip()
        role = (profile.get("role") or "").strip()
        if name and name.lower() not in body.lower() and not (role and role.lower() in body.lower()):
            issues.append("body mentions neither the company nor the role — hook is missing")

    if not any(p in body for p in PROOF_PROJECTS):
        issues.append("body cites no real project (AuditMind / HireMind / SecureFlow / Whispry)")

    return issues


def validate_draft(draft: dict, person: dict | None = None, profile: dict | None = None) -> None:
    """Raise ValueError listing every issue, so a bad draft can never slip through."""
    issues = check_draft(draft, person, profile)
    if issues:
        raise ValueError("Draft failed quality checks: " + "; ".join(issues))
