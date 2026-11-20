"""Config — all secrets come from the environment, never hardcoded."""
import os
from dataclasses import dataclass

def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


def _env_int(name: str, default: int) -> int:
    """Parse an int env var; a bad value falls back to the default instead of
    crashing the import (a typo in .env used to kill the whole app)."""
    try:
        return int(os.getenv(name, "") or default)
    except (TypeError, ValueError):
        return default

@dataclass
class Settings:
    gemini_api_key: str = _env("GEMINI_API_KEY")
    apollo_api_key: str = _env("APOLLO_API_KEY")
    gmail_send_enabled: bool = _env("GMAIL_SEND_ENABLED", "false").lower() == "true"
    gmail_from: str = _env("GMAIL_FROM", "sivasaiboggu@gmail.com")
    database_url: str = _env("DATABASE_URL", "sqlite:///./sdr.db")
    send_gap_seconds: int = _env_int("SEND_GAP_SECONDS", 300)
    resume_path: str = _env("RESUME_PATH", "workspace/your_files/sivasai-boggu-ats-resume/Sivasai_Boggu_Resume.pdf")

    def __post_init__(self):
        # A negative gap makes no sense; clamp instead of sleeping forever.
        self.send_gap_seconds = max(0, self.send_gap_seconds)

    @property
    def has_gemini(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def has_apollo(self) -> bool:
        return bool(self.apollo_api_key)

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
