# AI SDR / Lead Research Agent

A personal agent you chat with in plain language — like talking to Muse.

> "Research iion, find the founders, draft mails, send with a 5-minute gap."

It plans, researches, finds people, writes personalised mails, **asks for
approval before sending** (human-in-the-loop, with an always-allow option),
sends with a 5-minute gap, tracks replies, and remembers everything.

## What makes it unique

1. **Conversational, chat-first** — a LangGraph state machine with memory,
   not a script. You talk to it; it uses tools.
2. **Cited research** — every fact in a mail comes from a real source
   (company site, careers page, LinkedIn, hiring post). No invented facts.
3. **Verified emails only** — Apollo + LinkedIn, verified status required.
   An address is never guessed. People without a verified email are listed
   but never mailed.
4. **Personalised writing** — hook from real research, proof from the
   user's real projects (HireMind AI, AuditMind, SecureFlow, Whispry MERN).
   No `[bracket]` ever survives — the Writer rejects such a mail.
5. **Sender + Tracker** — Gmail, 5-minute gap, PDF resume attached,
   reply classification (interested / not now / bounce / out of office),
   follow-up in 4–5 days.
6. **Self-improving memory** — SQLite (Postgres optional) stores companies,
   people, mails and replies. Hooks/subjects that got a reply are recorded
   and reused.
7. **Dashboard** — React + TypeScript + Vite, companies / leads / mails /
   replies, live agent progress via WebSockets.
8. **WhatsApp bot** — chat with the agent on WhatsApp, free Cloud API /
   Twilio sandbox. Same agent, same approval gate: reply YES to send.

## Free tools only — rich, no paid API required

| Need | Free path used | Paid? |
| --- | --- | --- |
| LLM | Gemini free tier, mock fallback if no key | No — optional |
| Web search | DuckDuckGo HTML (free) | No |
| People / emails | Apollo free credits + verified seed data | No — optional |
| Email | Gmail (free) | No |
| Database | SQLite (free, default); Postgres optional | No |
| WhatsApp | Meta Cloud API free tier / Twilio sandbox | No |
| Hosting (demo) | Vercel / Render free tier | No |

Every paid integration has a free/mock fallback and is marked optional.

## WhatsApp — use it like a bot (free)

The agent lives on WhatsApp too. Same flows, same human-in-the-loop:
`start / help`, `research <company>`, `draft mails`, `YES` / `NO`,
`status`, `replies`.

### Option A — Meta WhatsApp Cloud API (free tier, recommended)
1. Go to developers.facebook.com → create an app → WhatsApp → API Setup
   (free, no card). Copy the **temporary/permanent token** and **phone number id**.
2. In `.env`: set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`,
   `WHATSAPP_VERIFY_TOKEN=sdr-agent-verify`.
3. Run the API (`uvicorn backend.app.api:app --port 8000`) and expose it
   (e.g. `ngrok http 8000` — free).
4. In Meta → WhatsApp → Configuration, set the webhook URL to
   `https://<your-ngrok>/whatsapp/webhook` and the verify token to
   `sdr-agent-verify`. Subscribe to `messages`.
5. Send a WhatsApp message to your test number: `research iion`.

### Option B — Twilio WhatsApp Sandbox (free, fastest to test)
1. twilio.com/console (free trial) → Messaging → Try WhatsApp → join the
   sandbox with the code shown (send it from your phone to +1 415-523-8886).
2. In `.env`: set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.
3. In Twilio → Sandbox settings, set "When a message comes in" to
   `https://<your-ngrok>/whatsapp/webhook`.
4. Message the sandbox number from your phone: `research iion`.

### Option C — No WhatsApp account at all (free local test)
```bash
curl -X POST http://localhost:8000/whatsapp/test \
  -H 'Content-Type: application/json' \
  -d '{"from_number": "+919573719115", "text": "research iion"}'
```

