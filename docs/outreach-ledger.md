# Outreach ledger

SDR Agent helps one operator research companies, find verified contacts, review drafts, and keep track of replies. The first task is to start research or pick up a waiting draft. The workspace uses React, TypeScript, Vite, and the existing FastAPI contracts. That keeps the static build and saved records usable.

## Design system

An ink rule with a short copper tab marks the place to act. It appears in the navigation, the Overview review queue, the selected draft and board, and the pipeline. Hairlines divide records. Overview places the next action beside recent replies and spans the width with a single totals strip.

| Accent option | Reason |
| --- | --- |
| Copper `#963a20` / `#f0a487` | Selected. It reads clearly on warm paper and dark ink, and leaves the semantic hues distinct. |
| Petrol `#235b70` / `#8abacf` | Good on both grounds. Close to the information hue. |
| Mulberry `#703654` / `#dda1be` | Strong in both themes. Close to the error hue on light surfaces. |

Copper marks primary controls, links, focus, and the active position in a record. Large surfaces use the 12-step warm neutral ramp. Green, ochre, red, and blue convey success, warning, error, and information alongside text.

Instrument Sans supplies display and text. Headings run from 44 to 80 px with tight tracking. Body copy starts at 16 px with 1.6 line height and a 68-character measure. IBM Plex Mono serves email addresses, shortcuts, and operational labels. Both ship as self-hosted Latin WOFF2 subsets. Other scripts use system fallbacks.

Spacing uses a 4 px base. Controls group at 8 and 12 px, surfaces use 16 to 24 px of padding, and work areas use 24 to 48 px. Controls use 4 px corners and the palette uses 8 px corners. The three shadow levels serve primary controls, feedback toasts, and modal surfaces. The canvas has a low-opacity grain. Buttons have a short press transition. Dialogs fade in with a small translation. Reduced-motion mode skips those transitions. Loading uses labeled, static skeletons.

See [tokens.json](../frontend/src/lib/tokens.json), [CSS variables](../frontend/src/tokens.css), and the [Tailwind theme](../frontend/tailwind.config.js).

### Measured contrast

The ratios use WCAG 2 relative luminance from the shipped sRGB fallbacks. The frontend suite recalculates each pair. The 3:1 rows serve control boundaries.

| Foreground | Background | Light | Dark | Minimum |
| --- | --- | ---: | ---: | ---: |
| `ink` | `paper` | 17.33:1 | 15.53:1 | 4.5:1 |
| `ink` | `canvas` | 16.02:1 | 17.33:1 | 4.5:1 |
| `muted` | `paper` | 6.21:1 | 8.43:1 | 4.5:1 |
| `muted` | `canvas` | 5.74:1 | 9.41:1 | 4.5:1 |
| `muted` | `inset` | 5.21:1 | 6.81:1 | 4.5:1 |
| `onAccent` | `accent` | 6.95:1 | 8.07:1 | 4.5:1 |
| `onAccent` | `accentHover` | 9.56:1 | 10.10:1 | 4.5:1 |
| `accent` | `paper` | 6.95:1 | 7.92:1 | 4.5:1 |
| `accent` | `canvas` | 6.43:1 | 8.84:1 | 4.5:1 |
| `accent` | `inset` | 5.83:1 | 6.39:1 | 4.5:1 |
| `inverse` | `inversePaper` | 15.53:1 | 14.53:1 | 4.5:1 |
| `success` | `paper` | 7.01:1 | 8.55:1 | 4.5:1 |
| `warning` | `paper` | 6.59:1 | 8.98:1 | 4.5:1 |
| `danger` | `paper` | 6.62:1 | 7.82:1 | 4.5:1 |
| `info` | `paper` | 7.25:1 | 8.39:1 | 4.5:1 |
| `success` | `canvas` | 6.48:1 | 9.54:1 | 4.5:1 |
| `warning` | `canvas` | 6.09:1 | 10.02:1 | 4.5:1 |
| `danger` | `canvas` | 6.12:1 | 8.73:1 | 4.5:1 |
| `info` | `canvas` | 6.71:1 | 9.36:1 | 4.5:1 |
| `edge` | `paper` | 4.11:1 | 3.78:1 | 3.0:1 |
| `edge` | `canvas` | 3.80:1 | 4.22:1 | 3.0:1 |
| `edge` | `inset` | 3.45:1 | 3.05:1 | 3.0:1 |
| `disabled` | `inset` | 5.21:1 | 6.81:1 | 4.5:1 |

## Screen plan and implementation

