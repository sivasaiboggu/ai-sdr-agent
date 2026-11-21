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


def test_sender_gap_survives_blocked_draft_between_sends(monkeypatch, tmp_path):
    """Regression: the 5-minute gap used to be checked against the previous
    draft's status, so a blocked draft between two real sends reset it and
    the second mail went out immediately. The gap is between real sends."""
    from backend.app.agents import sender as sender_mod
    from backend.app import memory as mem

    monkeypatch.setattr("backend.app.config.settings.send_gap_seconds", 10)
    monkeypatch.setattr("backend.app.config.settings.gmail_send_enabled", True)
    monkeypatch.setattr(mem, "DB_PATH", str(tmp_path / "gap.db"))
    monkeypatch.setattr(sender_mod.gmail_mod, "send_mail", lambda *a, **k: "<test-id@sdr-agent.local>")
    sleeps: list[float] = []
    monkeypatch.setattr(sender_mod.time, "sleep", lambda s: sleeps.append(s))
    # Clock frozen: the whole batch happens at the same instant, so the
    # full gap must be slept before the second real send.
    monkeypatch.setattr(sender_mod.time, "monotonic", lambda: 1000.0)

    bad = {**GOOD, "body": GOOD["body"] + " [fix me]"}
    second = {**GOOD, "to": "sanjaya@iion.io", "name": "Sanjaya Molligoda"}
    result = send_drafts({"company": "iion", "drafts": [GOOD, bad, second]}, dry_run=False)
    assert [s["status"] for s in result["sent"]] == ["sent", "blocked: body still contains a bracket or placeholder (e.g. [name], TODO)", "sent"]
    assert sleeps == [10], f"expected one full-gap sleep before the second real send, got {sleeps}"


def test_sender_dry_run_never_sleeps(monkeypatch, tmp_path):
    """Dry-runs send nothing, so the gap must not slow them down."""
    from backend.app.agents import sender as sender_mod
    from backend.app import memory as mem

    monkeypatch.setattr("backend.app.config.settings.send_gap_seconds", 300)
    monkeypatch.setattr(mem, "DB_PATH", str(tmp_path / "dry.db"))
    sleeps: list[float] = []
    monkeypatch.setattr(sender_mod.time, "sleep", lambda s: sleeps.append(s))
    result = send_drafts({"company": "iion", "drafts": [GOOD, GOOD]}, dry_run=True)
    assert all(s["status"] == "draft (dry-run)" for s in result["sent"])
    assert sleeps == []


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


def test_api_approve_validation_and_404(monkeypatch, tmp_path):
    # Isolated memory: /approve for an unknown company runs the graph,
    # which writes the company row — without this the junk company lands
    # in the real sdr.db on every test run.
    monkeypatch.setattr("backend.app.memory.DB_PATH", str(tmp_path / "approve-404.db"))
    assert client.post("/approve", json={"company": ""}).status_code == 422
    r = client.post("/approve", json={"company": "some company that does not exist xyz"})
    assert r.status_code == 404


def test_api_approve_sends_dry_run_only(monkeypatch, tmp_path):
    # Never sleep 5 minutes between sends in a test.
    monkeypatch.setattr("backend.app.config.settings.send_gap_seconds", 0)
    # Isolated memory: the real sdr.db already holds sent iion mails, and
    # the re-mail guard (409) must trip on those — this test is about the
    # dry-run path, so it runs against an empty database instead.
    monkeypatch.setattr("backend.app.memory.DB_PATH", str(tmp_path / "dry.db"))
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


def test_quality_greeting_needs_real_first_name():
    """Regression: the greeting check was a substring test, so 'Al'
    passed because 'Alchemyst' contains it — a mail that never greets
    the person still cleared the personalisation check."""
    person = {"name": "Al Smith", "title": "CEO", "email": "al@example.com"}
    profile = {"name": "Alchemyst AI", "role": "AI Engineer Intern",
               "summary": "Context layer.", "sources": []}
    body = ("I read about Alchemyst AI and the AI Engineer Intern role. "
            + "I build agents with LangGraph and AuditMind every day. " * 12)
    issues = check_draft({"to": "al@example.com", "subject": "Hello",
                          "body": body}, person, profile)
    assert any("does not greet Al" in i for i in issues)
    greeted = {"to": "al@example.com", "subject": "Hello",
               "body": "Hi Al,\n\n" + body}
    assert not any("does not greet" in i for i in check_draft(greeted, person, profile))


def test_normalize_company_strips_send_filler():
    """'Research acme and send' used to keep 'and send' in the company
    name; the filler list now covers the send/approve phrasings too."""
    from backend.app.tools.search import normalize_company
    assert normalize_company("acme and send") == "Acme"
    assert normalize_company("acme and mail them") == "Acme"
    assert normalize_company("acme and approve") == "Acme"
    assert normalize_company("Research iion and draft mails") == "iion"
