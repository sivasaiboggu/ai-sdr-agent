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

/** Real verified leads seeded by the agent's research (Apollo, 19 Nov 2026). */
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
  { name: 'Discover Dollar', summary: 'Contract-compliance & rebate recovery with RAG agents. AI Engineer Intern.', role: 'AI Engineer Intern', status: 'replied', leads: 3, sent: 1, replies: 1, replyRate: 100, updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
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
  { id: 'r1', from: 'Subrahmanya Rao', company: 'Discover Dollar', subject: 'Re: LangGraph, LangChain, MCP — this stack is my stack', classification: 'interested', snippet: 'Thanks Sivasai — this is interesting. Can you share a short demo of the contract agent?', receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: 'r2', from: 'Mail Delivery Subsystem', company: 'iion', subject: 'Delivery Status Notification', classification: 'bounce', snippet: '550 5.1.1 — the email account jobs@iion.io does not exist. Do not resend to this address.', receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
]

export const WEEKLY_ACTIVITY = [
  { day: 'Mon', sent: 2, replies: 0 },
  { day: 'Tue', sent: 3, replies: 1 },
  { day: 'Wed', sent: 1, replies: 0 },
  { day: 'Thu', sent: 4, replies: 1 },
  { day: 'Fri', sent: 2, replies: 1 },
  { day: 'Sat', sent: 0, replies: 0 },
  { day: 'Sun', sent: 0, replies: 0 },
]

export const REPLY_MIX = [
  { name: 'Interested', value: 3, color: '#10b981' },
  { name: 'Not now', value: 2, color: '#f59e0b' },
  { name: 'Bounce', value: 1, color: '#f43f5e' },
  { name: 'Out of office', value: 1, color: '#6366f1' },
]

export const AGENT_STEPS = [
  { key: 'research', label: 'Research company', detail: 'Web, careers page, LinkedIn — with cited sources' },
  { key: 'people', label: 'Find verified people', detail: 'Apollo + LinkedIn, verified emails only' },
  { key: 'writer', label: 'Write personalised mails', detail: 'Hook from real research, proof from your projects' },
  { key: 'approval', label: 'Human approval', detail: 'Nothing sends without your YES' },
  { key: 'sender', label: 'Send with 5-min gap', detail: 'Gmail, PDF resume attached' },
  { key: 'tracker', label: 'Track replies', detail: 'Classify, follow up in 4–5 days' },
] as const

export async function fetchCampaigns(): Promise<{ companies: { name: string; summary: string }[]; mails: { company: string; recipient: string; email: string; subject: string; status: string }[] } | null> {
  try {
    const r = await fetch('/api/campaigns')
    if (!r.ok) return null
    return (await r.json()) as never
  } catch {
    return null
  }
}

export async function sendChat(message: string): Promise<{ reply: string; people: Person[]; drafts: Draft[]; company?: { name: string; summary: string } }> {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!r.ok) throw new Error(`Agent API returned ${r.status}`)
  return (await r.json()) as never
}
