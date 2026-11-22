"""Copy guard: user-facing text stays plain human words.

Fails the build if the frontend (or the API's user-facing strings)
contains emoji, decorative symbols, marketing clichés, decorative
gradient/glass classes, frosted surfaces, or staggered-entrance
patterns. Motion is only for state changes, so staggered entrances
and animated skeletons fail here too.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "frontend" / "src"
API = ROOT / "backend" / "app" / "api.py"

BANNED_WORDS = [
    "seamless", "supercharge", "elevate", "unlock", "revolution",
    "game-changer", "ai-powered", "cutting-edge", "next-gen",
    "world-class", "superpower", "effortless", "transform your",
    "level up", "10x",
]

# Decorative symbols: sparkles, arrows, check/cross marks, bullets,
# stars, and the common emoji ranges. The multiplication sign and
# middot are not included — "5-min gap" and "·" separators are text.
SYMBOL_RE = re.compile(
    r"[✨⭐🎉🚀💡🔥👉➜→←↑↓✓✔✗✘●○■◆►▶◀★☆]"
    r"|[\U0001F300-\U0001FAFF]"
    r"|[\u2600-\u27BF]"
)

# Decorative styling that reads as AI slop: gradient utility classes,
# radial glows, glow/lift shadows, glassmorphism, frosted surfaces
# (backdrop-blur), staggered entrances (fadeUp, rise-N, per-item
# delays) and animated skeletons.
STYLE_RE = re.compile(
    r"bg-gradient-(to-|from-|via-|to\s)|radial-gradient|shadow-glow|shadow-lift|\bglass\b"
    r"|backdrop-blur|\bshimmer\b|\bfadeUp\b|\brise-\d|delay:\s*i\s*\*"
)


def _scan(path: Path):
    text = path.read_text(encoding="utf-8")
    hits = []
    for i, line in enumerate(text.splitlines(), 1):
        stripped = line.strip()
        if stripped.startswith(("*", "//")):
            continue
        for word in BANNED_WORDS:
            if word.lower() in line.lower():
                hits.append(f"{path.relative_to(ROOT)}:{i}: banned word {word!r}")
        if SYMBOL_RE.search(line):
            hits.append(f"{path.relative_to(ROOT)}:{i}: decorative symbol in {line.strip()[:80]!r}")
        if STYLE_RE.search(line):
            hits.append(f"{path.relative_to(ROOT)}:{i}: decorative style in {line.strip()[:80]!r}")
    return hits


def test_no_slop_in_frontend():
    hits = []
    for path in sorted(SRC.rglob("*.tsx")) + sorted(SRC.rglob("*.ts")) + sorted(SRC.rglob("*.css")):
        if path.name.endswith(".test.mjs"):
            continue
        hits.extend(_scan(path))
    assert not hits, "\n".join(hits)


def test_no_slop_in_api_strings():
    hits = _scan(API)
    assert not hits, "\n".join(hits)
