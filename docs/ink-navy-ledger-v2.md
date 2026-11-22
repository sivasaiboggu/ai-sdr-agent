# Ink-navy outreach ledger

SDR Agent is a workspace for researching companies, finding verified contacts, reviewing outreach, and tracking replies. The first useful action is to check a company in Discover or open a saved draft from Overview.

## Design system

The signature is a ledger margin with a square registration mark. It anchors the active navigation item, the Overview review desk, and the marked edge of a record. Paper-white reading surfaces and a blue-tinted neutral ramp leave room for the record content. Navy-black and a slate-blue inset distinguish the same surfaces in dark mode.

| Accent option | Rationale |
| --- | --- |
| Ink blue `#24466f` / `#abbfe1` | Selected. It is close to the navy ink and leaves room for success, warning, and error colors. |
| Cobalt `#2248a0` / `#a6baff` | Stronger wayfinding. It draws more attention to secondary links and filters. |
| Slate `#3a5669` / `#b0c7d8` | Quiet on paper. It sits closer to the informational color and would make active records harder to distinguish. |

The accent is concentrated in controls, selected rules, and focus indicators. Text labels accompany semantic colors. Archivo supplies the display and text styles from a self-hosted Latin WOFF2 subset. IBM Plex Mono serves operational labels, addresses, and shortcuts. Display type scales from 38 to 72 px. Body text is 16 px with 1.6 line height and a 68-character reading measure. The 4 px spacing base, 4 px controls, 8 px surfaces, three elevation levels, and Lucide icons are shared across screens.

New views settle in 240 ms. Buttons and links respond in 180 ms. Progress changes use a 320 ms transform. The activity bars enter in 360 ms, and the first reply entries stagger by 36 ms. Effects use transforms or opacity. Reduced-motion mode removes movement and delays.

[CSS variables](../frontend/src/tokens.css) · [Tailwind theme](../frontend/tailwind.config.js) · [Machine-readable tokens](../frontend/src/lib/tokens.json)

## Measured contrast

WCAG 2 ratios use the relative luminance of the sRGB fallbacks used to derive the OKLCH colors. The token tests recalculate the semantic pairs. Control boundaries use the 3:1 minimum.

| Foreground | Background | Light | Dark | Minimum |
| --- | --- | ---: | ---: | ---: |
| `ink` | `paper` | 18.71:1 | 16.09:1 | 4.5:1 |
| `ink` | `canvas` | 17.44:1 | 17.68:1 | 4.5:1 |
| `muted` | `paper` | 11.48:1 | 9.22:1 | 4.5:1 |
| `muted` | `canvas` | 10.71:1 | 10.13:1 | 4.5:1 |
| `muted` | `inset` | 10.14:1 | 7.91:1 | 4.5:1 |
| `onAccent` | `accent` | 9.63:1 | 8.78:1 | 4.5:1 |
| `onAccent` | `accentHover` | 13.44:1 | 10.89:1 | 4.5:1 |
| `accent` | `paper` | 9.63:1 | 9.34:1 | 4.5:1 |
| `accent` | `canvas` | 8.98:1 | 10.27:1 | 4.5:1 |
| `accent` | `inset` | 8.50:1 | 8.02:1 | 4.5:1 |
| `inverse` | `inversePaper` | 17.04:1 | 14.09:1 | 4.5:1 |
| `success` | `paper` | 7.15:1 | 10.41:1 | 4.5:1 |
| `warning` | `paper` | 7.57:1 | 10.68:1 | 4.5:1 |
| `danger` | `paper` | 7.25:1 | 9.22:1 | 4.5:1 |
| `info` | `paper` | 7.35:1 | 10.11:1 | 4.5:1 |
| `success` | `canvas` | 6.67:1 | 11.44:1 | 4.5:1 |
| `warning` | `canvas` | 7.06:1 | 11.73:1 | 4.5:1 |
| `danger` | `canvas` | 6.76:1 | 10.13:1 | 4.5:1 |
| `info` | `canvas` | 6.85:1 | 11.11:1 | 4.5:1 |
| `edge` | `paper` | 4.20:1 | 4.70:1 | 3.0:1 |
| `edge` | `canvas` | 3.92:1 | 5.16:1 | 3.0:1 |
| `edge` | `inset` | 3.71:1 | 4.03:1 | 3.0:1 |
| `disabled` | `inset` | 10.14:1 | 7.91:1 | 4.5:1 |
| `neutral-0` | `neutral-900` | 17.04:1 | 17.04:1 | 4.5:1 |
| `neutral-300` | `neutral-900` | 9.65:1 | 9.65:1 | 4.5:1 |
| `neutral-500` | `neutral-900` | 4.05:1 | 4.05:1 | 3.0:1 |

## Screen plan

