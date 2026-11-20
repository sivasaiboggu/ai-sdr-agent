import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Building2, CheckCircle2, Mail, Reply, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActivityChart, ReplyDonut } from '../components/charts'
import { Avatar, Badge, Button, Card, CardHeader, fadeUp, PageHeader, Skeleton } from '../components/ui'
import { AGENT_STEPS, SEED_CAMPAIGNS, SEED_PEOPLE, SEED_REPLIES } from '../lib/data'
import { timeAgo } from '../lib/utils'

function Stat({ icon: Icon, label, value, delta, tone }: { icon: typeof Users; label: string; value: string; delta: string; tone: string }) {
  return (
    <motion.div variants={fadeUp} className="card p-5 transition-shadow hover:shadow-pop">
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"><ArrowUpRight className="h-3 w-3" />{delta}</span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
    </motion.div>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 600)
    return () => window.clearTimeout(t)
  }, [])
  const totalLeads = SEED_PEOPLE.length
  const verified = SEED_PEOPLE.filter((p) => p.verified).length
  if (loading) {
    return (
      <div>
        <PageHeader title="Good morning, Sivasai" subtitle="Your agent researched 4 companies this week. Here's what's moving." />
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
      <PageHeader title="Good morning, Sivasai" subtitle="Your agent researched 4 companies this week. Here's what's moving."
        actions={<>
          <Link to="/chat"><Button variant="ghost"><Sparkles className="h-4 w-4" /> New campaign</Button></Link>
          <Link to="/drafts"><Button variant="brand">Review drafts <ArrowRight className="h-4 w-4" /></Button></Link>
        </>} />

      <motion.div initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Building2} label="Active campaigns" value={String(SEED_CAMPAIGNS.length)} delta="2 this week" tone="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" />
        <Stat icon={Users} label="Verified leads" value={`${verified} / ${totalLeads}`} delta="83% verified" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
        <Stat icon={Mail} label="Mails sent" value="2" delta="5-min gap" tone="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" />
        <Stat icon={Reply} label="Reply rate" value="50%" delta="1 interested" tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
      </motion.div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} className="card xl:col-span-2">
          <CardHeader title="Outreach activity" subtitle="Mails sent vs replies received, this week"
            action={<Badge tone="active">Live</Badge>} />
          <div className="p-5"><ActivityChart /></div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2} className="card">
          <CardHeader title="Reply breakdown" subtitle="How inboxes answered" />
          <div className="p-5"><ReplyDonut /></div>
        </motion.div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="card xl:col-span-2">
          <CardHeader title="Agent pipeline" subtitle="Research → people → writer → approval → sender → tracker"
            action={<Link to="/chat" className="text-xs font-semibold text-brand-600 hover:text-brand-500">Open agent chat →</Link>} />
          <ol className="space-y-0 p-2">
            {AGENT_STEPS.map((s, i) => (
              <motion.li key={s.key} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.08 }}
                className="flex items-start gap-4 rounded-xl px-3 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {i + 1}
                  {i < AGENT_STEPS.length - 1 && <span className="absolute left-1/2 top-8 h-5 w-px -translate-x-1/2 bg-zinc-200 dark:bg-zinc-700" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.label}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.detail}</p>
                </div>
                {i < 3 ? <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" /> : <Badge tone={i === 3 ? 'warning' : 'muted'}>{i === 3 ? 'Waiting on you' : 'Queued'}</Badge>}
              </motion.li>
            ))}
          </ol>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="card">
          <CardHeader title="Latest replies" subtitle="Classified by the tracker" />
          <div className="space-y-3 p-5">
            {SEED_REPLIES.map((r) => (
              <div key={r.id} className="flex gap-3">
                <Avatar name={r.from} size="sm" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{r.from}</p>
                    <Badge tone={r.classification}>{r.classification}</Badge>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{r.snippet}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">{r.company} · {timeAgo(r.receivedAt)}</p>
                </div>
              </div>
            ))}
            <Link to="/replies"><Button variant="ghost" className="w-full">View all replies</Button></Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
