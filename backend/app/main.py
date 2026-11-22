"""CLI — the fastest way to see the agent work end-to-end.
Usage:
  python -m backend.app.main "Research iion and draft mails"
  python -m backend.app.main "Research Alchemyst AI" --send --no-dry-run   # real sends, only with approval
By default it drafts only (human-in-the-loop) and runs in dry-run mode.
"""
import argparse
import json
import sys
from backend.app.graph import run_campaign

def main():
    parser = argparse.ArgumentParser(description="AI SDR Agent — chat-first lead research")
    parser.add_argument("message", nargs="?", default="Research iion and draft mails")
    parser.add_argument("--send", action="store_true", help="Send drafts after approval (default: draft only)")
    parser.add_argument("--no-dry-run", action="store_true", help="Actually send (requires GMAIL_SEND_ENABLED=true)")
    args = parser.parse_args()

    msg = args.message.lower()
    company = "iion"
    for token in ["research ", "draft mails for ", "find leads at ", "mail founders of "]:
        if token in msg:
            idx = msg.find(token)
            rest = args.message[idx + len(token):].strip()
            if rest:
                company = rest
            break

    print(f"AI SDR Agent — researching {company} ...")
    result = run_campaign(company, approve=args.send, dry_run=not args.no_dry_run)
    print("\n--- Company ---")
    print(json.dumps(result["profile"], indent=2))
    print(f"\n--- People ({len(result.get('mailable', []))} mailable, verified only) ---")
    for p in result.get("mailable", []):
        print(f"  {p['name']} — {p['title']} — {p['email']} (score {p['score']})")
    print(f"\n--- Draft mails ({len(result.get('drafts', []))}) ---")
    for d in result.get("drafts", []):
        print(f"\nTo: {d['name']} <{d['to']}>\nSubject: {d['subject']}\n{d['body']}")
    if result.get("sent"):
        print(f"\n--- Sent ({len(result['sent'])}) ---")
        for s in result["sent"]:
            print(f"  {s['to']}: {s['status']} {s.get('message_id') or ''}")
    else:
        print("\n[Human-in-the-loop] Drafts only — nothing was sent. Re-run with --send to send with a 5-minute gap.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
