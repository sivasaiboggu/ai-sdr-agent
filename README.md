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
   No `[bracket]` ever survives — the Writer rejects such a mail. Every
   draft passes a quality gate (`backend/app/quality.py`): valid verified
   email, subject present, greeted by first name, personalised hook
   (company or role mentioned), proof from a real project, 60–300 words.
   The Sender re-checks every draft and **blocks** any that fail instead
   of mailing it.
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
pytest tests/ -q   # 29 tests: writer quality gate, lead scoring, sender
                   # guard, approval flow, WhatsApp handler, API validation,
                   # /api prefix parity, CORS preflight
```

## Deployment

### Frontend — Vercel (recommended)

1. In Vercel, create a project from this repo with **Root Directory `frontend`**
   (framework preset: Vite). `frontend/vercel.json` adds the SPA fallback
   rewrite to `/index.html`.
2. Set the environment variable **`VITE_API_URL`** to the deployed backend
   origin, e.g. `https://ai-sdr-agent-api.onrender.com` — no trailing slash,
   no `/api` suffix. It is baked into the JS bundle at build time, so
   changing it needs a redeploy.
3. Deploy. If `VITE_API_URL` is unset, the dashboard calls `/api/*` on its
   own origin, which Vercel does not proxy to the backend — the Chat page
   will show "Backend offline" and the dashboard falls back to labelled
   demo data.

### Backend — Render / Railway / Fly (or any host with a persistent disk)

