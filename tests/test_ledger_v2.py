"""The browser review queue uses immutable draft IDs across edits and approvals."""
import json
import os
from concurrent.futures import ThreadPoolExecutor
from threading import Event

from fastapi.testclient import TestClient
import pytest

from backend.app import api, gmail, memory
from backend.app.config import settings

client = TestClient(api.app)
COMPANY = "Northstar Robotics"


def make_draft(first="Avery", email="avery@example.com"):
    return {
        "to": email,
        "name": f"{first} Rivera",
        "subject": "Work on agent workflows",
        "body": (
            f"Hi {first},\n\nI saw that {COMPANY} is hiring for field operations. "
            "In AuditMind I built a FastAPI service that extracts and checks contract clauses, "
            "with a review step for uncertain results. I would start by mapping where your team "
            "checks an agent's output today and build a small prototype around that step. "
            "Could we talk for fifteen minutes next week?"
        ),
    }


def save(*drafts):
    with memory.connect() as conn:
        return memory.save_drafts(conn, COMPANY, drafts)


def queued():
    return [mail for mail in client.get("/api/campaigns").json()["mails"] if mail["status"] == "draft"]


def approve(*ids):
    return client.post("/api/approve", json={"company": COMPANY, "draft_ids": ids})


def test_chat_saves_drafts_and_streams_real_stage_events(monkeypatch):
    from backend.app.agents import people, research, writer

    monkeypatch.setattr(research, "run", lambda state: {**state, "profile": {"name": COMPANY, "summary": "Warehouse operations."}})
    monkeypatch.setattr(people, "run", lambda state: {**state, "mailable": [make_draft()]})
    monkeypatch.setattr(writer, "run", lambda state: {**state, "drafts": [make_draft()]})
    response = client.post("/api/chat/stream", json={"message": f"Research {COMPANY} and draft mails"})
    assert response.status_code == 200
    data_lines = [line[6:] for line in response.text.splitlines() if line.startswith("data: ")]
    payloads = [json.loads(line) for line in data_lines]
    assert [(payload["key"], payload["state"]) for payload in payloads if "key" in payload] == [
        ("research", "start"), ("research", "done"), ("people", "start"), ("people", "done"),
        ("writer", "start"), ("writer", "done"), ("approval", "done"),
    ]
    assert payloads[-1]["drafts"][0]["id"] == queued()[0]["id"]
    assert queued()[0]["body"] == make_draft()["body"]


@pytest.mark.parametrize("storage", ["sqlite", "postgres"])
def test_edits_replace_the_version_and_approval_sends_exact_reviewed_copy(monkeypatch, storage):
    if storage == "postgres":
        url = os.getenv("SDR_TEST_POSTGRES_URL")
        if not url:
            pytest.skip("Run with an isolated Postgres test database.")
        monkeypatch.setenv("DATABASE_URL", url)
        with memory.connect() as conn:
            conn.execute("DELETE FROM mails WHERE company = ?", (COMPANY,))
            conn.commit()
    first, second = save(make_draft(), make_draft("Nora", "nora@example.com"))
    old_id = first["id"]
    response = client.post(f"/api/drafts/{old_id}", json={"subject": "Reviewed subject", "body": first["body"]})
    assert response.status_code == 200
    fresh_id = response.json()["id"]
    assert [mail["id"] for mail in queued()] == [fresh_id, second["id"]]
    assert save(make_draft())[0]["id"] == fresh_id
    assert approve(old_id, second["id"]).status_code == 409
    assert approve(fresh_id).status_code == 409
    assert client.post(f"/api/drafts/{old_id}", json={"subject": "Old", "body": first["body"]}).status_code == 409

    messages = []
    monkeypatch.setattr(settings, "gmail_send_enabled", True)
    monkeypatch.setattr(settings, "send_gap_seconds", 0)
    monkeypatch.setattr(gmail, "send_mail", lambda to, subject, body, **kwargs: messages.append((to, subject, body)) or "<message>")
    result = approve(fresh_id, second["id"])
    assert result.status_code == 200
    assert messages == [(first["to"], "Reviewed subject", first["body"]), (second["to"], second["subject"], second["body"])]
    assert approve(fresh_id, second["id"]).status_code == 409
    assert not queued()


def test_dry_runs_leave_history_without_a_sent_record(monkeypatch):
    [draft] = save(make_draft())
    monkeypatch.setattr(settings, "gmail_send_enabled", False)
    result = approve(draft["id"])
    assert result.json()["sent"][0]["status"] == "draft (dry-run)"
    assert not queued()
    [mail] = client.get("/api/campaigns").json()["mails"]
    assert mail["status"] == "reviewed (dry-run)" and mail["sent_at"] is None
    [reopened] = save(make_draft())
    assert reopened["id"] != draft["id"]
    assert [mail["id"] for mail in queued()] == [reopened["id"]]


def test_concurrent_approval_and_retry_after_partial_delivery(monkeypatch):
    first, second = save(make_draft(), make_draft("Nora", "nora@example.com"))
    attempted = []
    entered = Event()
    release = Event()

    def send(to, *_args, **_kwargs):
        attempted.append(to)
        if to == second["to"] and attempted.count(to) == 1:
            entered.set()
            assert release.wait(5)
            return "<first>"
        if to == first["to"] and attempted.count(to) == 1:
            raise RuntimeError("SMTP refused")
        return "<retry>"

    monkeypatch.setattr(settings, "gmail_send_enabled", True)
    monkeypatch.setattr(settings, "send_gap_seconds", 0)
    monkeypatch.setattr(gmail, "send_mail", send)
    with ThreadPoolExecutor() as executor:
        running = executor.submit(approve, first["id"], second["id"])
        assert entered.wait(5)
        try:
            another = approve(first["id"], second["id"])
            assert another.status_code == 409
        finally:
            release.set()
        assert running.result().status_code == 200
    assert approve(first["id"]).status_code == 200
    assert attempted == [second["to"], first["to"], first["to"]]


def test_bounces_block_that_address_across_companies(monkeypatch):
    email = "bounced@example.com"
    with memory.connect() as conn:
        memory.save_mail(conn, "Former Company", "Avery Rivera", email, "Earlier note", "Earlier body", "sent")
        memory.record_reply(conn, "Former Company", email, "bounce")
    [draft] = save(make_draft(email=email))
    monkeypatch.setattr(settings, "gmail_send_enabled", True)

    def cannot_send(*_args, **_kwargs):
        raise AssertionError("Email is on the do-not-mail list")

    monkeypatch.setattr(gmail, "send_mail", cannot_send)
    assert "do-not-mail list" in approve(draft["id"]).json()["sent"][0]["status"]
    assert email in {entry["email"] for entry in client.get("/api/coverage").json()["do_not_mail"]}
