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
