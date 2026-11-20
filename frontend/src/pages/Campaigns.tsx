import { motion } from 'framer-motion'
import { ArrowUpRight, Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, Badge, Button, Card, DemoDataNotice, EmptyState, fadeUp, PageHeader } from '../components/ui'
import { SEED_CAMPAIGNS, SEED_DRAFTS, SEED_PEOPLE } from '../lib/data'
import { timeAgo } from '../lib/utils'
import { cn } from '../lib/utils'

/** Pipeline funnel for one campaign — every number comes from the seeded
 * campaign record and the drafts actually written for that company, so
 * the funnel can only ever show what really happened: leads found,
 * drafts written, mails sent, replies received. */
function PipelineFunnel({ company, leads, sent, replies }: { company: string; leads: number; sent: number; replies: number }) {
  const drafts = SEED_DRAFTS.filter((d) => d.company === company).length
  const stages = [
    { label: 'Leads', count: leads, tone: 'bg-brand-500' },
    { label: 'Drafts', count: drafts, tone: 'bg-violet-500' },
    { label: 'Sent', count: sent, tone: 'bg-emerald-500' },
    { label: 'Replies', count: replies, tone: 'bg-amber-500' },
  ]
  const max = Math.max(leads, 1)
  return (
    <div className="mt-4">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        {stages.map((s) => (
          <motion.div key={s.label} initial={{ width: 0 }} animate={{ width: `${(s.count / max) * 100}%` }} transition={{ duration: 0.6 }}
            className={cn('h-full', s.tone)} title={`${s.label}: ${s.count}`} />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
        {stages.map((s) => (
          <div key={s.label}>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">{s.count}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-center text-xs text-zinc-400">
        {sent === 0 ? 'Nothing sent yet — approve a draft to start the pipeline.'
          : replies === 0 ? `${sent} of ${leads} leads mailed — waiting on replies.`
            : `${replies} ${replies === 1 ? 'reply' : 'replies'} from ${sent} sent.`}
      </p>
    </div>
  )
}

export default function Campaigns({ query }: { query: string }) {
  const list = SEED_CAMPAIGNS.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.summary.toLowerCase().includes(query.toLowerCase()))
  return (
    <div>
      <PageHeader title="Campaigns" subtitle="One campaign per company — research, leads, drafts and replies in one place."
        actions={<Link to="/chat"><Button variant="brand">+ New campaign</Button></Link>} />
      <DemoDataNotice />
      {list.length === 0 && (
        <EmptyState
          icon={Building2}
          title={query ? `No campaigns match “${query}”` : 'No campaigns yet'}
          body="Start a campaign from Agent chat — research a company and the agent drafts personalised mails for its verified founders and hiring leads."
          action={<Link to="/chat"><Button variant="brand">+ New campaign</Button></Link>}
        />
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {list.map((c, i) => {
          const people = SEED_PEOPLE.filter((p) => p.company === c.name)
          return (
            <motion.div key={c.name} variants={fadeUp} initial="hidden" animate="show" custom={i} className="card group p-5 transition-shadow hover:shadow-pop">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white dark:bg-white dark:text-zinc-900">
                    {c.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                      {c.name} <ArrowUpRight className="h-4 w-4 text-zinc-400 transition group-hover:text-brand-500" />
                    </h3>
                    <p className="text-xs font-medium text-zinc-500">{c.role}</p>
                  </div>
                </div>
                <Badge tone={c.status}>{c.status}</Badge>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{c.summary}</p>
              <PipelineFunnel company={c.name} leads={c.leads} sent={c.sent} replies={c.replies} />
              <div className="mt-4 flex items-center gap-1">
                {people.slice(0, 4).map((p) => <Avatar key={p.email || p.name} name={p.name} size="sm" />)}
                {people.length > 4 && <span className="ml-1 text-xs font-semibold text-zinc-500">+{people.length - 4}</span>}
                <span className="ml-auto text-xs text-zinc-400">Updated {timeAgo(c.updatedAt)}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-100 rounded-xl bg-zinc-50 py-3 text-center dark:divide-zinc-800 dark:bg-zinc-800/60">
                <div><p className="text-lg font-bold text-zinc-900 dark:text-white">{c.leads}</p><p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Leads</p></div>
                <div><p className="text-lg font-bold text-zinc-900 dark:text-white">{c.sent}</p><p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Sent</p></div>
                <div><p className="text-lg font-bold text-zinc-900 dark:text-white">{c.replyRate}%</p><p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Reply rate</p></div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link to="/leads" className="flex-1"><Button variant="ghost" className="w-full">View leads</Button></Link>
                <Link to="/drafts" className="flex-1"><Button variant="primary" className="w-full">View drafts</Button></Link>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
