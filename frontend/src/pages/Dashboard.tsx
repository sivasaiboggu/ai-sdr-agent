import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Building2, CheckCircle2, Mail, Reply, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActivityChart, ReplyDonut } from '../components/charts'
import { Avatar, Badge, Button, Card, CardHeader, DemoDataNotice, fadeUp, PageHeader, Skeleton } from '../components/ui'
import { AGENT_STEPS, REPLY_MIX, REPLY_MIX_COLORS, SEED_CAMPAIGNS, SEED_PEOPLE, SEED_REPLIES, useLiveData } from '../lib/data'
import { timeAgo } from '../lib/utils'

function Stat({ icon: Icon, label, value, delta, tone }: { icon: typeof Users; label: string; value: string; delta: string; tone: string }) {
  return (
    <motion.div variants={fadeUp} className="card card-hover p-5">
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 dark:ring-white/10 ${tone}`}><Icon className="h-5 w-5" /></span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20"><ArrowUpRight className="h-3 w-3" />{delta}</span>
      </div>
      <p className="tabular mt-4 text-[32px] font-bold leading-none tracking-tight text-zinc-900 dark:text-white">{value}</p>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
    </motion.div>
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

export default function Dashboard() {
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
          <Link to="/chat"><Button variant="ghost"><Sparkles className="h-4 w-4" /> New campaign</Button></Link>
          <Link to="/drafts"><Button variant="brand">Review drafts <ArrowRight className="h-4 w-4" /></Button></Link>
        </>} />
      {!live && <DemoDataNotice what="stats, charts and replies" />}

      <motion.div initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Building2} label="Active campaigns" value={String(companies.length)} delta={live ? 'live' : 'seeded demo'} tone="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" />
        <Stat icon={Users} label="Verified leads" value={`${verified} / ${totalLeads}`} delta={live ? 'from backend' : 'seeded demo'} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
        <Stat icon={Mail} label="Mails sent" value={String(mailsSent)} delta="5-min gap" tone="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" />
        <Stat icon={Reply} label="Replies logged" value={String(repliesLogged)} delta={`${interested} interested · ${bounces} bounce`} tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
      </motion.div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} className="card xl:col-span-2">
          <CardHeader title="Outreach activity" subtitle="Sample week — illustrative, not live data"
            action={<Badge tone="muted">Demo data</Badge>} />
          <div className="p-6 pt-5"><ActivityChart /></div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2} className="card">
          <CardHeader title="Reply breakdown" subtitle={live ? 'Counted from classified replies' : 'Counted from logged replies'} />
          <div className="p-6 pt-5"><ReplyDonut mix={replyMix} /></div>
        </motion.div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="card xl:col-span-2">
          <CardHeader title="Agent pipeline" subtitle="Research → people → writer → approval → sender → tracker"
            action={<Link to="/chat" className="text-xs font-semibold text-brand-600 hover:text-brand-500">Open agent chat →</Link>} />
          <ol className="space-y-0 p-2">
            {AGENT_STEPS.map((s, i) => (
              <motion.li key={s.key} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.08 }}
                className="flex items-start gap-4 rounded-xl px-3 py-3 transition hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-900">
                  {i + 1}
                  {i < AGENT_STEPS.length - 1 && <span className="absolute left-1/2 top-8 h-5 w-px -translate-x-1/2 bg-gradient-to-b from-zinc-300 to-zinc-200 dark:from-zinc-600 dark:to-zinc-700" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{s.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{s.detail}</p>
                </div>
                {i < 3 ? <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" /> : <Badge tone={i === 3 ? 'warning' : 'muted'}>{i === 3 ? 'Waiting on you' : 'Queued'}</Badge>}
              </motion.li>
            ))}
          </ol>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="card">
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
        </motion.div>
      </div>
    </div>
  )
}
