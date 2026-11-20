export type Person = {
  name: string
  title: string
  email: string
  company: string
  score: number
  verified: boolean
  linkedin?: string
}

export type Draft = {
  to: string
  name: string
  subject: string
  body: string
  company?: string
}

export type Campaign = {
  name: string
  summary: string
  domain?: string
  role?: string
  status: 'active' | 'draft' | 'sent' | 'replied'
  leads: number
  sent: number
  replies: number
  replyRate: number
  updatedAt: string
}

export type ReplyItem = {
  id: string
  from: string
  company: string
  subject: string
  classification: 'interested' | 'not-now' | 'bounce' | 'out-of-office'
  snippet: string
  receivedAt: string
}

/** Seeded demo data — a snapshot of the real Nov 2026 research (Apollo,
 * 19 Nov 2026) used when the backend is not running. These are examples,
 * not live results: pages that render them must show <DemoDataNotice />.
 * Real campaigns come from the backend (/campaigns, /chat) once it is up. */
export const SEED_PEOPLE: Person[] = [
  { name: 'Sanjaya Molligoda', title: 'Co-Founder', email: 'sanjaya@iion.io', company: 'iion', score: 100, verified: true, linkedin: 'sanjayamolligoda' },
  { name: 'Wout van Damme', title: 'Co-Founder', email: 'wout@iion.io', company: 'iion', score: 100, verified: true, linkedin: 'woutvandamme' },
  { name: 'Giuseppe Martoriello', title: 'Co-Founder', email: 'giuseppe.martoriello@iion.io', company: 'iion', score: 100, verified: true },
  { name: 'Ullas Sahadevan', title: 'Senior Talent Acquisition Manager', email: 'ullas@iion.io', company: 'iion', score: 80, verified: true },
  { name: 'Uttaran Nayak', title: 'Co-Founder & CEO', email: 'uttaran@getalchemystai.com', company: 'Alchemyst AI', score: 100, verified: true, linkedin: 'uttarannayak' },
  { name: 'Anuran Roy', title: 'Co-Founder & CTO', email: 'anuran@getalchemystai.com', company: 'Alchemyst AI', score: 95, verified: true, linkedin: 'anuran-roy' },
  { name: 'Prithwijit Dey', title: 'COO', email: 'prithwijit@getalchemystai.com', company: 'Alchemyst AI', score: 90, verified: true, linkedin: 'prithwijitdey' },
  { name: 'Dheemanth Ramesh', title: 'CTO', email: 'dheemanth@discoverdollar.com', company: 'Discover Dollar', score: 95, verified: true },
  { name: 'Pawan Kuldip', title: 'People & Culture', email: 'pawan.kuldip@discoverdollar.com', company: 'Discover Dollar', score: 80, verified: true },
  { name: 'Subrahmanya Rao', title: 'Founder & CEO', email: 'subu@discoverdollar.com', company: 'Discover Dollar', score: 100, verified: true },
  { name: 'Saurav Bhagat', title: 'Co-Founder, Product Lead', email: '', company: 'Drivetrain', score: 100, verified: false, linkedin: 'saurav-bhagat-83216886' },
  { name: 'Alok Goel', title: 'Co-Founder & CEO', email: '', company: 'Drivetrain', score: 100, verified: false, linkedin: 'goelalok' },
]

