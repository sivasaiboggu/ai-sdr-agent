import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Clock, Loader2, Mail, Paperclip, PenLine, Send } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, Badge, Button, Card, DemoDataNotice, EmptyState, fadeUp, PageHeader } from '../components/ui'
import { approveCompany, invalidateLiveData, SEED_DRAFTS, useLiveData, type Draft } from '../lib/data'
import type { ToastTone } from '../App'
import { cn } from '../lib/utils'

export default function Drafts({ onToast }: { onToast: (msg: string, tone?: ToastTone) => void }) {
  const navigate = useNavigate()
  const { data } = useLiveData()
  const live = !!data?.live
  // Live drafts when the backend answers — the mails it actually wrote,
  // waiting for approval — seeded demo drafts only while it is down.
  // 'ready-to-send' counts: it is the state a mail sits in after passing
  // the quality gate, before approval. Drafts used to render the seeds
  // even with the backend live, so approving one approved a stale copy.
  const liveDrafts: Draft[] = live
    ? (data?.campaigns?.mails ?? [])
        .filter((m) => m.status.startsWith('draft') || m.status === 'ready-to-send')
        .map((m) => ({ to: m.email, name: m.recipient, subject: m.subject, body: m.body, company: m.company }))
    : []
  const drafts = live ? liveDrafts : SEED_DRAFTS
  const [open, setOpen] = useState<string | null>(null)
  const openTo = open ?? drafts[0]?.to ?? null
  const [approved, setApproved] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState<string | null>(null)

  /** Rewriting goes through Agent chat — the old "Edit draft" button
   * only showed a toast claiming an edit mode that did not exist.
   * This queues a real rewrite request the agent runs on arrival. */
  function rewriteInChat(d: Draft) {
    try {
      window.sessionStorage.setItem('sdr-pending-chat',
        `Rewrite the draft mail for ${d.name} at ${d.company ?? 'this company'} — keep the hook from the research, tighten the wording, no new facts.`)
    } catch { /* session storage unavailable — chat still opens */ }
    navigate('/chat')
  }

  async function approve(d: Draft) {
    if (sending) return
    setSending(d.to)
    try {
      const res = await approveCompany(d.company ?? '')
      const status = res.sent.find((s) => s.to === d.to)?.status ?? 'queued'
      // Only mark a draft approved when the backend actually queued/sent
      // it. A failed or blocked send must never wear the Approved badge.
      if (status.startsWith('failed:') || status.startsWith('blocked:')) {
        onToast(`Approval reached the backend but the mail did NOT go out — ${status}. Nothing was marked approved; fix the cause and try again.`, 'error')
        return
      }
      setApproved((s) => new Set(s).add(d.to))
      invalidateLiveData()
      if (status === 'draft (dry-run)') {
        onToast(`Draft to ${d.name} approved — dry-run only, nothing was really sent. Set GMAIL_SEND_ENABLED=true and a Gmail app password in the backend .env to send for real.`)
      } else {
        onToast(`Draft to ${d.name} approved — ${status}. It sends with the 5-minute gap.`)
      }
    } catch (e) {
      // Backend not running (or the approval failed): say so plainly and
      // do NOT mark the draft approved — the badge must never claim a mail
      // was queued when the backend never confirmed it. The user can retry
      // once the backend is reachable.
      onToast(`Approval did NOT reach the backend (${e instanceof Error ? e.message : 'unreachable'}). Nothing was queued — fix the backend connection and try again.`, 'error')
    } finally {
      setSending(null)
    }
  }

  return (
    <div>
      <PageHeader title="Draft mails" subtitle={live
        ? `${drafts.length} ${drafts.length === 1 ? 'draft' : 'drafts'} waiting in backend memory — approve one and the sender takes it from there.`
        : 'Personalised from real research. Nothing sends without your approval — approve a draft and the sender takes it from there.'}
        actions={<Badge tone="warning"><Clock className="h-3 w-3" /> Approval required</Badge>} />
      {!live && <DemoDataNotice what="drafts" />}
      {drafts.length === 0 && (
        <EmptyState
          icon={Mail}
          title="No drafts waiting"
          body="Drafts appear here after the agent researches a company — each one personalised from real research and waiting for your approval before anything sends."
          action={<Link to="/chat"><Button variant="brand">Research a company</Button></Link>}
        />
      )}
      <div className="space-y-3">
        {drafts.map((d, i) => {
          const isOpen = openTo === d.to
          const isApproved = approved.has(d.to)
          return (
            <motion.div key={d.to} variants={fadeUp} initial="hidden" animate="show" custom={i} className="card overflow-hidden transition-shadow hover:shadow-soft">
              <button onClick={() => setOpen(isOpen ? null : d.to)} aria-expanded={isOpen} className="flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                <Avatar name={d.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    To: {d.name} <span className="font-normal text-zinc-400">&lt;{d.to}&gt;</span>
                  </p>
                  <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{d.subject}</p>
                </div>
                <Badge tone={d.company === 'iion' ? 'active' : 'muted'}>{d.company}</Badge>
                {isApproved && <Badge tone="interested"><Check className="h-3 w-3" /> Approved</Badge>}
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-300', isOpen && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
                    <div className="border-t border-zinc-100/80 px-6 py-5 dark:border-zinc-800/80">
                      <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Subject: {d.subject}</p>
                      <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-zinc-50/80 p-4 font-sans text-sm leading-relaxed text-zinc-700 ring-1 ring-inset ring-zinc-100 dark:bg-zinc-800/50 dark:text-zinc-300 dark:ring-zinc-800">{d.body}</pre>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-500 ring-1 ring-inset ring-zinc-200/70 dark:bg-zinc-800/60 dark:text-zinc-400 dark:ring-zinc-700/60"><Paperclip className="h-3.5 w-3.5" /> Sivasai_Boggu_Resume.pdf attached</span>
                        <span className="ml-auto flex gap-2">
                          <Button variant="ghost" onClick={() => rewriteInChat(d)}><PenLine className="h-3.5 w-3.5" /> Rewrite in chat</Button>
                          <Button variant={isApproved ? 'primary' : 'brand'} disabled={isApproved || sending === d.to} onClick={() => approve(d)}>
                            {sending === d.to ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {isApproved ? 'Approved ✓' : sending === d.to ? 'Approving…' : 'Approve & send'}
                          </Button>
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
      <Card className="mt-4 border-dashed p-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        Sending is rate-limited to one mail every 5 minutes, and every send is logged in the backend — with its real Gmail message ID when it actually went out (dry-run entries carry a dry-run ID instead).
      </Card>
    </div>
  )
}
