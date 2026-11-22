import { ArrowUpRight, Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, Badge, Button, Card, DemoDataNotice, EmptyState, PageHeader } from '../components/ui'
import { SEED_CAMPAIGNS, SEED_DRAFTS, SEED_PEOPLE, useLiveData } from '../lib/data'
import { timeAgo } from '../lib/utils'
import { cn } from '../lib/utils'

/** Pipeline funnel for one campaign — every number comes from the
 * campaign record and the mails actually written for that company, so
 * the funnel can only ever show what really happened: leads found,
 * drafts written, mails sent, replies received. */
function PipelineFunnel({ leads, drafts, sent, replies }: { leads: number; drafts: number; sent: number; replies: number }) {
  const stages = [
    { label: 'Leads', count: leads, tone: 'bg-brand-500' },
    { label: 'Drafts', count: drafts, tone: 'bg-violet-500' },
    { label: 'Sent', count: sent, tone: 'bg-emerald-500' },
    { label: 'Replies', count: replies, tone: 'bg-amber-500' },
  ]
  const max = Math.max(leads, 1)
  return (
    <div className="mt-5">
      <div className="flex h-2.5 w-full gap-1">
        {stages.map((s) => (
          <div key={s.label} style={{ width: `${(s.count / max) * 100}%` }}
            className={cn('h-full rounded-full', s.tone, s.count > 0 && 'min-w-[6px]')} title={`${s.label}: ${s.count}`} />
        ))}
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-2 text-center">
        {stages.map((s) => (
          <div key={s.label}>
            <p className="tabular text-sm font-bold text-zinc-900 dark:text-white">{s.count}</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              <span className={cn('h-1.5 w-1.5 rounded-full', s.tone)} />{s.label}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-zinc-400">
        {sent === 0 ? 'Nothing sent yet — approve a draft to start the pipeline.'
          : replies === 0 ? `${sent} of ${leads} leads mailed — waiting on replies.`
            : `${replies} ${replies === 1 ? 'reply' : 'replies'} from ${sent} sent.`}
      </p>
    </div>
  )
}

type CampaignView = {
  name: string
  summary: string
  role?: string
  status: string
  leads: number
  drafts: number
  sent: number
  replies: number
  replyRate: number
  updatedAt: string | null
  people: { name: string; email: string }[]
}

export default function Campaigns({ query }: { query: string }) {
  const { data } = useLiveData()
  const live = !!data?.live
  const q = query.toLowerCase()

  // Live memory when the backend answers, seeded demo data otherwise.
  const list: CampaignView[] = live
    ? (data?.coverage?.companies ?? []).map((c) => {
        const key = c.name.toLowerCase()
        const mails = (data?.campaigns?.mails ?? []).filter((m) => m.company.toLowerCase() === key)
        const people = (data?.people ?? []).filter((p) => p.company.toLowerCase() === key)
        const sent = mails.filter((m) => m.status === 'sent').length
        const replies = mails.filter((m) => m.reply_class).length
        return {
          name: c.name,
          summary: c.summary,
          status: c.status,
          leads: people.length,
          // 'ready-to-send' is a draft too: it is the state the sender
          // leaves a mail in when it passes the quality gate but has not
          // been approved/sent yet. Counting only 'draft…' hid the four
          // live iion drafts and showed Drafts: 0 on a campaign that had
          // four waiting.
          drafts: mails.filter((m) => m.status.startsWith('draft') || m.status === 'ready-to-send').length,
          sent,
          replies,
          replyRate: sent > 0 ? Math.round((replies / sent) * 100) : 0,
          updatedAt: c.last_sent_at ? new Date(c.last_sent_at * 1000).toISOString() : null,
          people: people.map((p) => ({ name: p.name, email: p.email })),
        }
      })
    : SEED_CAMPAIGNS.map((c) => ({
        name: c.name,
        summary: c.summary,
        role: c.role,
        status: c.status,
        leads: c.leads,
        drafts: SEED_DRAFTS.filter((d) => d.company === c.name).length,
        sent: c.sent,
        replies: c.replies,
        replyRate: c.replyRate,
        updatedAt: c.updatedAt,
        people: SEED_PEOPLE.filter((p) => p.company === c.name).map((p) => ({ name: p.name, email: p.email })),
      }))
  const filtered = list.filter((c) => c.name.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q))

  return (
    <div>
      <PageHeader title="Campaigns" subtitle={live
        ? `Live — ${list.length} ${list.length === 1 ? 'company' : 'companies'} in backend memory.`
        : 'One campaign per company — research, leads, drafts and replies in one place.'}
        actions={<Link to="/chat"><Button variant="brand">+ New campaign</Button></Link>} />
      {!live && <DemoDataNotice />}
      {filtered.length === 0 && (
        <EmptyState
          icon={Building2}
          title={query ? `No campaigns match “${query}”` : 'No campaigns yet'}
          body="Start a campaign from Agent chat — research a company and the agent drafts personalised mails for its verified founders and hiring leads."
          action={<Link to="/chat"><Button variant="brand">+ New campaign</Button></Link>}
        />
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((c, i) => (
          <div key={c.name} className="card card-hover group p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white shadow-sm ring-1 ring-white/10 dark:bg-white dark:text-zinc-900 dark:ring-zinc-900/10">
                  {c.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                    {c.name} <ArrowUpRight className="h-4 w-4 text-zinc-400 transition group-hover:text-brand-500" />
                  </h3>
                  {c.role && <p className="text-xs font-medium text-zinc-500">{c.role}</p>}
                </div>
              </div>
              <Badge tone={c.status} dot={c.status === 'active'}>{c.status}</Badge>
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{c.summary || 'No summary recorded yet.'}</p>
            <PipelineFunnel leads={c.leads} drafts={c.drafts} sent={c.sent} replies={c.replies} />
            <div className="mt-5 flex items-center gap-1">
              <div className="flex -space-x-2">
                {c.people.slice(0, 4).map((p) => <Avatar key={p.email || p.name} name={p.name} size="sm" />)}
              </div>
              {c.people.length > 4 && <span className="ml-1 text-xs font-semibold text-zinc-500">+{c.people.length - 4}</span>}
              <span className="ml-auto text-xs text-zinc-400">{c.updatedAt ? `Updated ${timeAgo(c.updatedAt)}` : 'Not mailed yet'}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-100 rounded-xl bg-zinc-50/80 py-3 text-center ring-1 ring-inset ring-zinc-100 dark:divide-zinc-800 dark:bg-zinc-800/50 dark:ring-zinc-800">
              <div><p className="tabular text-lg font-bold leading-none text-zinc-900 dark:text-white">{c.leads}</p><p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Leads</p></div>
              <div><p className="tabular text-lg font-bold leading-none text-zinc-900 dark:text-white">{c.sent}</p><p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Sent</p></div>
              <div><p className="tabular text-lg font-bold leading-none text-zinc-900 dark:text-white">{c.replyRate}%</p><p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Reply rate</p></div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link to="/leads" className="flex-1"><Button variant="ghost" className="w-full">View leads</Button></Link>
              <Link to="/drafts" className="flex-1"><Button variant="primary" className="w-full">View drafts</Button></Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