export const SEED_CAMPAIGNS: Campaign[] = [
  { name: 'iion', summary: 'Self-serve ad platform for gaming — immersiion. Agentic Workflows intern role.', role: 'AI Engineering Intern', status: 'sent', leads: 4, sent: 1, replies: 0, replyRate: 0, updatedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString() },
  { name: 'Alchemyst AI', summary: 'Context layer for building context-aware agents. Full Stack AI Engineer Intern.', role: 'Full Stack AI Engineer Intern', status: 'active', leads: 3, sent: 0, replies: 0, replyRate: 0, updatedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString() },
  { name: 'Discover Dollar', summary: 'Contract-compliance & rebate recovery with RAG agents. AI Engineer Intern.', role: 'AI Engineer Intern', status: 'sent', leads: 3, sent: 1, replies: 0, replyRate: 0, updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { name: 'Drivetrain', summary: 'FP&A platform — Gen AI for finance planning. Engineering Intern, Gen AI.', role: 'Engineering Intern — Gen AI', status: 'draft', leads: 2, sent: 0, replies: 0, replyRate: 0, updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
]

export const SEED_DRAFTS: Draft[] = [
  {
    to: 'sanjaya@iion.io', name: 'Sanjaya Molligoda', company: 'iion',
    subject: "I build autonomous agents with LangGraph — applying for iion's Agentic Workflows intern role",
    body: "Hi Sanjaya,\n\nI looked at immersiion, your self-serve ad platform for gaming — in week one I'd prototype an agent that drafts campaign setup from a brief and runs it in shadow mode, with a human approving before anything goes live.\n\nI've built HireMind AI (React + Gemini resume analysis) and AuditMind (FastAPI + RAG contract intelligence), and I work with LangGraph, LangChain and RAG every day. I applied via Keka and would love 15 minutes to show you what I can build for iion.\n\nBest,\nSivasai Boggu",
  },
  {
    to: 'uttaran@getalchemystai.com', name: 'Uttaran Nayak', company: 'Alchemyst AI',
    subject: 'Full Stack AI Engineer Intern — Sivasai Boggu, React/TypeScript + WebSockets',
    body: "Hi Uttaran,\n\nAlchemyst's context layer is exactly the kind of infrastructure I want to build on — I prototyped a streaming, context-aware agent UI in HireMind AI with React, TypeScript and WebSockets, and a RAG contract agent in AuditMind.\n\nI'd love to bring that to your Full Stack AI Engineer Intern role. Are you open to a 15-minute call this week?\n\nBest,\nSivasai Boggu",
  },
  {
    to: 'subu@discoverdollar.com', name: 'Subrahmanya Rao', company: 'Discover Dollar',
    subject: 'LangGraph, LangChain, MCP — this stack is my stack',
    body: "Hi Subrahmanya,\n\nFirst, I'd agent-ify contract-compliance review — an agent that reads vendor contracts and invoices with RAG, flags pricing and rebate mismatches, and aims to surface recoverable leakage faster, with a human approving before any claim goes out.\n\nI build with LangGraph, LangChain and MCP, and my AuditMind project does exactly this kind of contract intelligence. Would you be open to a 15-minute call?\n\nBest,\nSivasai Boggu",
  },
]

export const SEED_REPLIES: ReplyItem[] = [
  // Only the bounce is a real logged event (jobs@iion.io, 19 Nov 2026).
  // No interested reply has been received — an earlier seeded "interested"
  // reply was invented and has been removed; do not re-add replies
  // without a real message behind them.
  { id: 'r2', from: 'Mail Delivery Subsystem', company: 'iion', subject: 'Delivery Status Notification', classification: 'bounce', snippet: '550 5.1.1 — the email account jobs@iion.io does not exist. Do not resend to this address.', receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
]

/** Illustrative sample week for the activity chart — NOT measured data.
 * No backend endpoint serves activity aggregates yet, so the chart is a
 * placeholder shape; the Dashboard labels it as such. */
export const DEMO_WEEKLY_ACTIVITY = [
  { day: 'Mon', sent: 2, replies: 0 },
  { day: 'Tue', sent: 3, replies: 1 },
  { day: 'Wed', sent: 1, replies: 0 },
  { day: 'Thu', sent: 4, replies: 1 },
  { day: 'Fri', sent: 2, replies: 1 },
  { day: 'Sat', sent: 0, replies: 0 },
  { day: 'Sun', sent: 0, replies: 0 },
]

export const REPLY_MIX_COLORS: Record<ReplyItem['classification'], string> = {
  interested: '#10b981',
  'not-now': '#f59e0b',
  bounce: '#f43f5e',
  'out-of-office': '#6366f1',
}

/** Reply breakdown, counted from the logged replies above — never
 * hardcoded. With only the one real bounce logged, the donut shows a
 * single slice, which is the honest picture until real replies arrive. */
export const REPLY_MIX = (['interested', 'not-now', 'bounce', 'out-of-office'] as const).map((name) => ({
  name: name === 'not-now' ? 'Not now' : name === 'out-of-office' ? 'Out of office' : name[0]!.toUpperCase() + name.slice(1),
  value: SEED_REPLIES.filter((r) => r.classification === name).length,
  color: REPLY_MIX_COLORS[name],
}))

export const AGENT_STEPS = [
  { key: 'research', label: 'Research company', detail: 'Web, careers page, LinkedIn — with cited sources' },
  { key: 'people', label: 'Find verified people', detail: 'Apollo + LinkedIn, verified emails only' },
  { key: 'writer', label: 'Write personalised mails', detail: 'Hook from real research, proof from your projects' },
  { key: 'approval', label: 'Human approval', detail: 'Nothing sends without your YES' },
  { key: 'sender', label: 'Send with 5-min gap', detail: 'Gmail, PDF resume attached' },
  { key: 'tracker', label: 'Track replies', detail: 'Classify, follow up in 4–5 days' },
] as const

export type CampaignsResponse = {
  companies: { name: string; summary: string }[]
  mails: { company: string; recipient: string; email: string; subject: string; status: string }[]
}

export type ChatResponse = {
  reply: string
  people: Person[]
  drafts: Draft[]
  company?: { name: string; summary: string }
}

/**
 * Where the backend lives.
 *
 * - Local dev (`npm run dev`): unset, so calls go to the relative `/api/*`
 *   path and Vite's dev proxy forwards them to http://localhost:8000
 *   (see vite.config.ts, which strips the `/api` prefix).
 * - Production (Vercel): set `VITE_API_URL` to the deployed backend
 *   origin, e.g. `https://ai-sdr-agent-api.onrender.com` — no trailing
 *   slash, no `/api` suffix. The dashboard then calls the backend
 *   directly (CORS for that origin must be allowed server-side via
 *   `CORS_ORIGINS`).
 *
 * There is deliberately no hardcoded `localhost` here: a production
 * build with `VITE_API_URL` unset would otherwise try to reach a
 * backend on the viewer's own machine. With it unset in production
 * the calls go to the same origin (`/api/*`), which only works if the
 * host proxies `/api` to the backend — Vercel does not by default, so
 * set `VITE_API_URL` when deploying.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? ''

/** Label shown in error states so the user knows which backend was tried. */
export const API_BASE_LABEL = API_BASE_URL || 'same origin (/api)'

/** Build a backend URL: `/chat` etc. against the configured base. */
export function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : `/api${path}`
}

/** True when the backend answers /health within `timeoutMs`. Used to
 * show an honest online/offline state instead of assuming "Online". */
export async function checkHealth(timeoutMs = 5000): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const r = await fetch(apiUrl('/health'), { signal: ctrl.signal })
      return r.ok
    } finally {
      window.clearTimeout(t)
    }
  } catch {
    return false
  }
}