| Route | Layout and behavior |
| --- | --- |
| Overview `/#/` | A navy review desk directs the operator to the next batch. A reply inbox, a ruled totals strip, an activity chart with a counts table, and a desktop pipeline show what has already happened. |
| Discover `/#/discover` | Check coverage in a single inset form, then scan the job-board index beside the selected source. Live coverage uses saved data. A new company hands off to Chat. |
| Campaigns `/#/campaigns` | A company index puts status and outreach totals together. The review filter shows unfinished work and direct links carry the company into Leads, Drafts, and Replies. |
| Leads `/#/leads` | Verification counts follow the current company and search. Verification and name or score ordering survive reload through the URL. A lead drawer preserves contact and draft context. |
| Draft mails `/#/drafts` | A compact recipient index sits beside a letter-width preview with an inline editor. The footer lists the approval scope and Gmail mode. A saved edit receives a new ID and invalidates any stale approval. |
| Replies `/#/replies` | The log shows the classification and next step together. Company and classification filters narrow the list while the breakdown retains the company-level context. |
| Agent chat `/#/chat` | The long-form transcript has a dedicated composer and a compact rail for real research, lead, and writing progress. Saved draft links open exact records and navigation keeps the current conversation. |
| Unknown route | The recovery page provides a route back to Overview and Chat. The workspace also catches rendering errors. |

## Reference review

- **21st** informed the lead table and verification controls. The row stacks at phone widths so name, address, verification, and score remain together. [Table library](https://21st.dev/community/components/s/table)
- **Mobbin** provided inbox and multistep flow patterns. The draft index, letter preview, and approval scope make recipient selection and review distinct actions. [Web flows](https://mobbin.com/explore/web/flows)
- **Refero Styles** informed the contrast between a quiet paper surface and the stronger review area, along with restrained hairlines and a clear reading hierarchy. [Seline Analytics](https://styles.refero.design/style/7967c6d9-e50c-42b5-b4d1-74003ba41781) · [Ramp](https://styles.refero.design/style/b38702a0-75ab-474c-9106-00b624535825)
- **React Bits** informed the way fresh results appear as a short entry motion. **Magic UI** informed the progress bar and the brief stagger on reply entries. Progress responds to backend events. [Animated List](https://reactbits.dev/components/animated-list) · [Scroll Progress](https://magicui.design/docs/components/scroll-progress) · [Animated List](https://magicui.design/docs/components/animated-list)
- **Uiverse** informed the compact press response on native action controls. **Inspora** informed the use of stage markers and totals for pipeline scanning. Its bare domain was unreachable and the `www` site worked. [Buttons](https://uiverse.io/buttons) · [Funnel study](https://www.inspora.design/posts/patient-funnel-visualization)
- **Designeer** was unreachable on both its bare and `www` domains. [Designeer](https://designeer.xyz)

## Engineering

React, TypeScript, Vite, Tailwind, and the existing FastAPI endpoints fit the single-operator workflow and static deployment. Existing databases gain a mail lookup index and a delivery-claim table on connection. Research saves actual drafts. Editing supersedes an existing record while preserving its history. Approval claims the IDs visible in review, checks them again on the server, and delivers that saved copy. A concurrent approval cannot claim the same queue. Failed attempts remain eligible for review and retry. Both stored bounces and the address block list reach the sender.

Chat streams progress from the actual graph stages, then returns links to persisted drafts. A connection failure after the request starts leaves the original message available for an explicit retry. An older API that does not support streaming still has a plain HTTP path. Browser verification uses synthetic data and mocked SMTP. Deployed integrations can be checked in dry-run mode.

## Local verification

Use Node 20.19+ or 22.12+ and the package lock. Use `RESUME_PATH` for a valid local test PDF. Point `SDR_TEST_POSTGRES_URL` at an isolated test database to include the PostgreSQL cases. Chromium may come from Playwright or from a local executable configured through `CHROME_BIN`. See the tracked environment examples for API and Gmail variables.

```sh
python -m pip install -r backend/requirements.txt
GMAIL_SEND_ENABLED=false python -m pytest tests/ -q

cd frontend
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

The [verification record](./ink-navy-ledger-v2-proof/verification.json) records the test counts and Lighthouse metrics. The proof runner starts from production assets and a deterministic fixture. Use the same fixture for both revisions and serve their respective `dist` directories. The browser audit checks the rendered routes in both themes at 320, 390, 768, and 1440 px and covers the lead drawer, command palette, and mobile navigation.

```sh
node e2e/serve-proof.mjs dist 4185
CHROME_BIN=/usr/bin/chromium node e2e/proof.mjs http://127.0.0.1:4185 after ../proof audit
CHROME_PATH=/usr/bin/chromium npx lighthouse@13.6.0 'http://127.0.0.1:4185/#/' --output=json
```

## Launch checks

- [ ] Build with the deployed API origin and confirm the existing authenticated access boundary for the workspace.
- [ ] Run one research, edit, and approval cycle with production sending disabled.
- [ ] Verify the Gmail mode, résumé attachment path, and send gap before enabling real delivery.
- [ ] Measure the hosted mobile experience and verify the public share image.

If delivery stops after an SMTP attempt but before the result is recorded, the claim remains in the database. Reconcile it against Gmail before retrying. Long-running delivery still uses a synchronous approval request, so the server timeout needs to cover the configured gap and batch size.

## Follow-up ideas

1. Move multi-recipient delivery into a durable job with per-recipient progress.
2. Add a record for manual delivery reconciliation.
3. Show research sources beside draft copy.
4. Link tracked replies to the Gmail thread.
5. Add due dates to follow-up filters.
6. Add a read-only archive of reviewed drafts.
7. Add date ranges to the activity chart.
8. Surface suppression reasons in individual lead records.
9. Capture an approved visual baseline in CI.
10. Move visible text into locale catalogs when a second language is needed.
