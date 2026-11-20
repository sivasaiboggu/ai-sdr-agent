import { motion } from 'framer-motion'
import { ArrowUpRight, Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, Badge, Button, Card, DemoDataNotice, EmptyState, fadeUp, PageHeader } from '../components/ui'
import { SEED_CAMPAIGNS, SEED_PEOPLE } from '../lib/data'
import { timeAgo } from '../lib/utils'

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