| Route | Layout and behavior |
| --- | --- |
| `/#/` Overview | One review priority, a narrow reply log, and a ruled totals strip. Daily activity uses seven days of stored records and offers a counts table. The pipeline marks the approval step. |
| `/#/discover` Discover | Company coverage comes first. A board index gives the selected source its own reading area. Cached status, the do-not-mail list, and the handoff to Chat stay visible in context. |
| `/#/campaigns` Campaigns | A record pairs the company summary and actions with lead, draft, send, and reply counts. The company carries through to Leads or Drafts. |
| `/#/leads` Leads | Verification and company filters sit above a table. Narrow screens stack fields within each row. A lead opens a detail drawer with contact, score, draft, and peers. |
| `/#/drafts` Draft mails | A recipient queue sits beside a letter-width preview. The footer explains company-wide approval. It offers the rewrite flow and reports sends, dry runs, or errors. |
| `/#/replies` Replies | A ruled log shows sender, classification, timestamp when available, and next action. A distribution rail shows counts from the same records. |
| `/#/chat` Agent chat | The transcript and composer sit beside prompts, progress, and the current run’s drafts. A suggested company starts research from an empty workspace. Discover and Drafts can hand requests to Chat. |
| Unknown route or rendering error | The 404 links to Overview and Chat. A workspace rendering error offers a reload and a return to Overview. |

**Primary flow** · Check a company in Discover → run research in Chat → inspect Campaigns and Leads → review Drafts → approve the company → check Replies.

**Keyboard flow** · Skip to content, use slash to focus search on Campaigns or Leads, and use Ctrl+K or ⌘K to open commands. Native dialogs handle focus and Escape for the command palette, mobile menu, and lead drawer.

## Design review

- The shell uses actual service states and counts. The navigation and pipeline use the same active mark.
- The first layouts repeated boxed summaries. The implemented screens use a totals strip, campaign rows, a lead table, a draft queue, and a reply log.
- The chart exposes its source counts. The demo uses an empty history state. The keyboard review aligned the command button’s visible label and accessible name.

## Engineering

- `frontend/src/pages` contains the screen layouts. `components` contains the shell, controls, charts, and dialogs. `lib` handles API calls, classification, and tokens. Secondary routes load on demand.
- The existing SQLite/Postgres schema holds companies, people, mail records, and reply classifications. Overview and Replies use the same classifications. A completed Chat or approval refreshes shared records.
- Chat uses the existing streamed endpoint and plain HTTP fallback. Validation follows the API’s 1,000-character chat and 200-character company limits. Approval uses the backend gate. Browser tests simulate both a rejected approval and a successful approval.
- The static shell ships English copy, Open Graph metadata and artwork, crawl rules, and a web app manifest. Copy sits near the screens it describes. The manifest does not cache contact or message data.
- CSS charts and native dialogs replace the chart and animation runtimes. Vite and React Router moved to patched versions following the dependency audit. Registry versions were checked with npm outdated. The lockfile pins the resolved tree. Other framework majors continue to serve the current API surface.

## Local verification

Use Node 20.19+ on the 20 series, or Node 22.12+. Review the tracked environment examples before connecting to a backend.

```sh
cd frontend
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

Run `npm run dev` for the local workspace. Set `CHROME_BIN` to use a locally installed Chromium for Playwright. Set `VITE_API_URL` at build time for a hosted frontend. Leave it empty in local development to use Vite’s API proxy. From the repo root, install requirements with `python -m pip install -r backend/requirements.txt` and run `python -m pytest tests/ -q`. Without the local résumé, `RESUME_PATH` can point to a test PDF named `Sivasai_Boggu_Resume.pdf`. Browser mutation checks use synthetic records.

## Launch checklist

- [ ] Build in the target Node runtime with the intended API origin.
- [ ] Run one research and draft pass against the deployed API in dry-run mode.
- [ ] Confirm the approval result, attachment path, and Gmail mode.
- [ ] Check the public origin’s share preview and measure hosted performance.

## Known limits

- Hash routes keep the workspace compatible with the existing static deployment. Search and share previews apply to the entry point. Set an absolute share image URL if the deployment’s crawler requires one.
- The campaigns endpoint supplies subjects and classifications for live replies. The reply log includes a body excerpt when the source provides one.
- Production service configuration, legal copy, OAuth, telemetry, and new CI or hosting services were outside this frontend change.

## V2 ideas

1. Review all pending recipients in one approval view.
2. Show timestamps for recorded pipeline steps.
3. Link each classification to its Gmail thread.
4. Save company and verification filters.
5. Show the sources used in a draft from its preview.
6. Filter replies that need follow-up.
7. Add date ranges for the activity chart.
8. Add a read-only archive of approved drafts.
9. Keep a screenshot baseline in CI.
10. Move copy into locale catalogs when a second locale is needed.
