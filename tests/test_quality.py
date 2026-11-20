"""Tests — draft quality gate, lead scoring, sender guard, approval flow."""
from fastapi.testclient import TestClient

from backend.app.agents import writer
from backend.app.agents.sender import send_drafts
from backend.app.graph import run_campaign
from backend.app.quality import check_draft, is_valid_email, validate_draft
from backend.app.tools.apollo import find_people, lead_score
from backend.app.whatsapp.webhook import handle_text
from backend.app.api import app

PROFILE = {"name": "iion", "role": "AI Engineering Intern (Agentic Workflows)",
           "summary": "Ad platform for gaming.", "sources": ["https://www.iion.io/careers"]}
PERSON = {"name": "Wout van Damme", "title": "Co-Founder", "email": "wout@iion.io"}

GOOD = writer.draft_mail("iion", PERSON, PROFILE)


def test_good_draft_passes_quality_gate():
    assert check_draft(GOOD, PERSON, PROFILE) == []
    validate_draft(GOOD, PERSON, PROFILE)  # must not raise


def test_quality_flags_bracket_and_placeholder():
    bad = {**GOOD, "body": GOOD["body"] + "\nP.S. [insert personalised line here]"}
    issues = check_draft(bad, PERSON, PROFILE)
    assert any("bracket" in i or "placeholder" in i for i in issues)
    assert any("TODO" in i or "bracket" in i for i in check_draft({**GOOD, "body": "TODO write this later " + "word " * 70}, PERSON, PROFILE))


def test_quality_flags_bad_email_and_empty_subject():
    assert not is_valid_email("not-an-email")
    assert not is_valid_email("wout@")
    assert is_valid_email("wout@iion.io")
    issues = check_draft({**GOOD, "to": "wout@iion", "subject": ""}, PERSON, PROFILE)
    assert any("email" in i for i in issues)
    assert any("subject" in i for i in issues)


def test_quality_flags_missing_hook_and_missing_proof():
    no_hook = {**GOOD, "body": "Hi Wout,\n\n" + "I would love to work with you. " * 12 + "AuditMind is great."}
    assert any("hook" in i for i in check_draft(no_hook, PERSON, PROFILE))
    no_proof = {**GOOD, "body": "Hi Wout,\n\nI read about iion and the AI Engineering Intern (Agentic Workflows) role. " + "I build agents. " * 20}
    assert any("real project" in i for i in check_draft(no_proof, PERSON, PROFILE))


def test_quality_flags_too_short_body():
    issues = check_draft({**GOOD, "body": "Hi Wout, hire me please."}, PERSON, PROFILE)
    assert any("too thin" in i for i in issues)


def test_writer_rejects_empty_name_and_missing_profile():
    try:
        writer.draft_mail("iion", {"name": "", "title": "CEO", "email": "x@y.io"}, PROFILE)
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError for empty person name")
    try:
        writer.draft_mail("iion", PERSON, {"name": "", "role": ""})
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError for missing profile")


def test_lead_score_ordering():
    assert lead_score("Co-Founder & CEO") == 100
    assert lead_score("Co-Founder") == 95
    assert lead_score("CTO") == 90
    assert lead_score("Chief Operating Officer") == 85
    assert lead_score("Senior Talent Acquisition Manager") == 80
    assert lead_score("VP Engineering") == 75
    assert lead_score("Software Engineer") == 50
    assert lead_score("Co-Founder") > lead_score("Senior Talent Acquisition Manager")
    assert lead_score("") == 50


def test_find_people_deduped_and_verified_only():
    people = find_people("iion")
    emails = [p["email"] for p in people if p["email"]]
    assert len(emails) == len(set(emails)), "duplicate emails returned"
    assert all(p["email"] for p in people if p["verified"])
    assert find_people("some company that does not exist xyz") == []


def test_sender_blocks_bad_draft_and_dry_runs_good_one():
    bad = {**GOOD, "body": GOOD["body"] + " [fix me]"}
    result = send_drafts({"company": "iion", "drafts": [bad, GOOD]}, dry_run=True)
    assert result["sent"][0]["status"].startswith("blocked")
    assert result["sent"][0]["message_id"] is None
    assert result["sent"][1]["status"] == "draft (dry-run)"
    assert result["sent"][1]["message_id"].startswith("dry-run-")


def test_graph_rejects_empty_company():
    try:
        run_campaign("")
    except ValueError as e:
        assert "company is required" in str(e)
    else:
        raise AssertionError("expected ValueError for empty company")


def test_graph_drafts_all_pass_quality_gate():
    result = run_campaign("iion", approve=False)
    assert len(result["drafts"]) >= 1
    for d, p in zip(result["drafts"], result["mailable"]):
        assert check_draft(d, p, result["profile"]) == []


def test_whatsapp_research_without_company():
    reply = handle_text("+919573719115", "research ")
    assert "which company" in reply.lower()


client = TestClient(app)


def test_api_chat_validation():
    assert client.post("/chat", json={}).status_code == 422
    assert client.post("/chat", json={"message": ""}).status_code == 422
    r = client.post("/chat", json={"message": "hello there"})
    assert r.status_code == 200
    assert r.json()["drafts"] == []


def test_api_chat_research_returns_quality_drafts():
    r = client.post("/chat", json={"message": "Research iion and draft mails"})
    assert r.status_code == 200
    data = r.json()
    assert len(data["drafts"]) >= 1
    for d in data["drafts"]:
        assert check_draft(d) == []


def test_api_approve_validation_and_404():
    assert client.post("/approve", json={"company": ""}).status_code == 422
    r = client.post("/approve", json={"company": "some company that does not exist xyz"})
    assert r.status_code == 404


def test_api_approve_sends_dry_run_only(monkeypatch):
    # Never sleep 5 minutes between sends in a test.
    monkeypatch.setattr("backend.app.config.settings.send_gap_seconds", 0)
    r = client.post("/approve", json={"company": "iion", "approve": True})
    assert r.status_code == 200
    sent = r.json()["sent"]
    assert len(sent) >= 1
    # GMAIL_SEND_ENABLED is false in this environment: nothing is really sent.
    assert all(s["status"] in ("ready-to-send", "draft (dry-run)") for s in sent)
    assert all(not s["status"].startswith("blocked") for s in sent)


def test_api_approve_declined_sends_nothing():
    r = client.post("/approve", json={"company": "iion", "approve": False})
    assert r.status_code == 200
    assert r.json()["sent"] == []
