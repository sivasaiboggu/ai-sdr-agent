import { ArrowUpRight, Building2, Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ActionLink, Badge, DemoDataNotice, EmptyState, LoadingState, PageHeader } from '../components/ui'
import { isPendingMail, sameCompany, SEED_CAMPAIGNS, SEED_DRAFTS, useLiveData } from '../lib/data'
import { timeAgo } from '../lib/utils'

export default function Campaigns({ query }: { query: string }) {
  const { data, loading } = useLiveData()
  const [params] = useSearchParams()
  const company = params.get('company')
  const live = Boolean(data?.live)
  const search = query.toLowerCase().trim()
  const coverageByName = new Map((data?.coverage?.companies ?? []).map((company) => [company.name.toLowerCase(), company]))
  const campaigns = live
    ? (data?.coverage?.companies ?? data?.campaigns?.companies ?? []).map((c) => {
        const key = c.name.toLowerCase()
        const mails = (data?.campaigns?.mails ?? []).filter((m) => m.company.toLowerCase() === key)
        const coverage = coverageByName.get(key)
        const sent = mails.filter((m) => m.status === 'sent').length
        const replies = mails.filter((m) => m.reply_class).length
        return {
          name: c.name, summary: c.summary ?? '', role: undefined, status: coverage?.status ?? (sent ? 'sent' : 'researched'),
          leads: (data?.people ?? []).filter((p) => p.company.toLowerCase() === key).length,
          drafts: mails.filter((m) => isPendingMail(m.status)).length,
          sent, replies,
          replyRate: sent > 0 ? Math.round(replies / sent * 100) : null,
          updatedAt: coverage?.last_sent_at ? new Date(coverage.last_sent_at * 1000).toISOString() : null,
        }
      })
    : SEED_CAMPAIGNS.map((c) => ({
        ...c, drafts: SEED_DRAFTS.filter((d) => d.company === c.name).length,
        replyRate: c.sent ? c.replyRate : null,
      }))
  const filtered = campaigns.filter((c) => (!company || sameCompany(c.name, company)) &&
    (params.get('queue') !== 'review' || c.drafts > 0) &&
    (c.name.toLowerCase().includes(search) || c.summary.toLowerCase().includes(search)))

  return (
    <>
      <PageHeader title="Campaigns" subtitle="One record per company, from the first lead to the latest reply."
        actions={<ActionLink to="/chat" variant="brand"><Plus size={16} /> New campaign</ActionLink>} />
      {loading ? <LoadingState label="Loading campaigns…" /> : (
        <>
          {!live && <DemoDataNotice what="campaigns" />}
          {company && <div className="mb-4 flex flex-wrap items-center gap-3"><span className="text-sm">Company · <strong>{company}</strong></span><Link to="/campaigns" className="text-link">Show all campaigns</Link></div>}
          <nav className="record-tabs" aria-label="Campaign status">
            <Link to={company ? `?company=${encodeURIComponent(company)}` : '/campaigns'} aria-current={params.get('queue') !== 'review' ? 'page' : undefined}>All records</Link>
            <Link to={`?queue=review${company ? `&company=${encodeURIComponent(company)}` : ''}`} aria-current={params.get('queue') === 'review' ? 'page' : undefined}>Needs review</Link>
          </nav>
          {filtered.length === 0 ? (
            <EmptyState icon={Building2} title={search || company ? 'No matching campaigns' : 'No campaigns yet'}
              body={search || company ? 'Clear your search or choose another company.' : 'Research a company in Agent chat to start a campaign.'}
              action={!search && !company && <ActionLink to="/chat" variant="brand">Research a company</ActionLink>} />
          ) : (
            <div className="campaign-index record-enter" key={params.get('queue') ?? 'all'}>
              {filtered.map((c) => {
                const target = `?company=${encodeURIComponent(c.name)}`
                return (
                  <article key={c.name} className="campaign-line panel">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2>{c.name}</h2><Badge dot tone={c.status} className="capitalize">{c.status}</Badge>
                      </div>
                      {c.role && <p className="mt-1 text-sm font-medium">{c.role}</p>}
                      <p className="mt-2 max-w-prose text-sm text-muted">{c.summary || 'No company summary recorded.'}</p>
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                        <Link className="text-link" to={`/leads${target}`}>View leads <ArrowUpRight size={14} /></Link>
                        <Link className="text-link" to={`/drafts${target}`}>View drafts <ArrowUpRight size={14} /></Link>
                        {c.replies > 0 && <Link className="text-link" to={`/replies${target}`}>View replies <ArrowUpRight size={14} /></Link>}
                      </div>
                    </div>
                    <div>
                      <dl className="campaign-counts tabular">
                        {([['Leads', c.leads], ['Drafts', c.drafts], ['Sent', c.sent], ['Replies', c.replies]] as const)
                          .map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}
                      </dl>
                      <p className="mt-2 text-xs text-muted md:pl-5">
                        {c.replyRate === null ? 'No sends recorded' : `${c.replyRate}% reply rate`}
                        {c.sent > 0 && c.updatedAt && ` · Last sent ${timeAgo(c.updatedAt)}`}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}
    </>
  )
}
