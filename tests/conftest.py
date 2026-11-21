"""Suite-wide test isolation for the database.

The real ``sdr.db`` was polluted by the suite itself: tests that ran a
campaign or a sender flow without redirecting ``DB_PATH`` wrote into the
production file on every run — 205 duplicate iion mails, a junk company
row from the approve-404 test, and four people rows filed under the
company name "iion and draft mails". Individual tests used to patch
``DB_PATH`` one by one, and every test added without the patch leaked
again (``test_api_chat_research_returns_quality_drafts``,
``test_graph_drafts_all_pass_quality_gate``,
``test_sender_flag_off_never_sends_even_when_asked``,
``test_whatsapp_research_iion``).

Isolation is now the default: every test gets a scratch SQLite file,
and ``DATABASE_URL`` is cleared so a stray Postgres URL in the
environment cannot redirect a test at a real database either. A test
that needs its own database still sets ``DB_PATH`` itself — the
monkeypatch in the test body runs after this fixture and wins.
"""
import pytest

from backend.app import memory as mem


@pytest.fixture(autouse=True)
def _isolate_test_database(monkeypatch, tmp_path):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setattr(mem, "DB_PATH", str(tmp_path / "test.db"))
