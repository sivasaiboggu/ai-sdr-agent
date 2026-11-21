# Visual proof — v0.9.4 (21 Nov 2026)

Headless-Chrome renders of the real UI against the real backend
(`uvicorn backend.app.api:app :8000`, cleaned `sdr.db`: 1 company, 4
people, 4 ready-to-send drafts) and the production frontend build
(`VITE_API_URL=http://127.0.0.1:8000`, `vite preview :5173`).

| File | Page | What it proves |
| --- | --- | --- |
| `dashboard.png` | Overview (`#/`) | Live data — 1 company in memory, 0 mails sent; 4/4 verified leads |
| `campaigns.png` | Campaigns (`#/campaigns`) | iion card, funnel 4 Leads / 4 Drafts / 0 Sent / 0 Replies, "Nothing sent yet" |
| `leads.png` | Leads (`#/leads`) | 4 live people, scores 95/95/95/80, Verified badges |
| `chat.png` | Agent chat (`#/chat`) | Suggestion chips, approval explainer, online status |
| `drafts.png` | Draft mails (`#/drafts`) | "4 drafts waiting in backend memory" — live drafts with real bodies |
| `replies.png` | Replies (`#/replies`) | Seeded bounce, honestly labelled "Demo data" |

Note: the PNGs in this folder are binary and are NOT pushed to GitHub
(the snapshot-push tool accepts UTF-8 files only). They live in the
local checkout at `docs/visual-proof-0.9.4/`; this README is the
pushable record of what they show.