### Demo conversation (WhatsApp)
```
You:  research iion
Bot:  🔍 iion — Self-serve ad platform for gaming (immersiion)...
      👥 People (verified only):
      • Sanjaya Molligoda — Co-Founder — sanjaya@iion.io
      • Wout van Damme — Co-Founder — wout@iion.io
      ✍️ 4 draft mails ready. Reply 'draft mails' to see them, or 'YES' to send.
You:  draft mails
Bot:  To: Wout van Damme <wout@iion.io>
      Subject: I build autonomous agents with LangGraph...
      [full mail]
      Reply YES to send (5-min gap), or NO to change something.
You:  YES
Bot:  ✅ Sending 4 mails, one every 5 minutes, PDF attached...
You:  status
Bot:  📊 Status — Companies: iion … Mails: …
```

### 2-minute demo flow
0:00 — WhatsApp: `research iion` → profile + verified people back.
0:30 — `draft mails` → read a personalised mail.
1:00 — `YES` → agent sends, 5-min gap, PDF attached.
1:30 — `status` → campaign in the dashboard too.
2:00 — `replies` → reply classes + follow-ups due.

## Architecture

```
User (chat)
  |
  v
FastAPI  ──>  LangGraph state machine
                research ──> people ──> writer ──> [HUMAN APPROVAL] ──> sender ──> tracker
                  |            |           |                              |
              web search    Apollo    Gemini / template              Gmail (5-min gap)
                  |            |           |                              |
                  └────────────┴───────────┴────── SQLite / Postgres ─────┘
  |
  v
React dashboard (Vite) — live progress via WebSocket
```

## Quick start

```bash
cp .env.example .env        # add GEMINI_API_KEY / APOLLO_API_KEY if you have them
pip install -r backend/requirements.txt
python -m backend.app.main "Research iion and draft mails"
```

Mock mode works with **no API keys**: researched profiles for iion,
Alchemyst AI, Discover Dollar and Drivetrain are seeded from real research,
and verified Apollo emails are seeded for those companies.

Run the API:

```bash
uvicorn backend.app.api:app --reload --port 8000
# POST /chat {"message": "Research iion and draft mails"}
# POST /approve {"company": "iion", "approve": true}
# GET  /campaigns
```

Run the dashboard:

```bash
cd frontend && npm install && npm run dev   # http://localhost:5173
```

The dashboard is a production-style SaaS UI (Tailwind CSS + shadcn-style
components, Framer Motion, Lucide icons, Recharts, Inter, dark/light theme):
Overview with activity charts and reply breakdown, Campaigns, verified Leads
table with lead scores, Draft mails with expandable approval cards, Replies
with classifications and next steps, and Agent chat with live pipeline steps.
It talks to the same FastAPI backend (`/api/chat`, `/api/campaigns`) and falls
back to seeded demo data when the API is not running.

Run tests:

```bash
pytest tests/ -q
```

Docker:

```bash
docker compose up --build
```

## Configuration

| Variable | Meaning |
| --- | --- |
| `GEMINI_API_KEY` | Optional. Polishes mail wording (never adds facts). |
| `APOLLO_API_KEY` | Optional. Live Apollo verified-email lookup. |
| `GMAIL_SEND_ENABLED` | `false` by default (dry-run). `true` only to send real mail. |
| `SEND_GAP_SECONDS` | 300 by default — 5 minutes between cold mails. |
| `DATABASE_URL` | `sqlite:///./sdr.db` by default; Postgres URL works too. |
| `RESUME_PATH` | PDF attached to every mail. |

## Demo flow

1. `python -m backend.app.main "Research iion and draft mails"`
2. Read the company profile, the verified people (scored: founder > CTO > HR),
   and the draft mails.
3. Approve — the Sender sends them one every 5 minutes, with the PDF resume.
4. Replies come back classified; interested replies teach the Writer what worked.

## Screenshots

_Screenshots of the dashboard will be added after the first live run._

## Safety

- Nothing is sent without approval (or `GMAIL_SEND_ENABLED=true` + `--send`).
- No email is ever guessed or invented.
- No API key is ever committed — use `.env`, see `.env.example`.