export async function fetchCampaigns(): Promise<CampaignsResponse | null> {
  try {
    const r = await fetch(apiUrl('/campaigns'))
    if (!r.ok) return null
    return (await r.json()) as CampaignsResponse
  } catch {
    return null
  }
}

export async function sendChat(message: string): Promise<ChatResponse> {
  const r = await fetch(apiUrl('/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!r.ok) throw new Error(`Agent API returned ${r.status}`)
  return (await r.json()) as ChatResponse
}

export type StreamEvent =
  | { kind: 'step'; key: string; state: string }
  | { kind: 'token'; text: string }
  | { kind: 'done'; reply: string; drafts: Draft[]; company?: ChatResponse['company']; people?: Person[] }
  | { kind: 'error'; detail: string }

/** Streaming twin of sendChat: consumes POST /chat/stream (SSE) and calls
 * `onEvent` for every frame. Throws on HTTP failure so the caller can
 * fall back to the plain /chat call. */
export async function streamChat(message: string, onEvent: (e: StreamEvent) => void): Promise<void> {
  const r = await fetch(apiUrl('/chat/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ message }),
  })
  if (!r.ok || !r.body) throw new Error(`Agent API returned ${r.status}`)
  const reader = r.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let event = ''
  const emit = (data: string) => {
    try {
      const payload = JSON.parse(data)
      if (event === 'step') onEvent({ kind: 'step', key: payload.key, state: payload.state })
      else if (event === 'token') onEvent({ kind: 'token', text: payload.text })
      else if (event === 'done') onEvent({ kind: 'done', reply: payload.reply, drafts: payload.drafts ?? [], company: payload.company, people: payload.people })
      else if (event === 'error') onEvent({ kind: 'error', detail: payload.detail })
    } catch { /* ignore a malformed frame — the done event still lands */ }
  }
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const frame = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) emit(line.slice(5).trim())
      }
      event = ''
    }
  }
}

/** Approve a company's drafts. Throws on network/HTTP failure so the
 * caller can tell the user the approval did NOT reach the backend. */
export async function approveCompany(company: string): Promise<{ sent: { to: string; status: string }[]; company: string }> {
  const r = await fetch(apiUrl('/approve'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company, approve: true }),
  })
  if (!r.ok) {
    const detail = await r.json().catch(() => null)
    throw new Error(detail?.detail ?? `Approval failed (HTTP ${r.status})`)
  }
  return (await r.json()) as never
}
