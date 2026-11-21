"""Tests — writer (no brackets, no invented emails), sender gap, tracker."""
import time
from backend.app.agents import writer, tracker
from backend.app.agents.sender import gap_seconds
from backend.app.tools.apollo import find_people, lead_score

def test_writer_no_brackets():
    profile = {"name": "iion", "role": "AI Engineering Intern (Agentic Workflows)",
               "summary": "Ad platform for gaming.", "sources": ["https://www.iion.io/careers"]}
    person = {"name": "Wout van Damme", "title": "Co-Founder", "email": "wout@iion.io"}
    mail = writer.draft_mail("iion", person, profile)
    assert "[" not in mail["body"]
    assert "wout@iion.io" == mail["to"]
    assert "AuditMind" in mail["body"] and "HireMind" in mail["body"]

def test_people_verified_only():
    people = find_people("iion")
    assert all(p["email"] for p in people if p["verified"])
    assert lead_score("Co-Founder") > lead_score("Senior Talent Acquisition Manager")

def test_sender_gap_is_5_minutes():
    assert gap_seconds() == 300

def test_tracker_classification():
    assert tracker.classify_reply("Let's schedule a call this week") == "interested"
    assert tracker.classify_reply("550 5.1.1 The email account does not exist") == "bounce"
    assert tracker.classify_reply("I am out of office on leave") == "out of office"
    assert tracker.classify_reply("We are not hiring right now") == "not now"


def test_tracker_records_no_placeholder_learning(monkeypatch, tmp_path):
    """Regression: an interested reply with no hook used to record the
    literal placeholder 'personalised research hook' as a learning."""
    from backend.app import memory as mem

    monkeypatch.setattr(mem, "DB_PATH", str(tmp_path / "tracker.db"))
    result = tracker.run({"company": "iion", "replies": [
        {"from": "Wout van Damme", "text": "Let's schedule a call this week"},
    ]})
    assert result["reply_classes"][0]["class"] == "interested"
    conn = mem.connect()
    try:
        rows = conn.execute("SELECT text FROM learnings").fetchall()
    finally:
        conn.close()
    assert rows == [], f"no learning should be recorded without a real hook, got {rows}"


def test_tracker_records_real_hook_learning(monkeypatch, tmp_path):
    from backend.app import memory as mem

    monkeypatch.setattr(mem, "DB_PATH", str(tmp_path / "tracker2.db"))
    tracker.run({"company": "iion", "replies": [
        {"from": "Wout van Damme", "text": "Let's schedule a call",
         "hook": "immersiion shadow-mode prototype"},
    ]})
    conn = mem.connect()
    try:
        rows = conn.execute("SELECT text, outcome FROM learnings").fetchall()
    finally:
        conn.close()
    assert rows == [("immersiion shadow-mode prototype", "interested reply")]


class _FakeGenAIResponse:
    def __init__(self, text):
        self.text = text


class _FakeGenAIModels:
    def __init__(self, calls):
        self.calls = calls

    def generate_content(self, model, contents):
        self.calls.append((model, contents))
        return _FakeGenAIResponse("  Tightened draft.  ")


class _FakeGenAIClient:
    def __init__(self, calls, api_key=None):
        self.calls = calls
        self.api_key = api_key
        self.models = _FakeGenAIModels(calls)


def test_gemini_draft_uses_new_sdk(monkeypatch):
    """Writer polish goes through google-genai (google.generativeai is EOL)."""
    import google.genai
    calls = []
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(google.genai, "Client",
                        lambda api_key=None: _FakeGenAIClient(calls, api_key=api_key))
    out = writer._gemini_draft("Tighten this")
    assert out == "Tightened draft."
    assert calls and calls[0][0] == "gemini-2.0-flash"
    assert "Tighten this" in calls[0][1]


def test_gemini_draft_without_key_returns_none(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert writer._gemini_draft("Tighten this") is None


def test_gemini_draft_failure_falls_back(monkeypatch):
    import google.genai
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(google.genai, "Client",
                        lambda api_key=None: (_ for _ in ()).throw(RuntimeError("boom")))
    assert writer._gemini_draft("Tighten this") is None
