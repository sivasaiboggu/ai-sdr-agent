"""Job-board registry — every board the agent researches companies from.

These are the boards Siva actually uses for his AI Agent / AI Engineer /
Software Developer search (Nov 2026). Each entry records what the board
is good for and Siva's sign-in state there as of 20 Nov 2026, so the
dashboard can say honestly whether an application route is ready or
blocked. Internshala is deliberately NOT in this list — Siva asked to
skip it entirely, and the agent must never suggest it.
"""
BOARDS = [
    {
        "id": "builtin",
        "name": "Built In",
        "url": "https://builtin.com/jobs",
        "focus": "Startup and tech jobs, India filter",
        "best_for": "iion, Drivetrain and other venture-backed startups",
        "signin": "signed-in",
        "signin_note": "Signed in as sivasaiboggu@gmail.com",
        "apply_note": "Apply on the board or the employer's own site; check Applied status first.",
    },
    {
        "id": "wellfound",
        "name": "Wellfound",
        "url": "https://wellfound.com/jobs",
        "focus": "Startup internships, mostly remote-friendly",
        "best_for": "vaiu.ai, Alchemyst AI, Fluexy, Langslide and other early-stage teams",
        "signin": "signed-in",
        "signin_note": "Signed in as Boggu Sivasai via Google; profile resume is the current PDF",
        "apply_note": "Uses the Wellfound profile resume — no separate PDF upload field.",
    },
    {
        "id": "shine",
        "name": "Shine",
        "url": "https://www.shine.com",
        "focus": "Indian job portal, large employers and consultancies",
        "best_for": "Discover Dollar, SmartBridge and other India-based employers",
        "signin": "signed-in",
        "signin_note": "Signed in as Sivasai Boggu",
        "apply_note": "Profile resume is the current PDF; Easy Apply on the board.",
    },
    {
        "id": "jobfound",
        "name": "Jobfound",
        "url": "https://jobfound.org",
        "focus": "Curated fresher and intern listings, India",
        "best_for": "eTeam, Fast Code AI, Ascende and other fresher roles",
        "signin": "signed-in",
        "signin_note": "Signed in as SIVA SAI",
        "apply_note": "Listings often redirect to the employer's own form or inbox.",
    },
    {
        "id": "himalayas",
        "name": "Himalayas",
        "url": "https://himalayas.app",
        "focus": "Remote-first companies worldwide",
        "best_for": "Binance, AccuKnox, Fask, Vilambo, Spektra, Cirqllabs",
        "signin": "signed-in",
        "signin_note": "Signed in as SIVA SAI; free plan",
        "apply_note": "Apply on the board; check Applied status first — several roles were already applied.",
    },
    {
        "id": "cutshort",
        "name": "Cutshort",
        "url": "https://cutshort.io",
        "focus": "Startup hiring, remote and Bengaluru roles",
        "best_for": "PGAGI and other small-team AI roles",
        "signin": "not-signed-in",
        "signin_note": "Sign-in not completed — applications here are blocked until Siva signs in",
        "apply_note": "Needs Siva's Cutshort sign-in before any application.",
    },
    {
        "id": "hiringcafe",
        "name": "HiringCafe",
        "url": "https://hiringcafe.com",
        "focus": "Aggregated startup and enterprise listings",
        "best_for": "PinSec.Ai, Vivusoft, Meraki Labs, Enterpret, Airbus",
        "signin": "browse-only",
        "signin_note": "No account needed to browse; applications go to the employer's own site",
        "apply_note": "Listings redirect out — verify the role is still live before applying.",
    },
    {
        "id": "linkedin",
        "name": "LinkedIn Jobs",
        "url": "https://www.linkedin.com/jobs",
        "focus": "Largest pool; Easy Apply on many roles",
        "best_for": "Lanmea, Honeywell, Offshore Minds, SynaptyX and other Easy Apply roles",
        "signin": "signed-in",
        "signin_note": "Signed in as SIVASAI B (via sivasai11718@gmail.com)",
        "apply_note": "Easy Apply only offers the signed-in account's email — check which account is in use.",
    },
]

# Addresses that bounced before. The agent must never mail them again.
DO_NOT_MAIL = [
    {"email": "jobs@iion.io", "reason": "Bounced 19 Nov 2026 — 550 5.1.1, account does not exist"},
    {"email": "rthornton@eteaminc.com", "reason": "Bounced 20 Nov 2026 — address not found at eteaminc.com"},
    {"email": "careers@hackshade.in", "reason": "Bounced 20 Nov 2026 — 550 5.1.1, user does not exist"},
    {"email": "careers@techsima.com", "reason": "Bounced 19 Nov 2026 — 550 5.1.1, undeliverable address"},
]


def get_boards() -> list[dict]:
    """All boards, in the order Siva checks them. Never includes Internshala."""
    return [dict(b) for b in BOARDS]