1. Start command: `uvicorn backend.app.api:app --host 0.0.0.0 --port $PORT`
   (use the host's `PORT`; locally it is `8000`).
2. Set env vars from `.env.example`: `GEMINI_API_KEY` / `APOLLO_API_KEY`
   (optional), `GMAIL_SEND_ENABLED=false` (dry-run default), `DATABASE_URL`,
   `SEND_GAP_SECONDS=300`, `RESUME_PATH`.
3. **Set `CORS_ORIGINS` to include the Vercel frontend origin**, e.g.
   `CORS_ORIGINS=https://ai-sdr-agent.vercel.app,http://localhost:5173`.
   Without this, browsers block every API call from the deployed dashboard.
4. Health check: `GET /health` (or `/api/health`) — returns `{"status":
   "ok", ...}` plus which optional integrations are configured. Point the
   host's health check at it.
5. Storage is SQLite (`./sdr.db`); give the backend a persistent volume
   and back the file up. **Postgres is not wired up yet** — `DATABASE_URL`
   is read into config but `memory.py` always uses the local SQLite file,
   so a Postgres URL would be silently ignored. Deploy single-instance
   with SQLite until that is implemented.
6. Real Gmail sending is done by this backend since v0.6
   (`backend/app/gmail.py`, SMTP): it needs `GMAIL_SEND_ENABLED=true`
   AND a Gmail app password (`GMAIL_APP_PASSWORD` in `.env`). Without
   the app password, sends are logged as failed and nothing goes out.

### Docker (local demo only)

```bash
docker compose up --build   # backend :8000, frontend :5173
```

Compose builds both images (see `backend/Dockerfile`,
`frontend/Dockerfile`) and waits for the backend's `/health` before
starting the frontend. Note: these Dockerfiles were added without a
Docker daemon available to build-test them — run the command once on a
machine with Docker before relying on them.

## v0.7 — what changed (20 Nov 2026)

- **Streaming chat** — new `POST /chat/stream` (SSE): the Agent Chat page
  now shows live pipeline steps driven by real `step` events, then the
  reply types out word by word with a caret, instead of waiting for the
  whole run. If the stream fails before the first token, the page falls
  back to plain `POST /chat`. Sending behaviour is unchanged: drafts
  only, dry-run default, 5-minute gap, quality gate, app password.
- **⌘K command palette** — jump to any page, start research on a known
  company (queued for Agent chat), or toggle the theme, all keyboard-first
  (↑↓ to move, Enter to run, Esc to close). `/` focuses the top search box.
- **Lead detail drawer** — click any lead to open a slide-over with their
  contact details, copy-email, LinkedIn link, lead score with a plain-word
  explanation of why they rank there, the draft mail written for them,
  and the other leads at the same company. Esc closes it.
- **Campaign pipeline funnel** — each campaign card now shows Leads →
  Drafts → Sent → Replies as a funnel, counted from the campaign record
  and the drafts actually written — no invented numbers.
- **Tests** — 39 tests (was 35): new `tests/test_chat_stream.py` covers
  the SSE step/token/done sequence, the token stream reassembling into
  exactly the done reply, the no-company help reply, and error events.

## v0.6 — what changed (20 Nov 2026)

- **The backend sends real Gmail itself** — `backend/app/gmail.py` sends
  over Gmail SMTP with the PDF resume attached. Real sends need BOTH
  `GMAIL_SEND_ENABLED=true` and a Gmail app password (`GMAIL_APP_PASSWORD`
  in `.env`; Google Account > Security > 2-Step Verification > App
  passwords — the normal Google password does not work with SMTP).
  Dry-run is still the default, and POST /approve with sending disabled
  stays a dry-run, so nothing can be sent by accident. A failed send is
  logged as `failed: <reason>` and the batch continues; a draft that
  fails the quality gate is still blocked and never reaches SMTP.
  The 5-minute gap and quality gate are unchanged.
- **Dashboard honesty** — a failed or blocked approval no longer shows
  the draft as Approved, and the toast says plainly when an approval was
  dry-run only.
- **Tests** — 35 tests (was 29): new `tests/test_gmail.py` covers real
  sending (mocked SMTP), the missing-password case, failure logging, the
  blocked-draft guard, and the flag-off-never-sends safety property.

## v0.5 — what changed (20 Nov 2026)

- **API prefix + CORS** — every route is served under `/api` too
  (`/api/chat`, `/api/campaigns`, `/api/approve`, `/api/health`); the
  dashboard's calls used to 404. `CORSMiddleware` from `CORS_ORIGINS`
  lets the Vercel frontend call the backend cross-origin.
- **Env handling** — `.env` is now actually loaded (`load_dotenv` in
  `config.py`); `.env.example` documents `CORS_ORIGINS` and `PORT` and
  notes the Postgres limitation. Frontend reads `VITE_API_URL`
  (`frontend/.env.example`); the dev proxy strips the `/api` prefix.
- **Honest dashboard** — seeded demo data is labelled as such on every
  page; the invented "interested" reply and the hardcoded "50% reply
  rate" are gone; stats and the reply donut are computed from logged
  data; Chat shows a real `/health`-based online/offline state; a failed
  approval no longer shows the draft as approved.
- **Deployment** — `frontend/vercel.json` (SPA rewrite), Dockerfiles +
  fixed `docker-compose.yml`, and this Deployment section.
- **Tests** — 29 tests (was 25): new `tests/test_api.py` covers the
  `/api` prefix, validation and the CORS preflight.

## v0.4 — what changed (20 Nov 2026)

- **Draft quality gate** — `backend/app/quality.py` checks every mail
  (no brackets/placeholders, valid email, hook + proof present, 60–300
  words); the Writer raises on a bad draft and only keeps a Gemini polish
  that still passes; the Sender blocks failing drafts as a last defence.
- **Lead scoring** — finer tiers (CEO/founder 100, co-founder 95, CTO/CPO
  90, COO/CFO 85, HR/hiring 80, VP/director 75, other 50); Apollo results
  deduped by email, skipped when name/email missing, non-200 rejected.
- **API hardening** — pydantic validation on `/chat`, `/approve`,
  `/whatsapp/test` (empty/over-long input → 422); agent failures → 502;
  `/approve` → 404 when there are no drafts; graph falls back to the
  sequential pipeline if LangGraph fails, and always returns complete
  state; `SEND_GAP_SECONDS` typos no longer crash startup.
- **Dashboard polish** — loading skeletons on Overview, shared
  EmptyState/Alert components on every page, toast tones (success/error/
  info), Drafts approval calls the real `/api/approve` and says plainly
  when the backend is unreachable, Chat shows a persistent error banner
  when the API is down, ⌘K focuses search.
- **Safety unchanged** — dry-run by default, nothing sends without
  approval, verified emails only, no keys committed.

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
| `DATABASE_URL` | `sqlite:///./sdr.db` by default. A Postgres URL is accepted by config but **not wired to storage yet** (see note below). |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call the API (default `http://localhost:5173,http://localhost:3000`). Add the deployed frontend origin. |
| `PORT` | Port the API listens on (`8000` locally; hosts like Render set it). |
| `VITE_API_URL` | Frontend only (`frontend/.env.example`): deployed backend origin, e.g. `https://ai-sdr-agent-api.onrender.com`. Unset = relative `/api/*` (dev proxy only). |

> Postgres note: `DATABASE_URL` is read into config, but storage currently
> always uses the local SQLite file — a Postgres URL is silently ignored.
> See Deployment.
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
