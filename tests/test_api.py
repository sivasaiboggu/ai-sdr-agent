"""Tests — API surface a deployment depends on: the /api prefix the
dashboard calls, CORS for the deployed frontend, and /health.
Regression tests: before v0.5.0 the dashboard's /api/chat, /api/campaigns
and /api/approve calls all 404'd (routes were bare-only), and a browser
on any other origin got its preflight rejected (no CORS middleware).
"""
from fastapi.testclient import TestClient

from backend.app.api import app

client = TestClient(app, raise_server_exceptions=False)


def test_health_and_api_health():
    for path in ("/health", "/api/health"):
        r = client.get(path)
        assert r.status_code == 200, path
        body = r.json()
        assert body["status"] == "ok"
        assert body["version"]
        assert body["database"] in ("sqlite", "postgres")
        # Health must not leak secrets or keys.
        assert "key" not in str(body).lower()
        assert "password" not in str(body).lower()
        # The dashboard's Gmail pill reads this boolean — it must be a
        # plain bool, never the credential itself.
        assert isinstance(body["gmail_configured"], bool)
        assert isinstance(body["gmail_send_enabled"], bool)


def test_api_prefix_mirrors_bare_routes():
    # No company in the message -> no agent run, just the help reply.
    for path in ("/chat", "/api/chat"):
        r = client.post(path, json={"message": "hello"})
        assert r.status_code == 200, path
        assert r.json()["drafts"] == []
    for path in ("/campaigns", "/api/campaigns"):
        r = client.get(path)
        assert r.status_code == 200, path
        assert "companies" in r.json() and "mails" in r.json()


def test_chat_validation():
    assert client.post("/api/chat", json={"message": ""}).status_code == 422
    assert client.post("/api/chat", json={"message": "x" * 1001}).status_code == 422


def test_parse_company_strips_trailing_action_phrases():
    """Regression: the chat suggestion chips read 'Research iion and draft
    mails', and the old parser returned the whole tail as the company —
    'iion and draft mails' — which the people agent then saved verbatim,
    so those leads matched no campaign. The company name comes back clean."""
    from backend.app.api import _parse_company

    assert _parse_company("Research iion and draft mails") == "iion"
    assert _parse_company("Research Alchemyst AI and draft mails") == "Alchemyst AI"
    assert _parse_company("Research Drivetrain and draft mail") == "Drivetrain"
    assert _parse_company("draft mails for Drivetrain") == "Drivetrain"
    assert _parse_company("mail founders of Discover Dollar") == "Discover Dollar"
    assert _parse_company("Research Acme please") == "Acme"
    # A real 'and' inside a company name survives the strip.
    assert _parse_company("Research Smith and Co and draft mails") == "Smith and Co"
    assert _parse_company("hello there") is None
    assert _parse_company("Research ") is None


def test_cors_allows_configured_dev_origin():
    r = client.options(
        "/api/chat",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_people_endpoint_lists_saved_people(monkeypatch, tmp_path):
    """GET /people is what the Leads page renders live; it must return
    the people the agent saved, verified and unverified."""
    from backend.app import memory as mem

    monkeypatch.setattr(mem, "DB_PATH", str(tmp_path / "people.db"))
    conn = mem.connect()
    try:
        mem.save_person(conn, "iion", "Wout van Damme", "Co-Founder",
                        "wout@iion.io", True, 100, "")
        mem.save_person(conn, "iion", "No Mail", "Advisor", "", False, 50, "")
    finally:
        conn.close()
    for path in ("/people", "/api/people"):
        r = client.get(path)
        assert r.status_code == 200, path
        people = r.json()["people"]
        assert len(people) == 2
        assert people[0]["name"] == "Wout van Damme"
        assert people[0]["verified"] is True
        assert people[1]["verified"] is False


def test_campaigns_mails_carry_reply_class_and_sent_at(monkeypatch, tmp_path):
    """The dashboard counts real replies from /campaigns, so each mail
    must carry its reply_class and sent_at (null when never sent)."""
    from backend.app import memory as mem

    monkeypatch.setattr(mem, "DB_PATH", str(tmp_path / "campaigns.db"))
    conn = mem.connect()
    try:
        mem.save_mail(conn, "iion", "Wout", "wout@iion.io", "Hi",
                      "body", "sent", "<id-1>")
        mem.save_mail(conn, "iion", "Sanjaya", "sanjaya@iion.io", "Hi",
                      "body", "draft (dry-run)", None)
    finally:
        conn.close()
    r = client.get("/api/campaigns")
    assert r.status_code == 200
    mails = r.json()["mails"]
    assert len(mails) == 2
    assert mails[0]["status"] == "draft (dry-run)"
    assert mails[0]["sent_at"] is None and mails[0]["reply_class"] is None
    assert mails[1]["status"] == "sent"
    assert isinstance(mails[1]["sent_at"], float)
    # The Drafts page renders live drafts, so it needs the body too.
    assert mails[0]["body"] == "body" and mails[1]["body"] == "body"


def test_unverified_people_do_not_overwrite_each_other(monkeypatch, tmp_path):
    """Regression: people without an email were stored as '', which
    collided on UNIQUE(company, email) — only the last unverified
    person per company survived, the rest were silently dropped."""
    from backend.app import memory as mem

    monkeypatch.setattr(mem, "DB_PATH", str(tmp_path / "people-null.db"))
    conn = mem.connect()
    try:
        mem.save_person(conn, "Drivetrain", "Saurav Bhagat", "Co-Founder", "", False, 100, "")
        mem.save_person(conn, "Drivetrain", "Alok Goel", "Co-founder and CEO/CFO", "", False, 100, "")
        names = sorted(r[0] for r in conn.execute(
            "SELECT name FROM people WHERE company = 'Drivetrain'").fetchall())
        assert names == ["Alok Goel", "Saurav Bhagat"]
        # Re-saving the same unverified person replaces instead of
        # duplicating the row on every run.
        mem.save_person(conn, "Drivetrain", "Saurav Bhagat", "Co-Founder", "", False, 100, "")
        assert conn.execute(
            "SELECT COUNT(*) FROM people WHERE company = 'Drivetrain'").fetchone()[0] == 2
    finally:
        conn.close()
