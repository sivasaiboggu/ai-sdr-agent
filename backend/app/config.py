"""Config — all secrets come from the environment, never hardcoded.

`.env` is loaded here (python-dotenv), so `cp .env.example .env` followed
by `uvicorn backend.app.api:app` actually picks the values up — previously
nothing called `load_dotenv`, so a `.env` file was silently ignored unless
the variables were exported in the shell.
"""
import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


def _env_int(name: str, default: int) -> int:
    """Parse an int env var; a bad value falls back to the default instead of
    crashing the import (a typo in .env used to kill the whole app)."""
    try:
        return int(os.getenv(name, "") or default)
    except (TypeError, ValueError):
        return default


def _env_list(name: str, default: str) -> list[str]:
    """Parse a comma-separated env var into a list of origins/values."""
    raw = os.getenv(name, default)
    return [v.strip() for v in raw.split(",") if v.strip()]


@dataclass
class Settings:
    gemini_api_key: str = _env("GEMINI_API_KEY")
    apollo_api_key: str = _env("APOLLO_API_KEY")
    gmail_send_enabled: bool = _env("GMAIL_SEND_ENABLED", "false").lower() == "true"
    gmail_from: str = _env("GMAIL_FROM", "sivasaiboggu@gmail.com")
    # Gmail app password (Google Account > Security > 2-Step Verification >
    # App passwords). Needed only for real sends; never committed.
    gmail_app_password: str = _env("GMAIL_APP_PASSWORD")
    database_url: str = _env("DATABASE_URL", "sqlite:///./sdr.db")
    send_gap_seconds: int = _env_int("SEND_GAP_SECONDS", 300)
    resume_path: str = _env("RESUME_PATH", "workspace/your_files/sivasai-boggu-ats-resume/Sivasai_Boggu_Resume.pdf")
    # Origins allowed to call the API from a browser (Vercel frontend).
    # Comma-separated; add the deployed frontend origin here, e.g.
    # CORS_ORIGINS=https://ai-sdr-agent.vercel.app,http://localhost:5173
    # Default is local dev only — a deployed frontend without its origin
    # listed here gets its preflight rejected, so set this on the host.
    cors_origins: list[str] = field(default_factory=lambda: _env_list(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"))

    def __post_init__(self):
        # A negative gap makes no sense; clamp instead of sleeping forever.
        self.send_gap_seconds = max(0, self.send_gap_seconds)

    @property
    def has_gemini(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def has_apollo(self) -> bool:
        return bool(self.apollo_api_key)

    @property
    def database_kind(self) -> str:
        return "postgres" if self.database_url.startswith("postgres") else "sqlite"


settings = Settings()

# The user's own profile — the proof the Writer Agent uses in every mail.
# This is the user's real, verified background, not invented.
USER_PROFILE = {
    "name": "Sivasai Boggu",
    "email": "sivasaiboggu@gmail.com",
    "phone": "+91 9573719115",
    "location": "Gooty, Andhra Pradesh, India",
    "education": "BTech Computer Science, IIIT Kottayam (2023-2027), CGPA 7.73",
    "current_role": "Software Developer Intern, Whispry (MERN, May 2026-present)",
    "projects": {
        "HireMind AI": "React/TypeScript + Gemini, resume analysis and interview prep",
        "AuditMind": "FastAPI, BERT, RAG, Gemini, contract intelligence",
        "SecureFlow": "Python, FastAPI, PyTorch/BERT, AWS, Terraform, cloud security",
    },
    "stack": ["Python", "TypeScript", "React", "Next.js", "FastAPI", "LangChain", "LangGraph", "RAG", "PostgreSQL", "MongoDB", "PyTorch", "AWS", "Docker", "Terraform"],
}
