import { useMemo } from 'react'
import { ArrowRight, Building2, Mail, Plus, Reply, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActivityChart, ReplyDonut } from '../components/charts'
import { Avatar, Badge, Button, Card, CardHeader, DemoDataNotice, PageHeader, PipelineSteps, Skeleton } from '../components/ui'
import { AGENT_STEPS, REPLY_MIX, REPLY_MIX_COLORS, SEED_CAMPAIGNS, SEED_PEOPLE, SEED_REPLIES, useLiveData, type Health } from '../lib/data'
import { buildActivity } from '../lib/activity'
import { timeAgo } from '../lib/utils'

/** A stat card's caption is plain text — a real fact about the number,
 * never a trend pill. A pill with an arrow implies the number moved,
 * and nothing here tracks movement. */
function Stat({ icon: Icon, label, value, note, tone }: { icon: typeof Users; label: string; value: string; note: string; tone: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 dark:ring-white/10 ${tone}`}><Icon className="h-5 w-5" /></span>
        <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">{note}</span>
      </div>
      <p className="tabular mt-4 text-[32px] font-bold leading-none tracking-tight text-zinc-900 dark:text-white">{value}</p>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  )
}

/** Backend reply classes -> the dashboard's donut/badge keys. 'other'
 * has no donut slice; it still counts in the replies total. */
function replyKey(cls: string | null): 'interested' | 'not-now' | 'bounce' | 'out-of-office' | null {
  if (cls === 'interested') return 'interested'
  if (cls === 'not now') return 'not-now'
  if (cls === 'bounce') return 'bounce'
  if (cls === 'out of office') return 'out-of-office'
  return null
}

/** Pipeline step states are derived from the data on screen, not
 * hardcoded: a step is done only when the records say it ran. */
type StepState = 'done' | 'waiting' | 'queued'

export default function Dashboard({ health }: { health: Health | null }) {
  const { data, loading } = useLiveData()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const live = !!data?.live

  // Live memory when the backend answers, seeded demo data otherwise —
  // every number below is computed from whichever source is showing,
  // never hardcoded. The only reply actually logged is a bounce, so
  // there is no reply rate to show until real replies arrive.
  const mails = data?.campaigns?.mails ?? []
  const people = live ? (data?.people ?? []) : SEED_PEOPLE
  const companies = live
    ? (data?.coverage?.companies ?? (data?.campaigns?.companies ?? []).map((c) => ({ name: c.name, summary: c.summary, mails: 0, sent: 0, last_sent_at: null as number | null, status: 'researched' as const })))
    : SEED_CAMPAIGNS
  const totalLeads = people.length
  const verified = people.filter((p) => p.verified).length
  const mailsSent = live ? mails.filter((m) => m.status === 'sent').length : SEED_CAMPAIGNS.reduce((n, c) => n + c.sent, 0)
  const draftsWaiting = live
    ? mails.filter((m) => m.status === 'draft' || m.status === 'ready-to-send').length
    : SEED_CAMPAIGNS.filter((c) => c.status === 'draft').length
  const repliedMails = live ? mails.filter((m) => m.reply_class) : []
  const repliesLogged = live ? repliedMails.length : SEED_REPLIES.length
  const interested = live ? repliedMails.filter((m) => m.reply_class === 'interested').length : SEED_REPLIES.filter((r) => r.classification === 'interested').length
  const bounces = live ? repliedMails.filter((m) => m.reply_class === 'bounce').length : SEED_REPLIES.filter((r) => r.classification === 'bounce').length
  const replyMix = useMemo(() => {
    if (!live) return REPLY_MIX
    return (['interested', 'not-now', 'bounce', 'out-of-office'] as const).map((name) => ({
      name: name === 'not-now' ? 'Not now' : name === 'out-of-office' ? 'Out of office' : name[0]!.toUpperCase() + name.slice(1),
      value: repliedMails.filter((m) => replyKey(m.reply_class) === name).length,
      color: REPLY_MIX_COLORS[name],
    }))
  }, [live, repliedMails])
  const activity = useMemo(() => buildActivity(mails), [mails])
  const stepState = (key: string): StepState => {
    switch (key) {
      case 'research': return companies.length > 0 ? 'done' : 'queued'
      case 'people': return totalLeads > 0 ? 'done' : 'queued'
      case 'writer': return (live ? mails.length > 0 : true) ? 'done' : 'queued'
      case 'approval': return draftsWaiting > 0 ? 'waiting' : mailsSent > 0 ? 'done' : 'queued'
      case 'sender': return mailsSent > 0 ? 'done' : 'queued'
      case 'tracker': return repliesLogged > 0 ? 'done' : 'queued'
      default: return 'queued'
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={`${greeting}, Sivasai`} subtitle="Checking the backend for live campaign data…" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between"><Skeleton className="h-10 w-10 rounded-xl" /><Skeleton className="h-5 w-16 rounded-full" /></div>
              <Skeleton className="mt-4 h-8 w-20" />
              <Skeleton className="mt-2 h-4 w-28" />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="card p-5 xl:col-span-2"><Skeleton className="h-6 w-40" /><Skeleton className="mt-4 h-64 w-full" /></div>
          <div className="card p-5"><Skeleton className="h-6 w-32" /><Skeleton className="mt-4 h-40 w-40 rounded-full" /></div>
        </div>
      </div>
    )
  }
  return (
    <div>
      <PageHeader title={`${greeting}, Sivasai`} subtitle={live
        ? `Live data — ${companies.length} ${companies.length === 1 ? 'company' : 'companies'} in memory, ${mailsSent} mails sent.`
        : 'Seeded demo — 4 companies researched in Nov 2026. Connect the backend for live data.'}
        actions={<>
          <Link to="/chat"><Button variant="ghost"><Plus className="h-4 w-4" /> New campaign</Button></Link>
          <Link to="/drafts"><Button variant="brand">Review drafts <ArrowRight className="h-4 w-4" /></Button></Link>
        </>} />
      {!live && <DemoDataNotice what="stats, charts and replies" />}

      {live && health && !health.gmail_configured && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Gmail isn't connected — mails can't go out yet</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-700 dark:text-amber-200/80">
            Sending needs a Gmail app password: in your Google Account go to Security, then 2-Step Verification, then App passwords,
            create one for Mail, then paste it as <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-500/20">GMAIL_APP_PASSWORD</code> in
            the backend <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-500/20">.env</code> file and restart the backend.
            Until then drafts are saved and the agent runs in dry-run mode — nothing is sent.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Building2} label="Active campaigns" value={String(companies.length)} note={live ? 'Live data' : 'Seeded demo'} tone="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" />
        <Stat icon={Users} label="Verified leads" value={`${verified} / ${totalLeads}`} note={live ? 'From the database' : 'Seeded demo'} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
        <Stat icon={Mail} label="Mails sent" value={String(mailsSent)} note="One every 5 min" tone="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" />
        <Stat icon={Reply} label="Replies logged" value={String(repliesLogged)} note={`${interested} interested · ${bounces} bounce`} tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          {live ? (
            <>
              <CardHeader title="Outreach activity" subtitle="Last 7 days — counted from mail records" />
              <div className="p-6 pt-5"><ActivityChart data={activity} /></div>
            </>
          ) : (
            <>
              <CardHeader title="Outreach activity" subtitle="Counted from mail records" />
              <div className="flex flex-col items-start gap-3 p-6 pt-5">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No live activity yet</p>
                <p className="max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  This chart counts real sends from the backend. The seeded demo has no send history,
                  so there is nothing to plot — start the backend and send a campaign to fill it.
                </p>
                <Link to="/chat"><Button variant="ghost">Open agent chat <ArrowRight className="h-4 w-4" /></Button></Link>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <CardHeader title="Reply breakdown" subtitle={live ? 'Counted from classified replies' : 'Counted from logged replies'} />
          <div className="p-6 pt-5"><ReplyDonut mix={replyMix} /></div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <CardHeader title="Agent pipeline" subtitle="Research, people, writer, approval, sender, tracker"
            action={<Link to="/chat" className="text-xs font-semibold text-brand-600 hover:text-brand-500">Open agent chat</Link>} />
          <PipelineSteps steps={AGENT_STEPS} stateFor={(key) => {
            const s = stepState(key)
            return s === 'done' ? 'done' : s === 'waiting' ? 'waiting' : 'queued'
          }} />
        </div>

        <div className="card">
          <CardHeader title="Latest replies" subtitle="Classified by the tracker" />
          <div className="space-y-4 p-6">
            {live ? (
              repliedMails.length === 0 ? (
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">No classified replies yet — the tracker logs them here once a recipient writes back.</p>
              ) : repliedMails.slice(0, 3).map((m) => (
                <div key={`${m.company}-${m.email}`} className="flex gap-3 border-b border-zinc-100/80 pb-4 last:border-0 last:pb-0 dark:border-zinc-800/70">
                  <Avatar name={m.recipient} size="sm" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{m.recipient}</p>
                      <Badge tone={replyKey(m.reply_class) ?? 'muted'}>{m.reply_class}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{m.subject}</p>
                    <p className="mt-1.5 text-[11px] font-medium text-zinc-400">{m.company}{m.sent_at ? ` · sent ${timeAgo(new Date(m.sent_at * 1000).toISOString())}` : ''}</p>
                  </div>
                </div>
              ))
            ) : (
              SEED_REPLIES.map((r) => (
                <div key={r.id} className="flex gap-3 border-b border-zinc-100/80 pb-4 last:border-0 last:pb-0 dark:border-zinc-800/70">
                  <Avatar name={r.from} size="sm" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{r.from}</p>
                      <Badge tone={r.classification}>{r.classification}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{r.snippet}</p>
                    <p className="mt-1.5 text-[11px] font-medium text-zinc-400">{r.company} · {timeAgo(r.receivedAt)}</p>
                  </div>
                </div>
              ))
            )}
            <Link to="/replies"><Button variant="ghost" className="w-full">View all replies</Button></Link>
          </div>
        </div>
      </div>
    </div>
  )
}
