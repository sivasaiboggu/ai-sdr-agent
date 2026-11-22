import { ArrowDownRight, ArrowRight, ArrowUpRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActivityChart, ReplyBreakdown } from '../components/charts'
import { ActionLink, Alert, Badge, CardHeader, DemoDataNotice, LoadingState, PageHeader, PipelineSteps, type PipelineStepState } from '../components/ui'
import { AGENT_STEPS, SEED_CAMPAIGNS, SEED_DRAFTS, SEED_PEOPLE, useLiveData, type Health } from '../lib/data'
import { buildActivity } from '../lib/activity'
import { replyRecords, replyTypes } from '../lib/replies'
import { timeAgo } from '../lib/utils'

export default function Dashboard({ health }: { health: Health | null }) {
  const { data, loading } = useLiveData()
  const live = Boolean(data?.live)
  const mails = data?.campaigns?.mails ?? []
  const people = live ? data?.people ?? [] : SEED_PEOPLE
  const companies = live ? data?.coverage?.companies ?? data?.campaigns?.companies ?? [] : SEED_CAMPAIGNS
  const verified = people.filter((person) => person.verified).length
  const sent = live ? mails.filter((mail) => mail.status === 'sent').length : SEED_CAMPAIGNS.reduce((sum, company) => sum + company.sent, 0)
  const draftCount = live ? mails.filter((mail) => mail.status.startsWith('draft') || mail.status === 'ready-to-send').length : SEED_DRAFTS.length
  const replies = replyRecords(live ? data?.campaigns ?? { companies: [], mails: [] } : null)
  const interested = replies.filter((reply) => reply.classification === 'interested').length
  const bounces = replies.filter((reply) => reply.classification === 'bounce').length
  const activity = buildActivity(mails)

  const steps: Record<string, PipelineStepState> = {
    research: companies.length ? 'done' : 'queued',
    people: people.length ? 'done' : 'queued',
    writer: mails.length || draftCount ? 'done' : 'queued',
    approval: draftCount ? 'waiting' : sent ? 'done' : 'queued',
    sender: sent ? 'done' : 'queued',
    tracker: replies.length ? 'done' : 'queued',
  }

  return (
    <>
      <PageHeader title="Overview" subtitle="See what’s ready for review and what happened after you sent it."
        actions={<ActionLink to="/chat" variant="brand"><Plus size={16} /> New campaign</ActionLink>} />
      {loading ? <LoadingState label="Loading your outreach records…" /> : (
        <>
          {!live && <DemoDataNotice what="campaigns, leads, drafts and replies" />}
          {live && health && !health.gmail_configured && (
            <div className="mb-4"><Alert tone="warning"><span><strong>Gmail needs setup.</strong> Drafts stay available for review.</span></Alert></div>
          )}
          <div className="split overview-top">
            <section className="overview-action ruled">
              <p className="eyebrow">Next up</p>
              <h2>{draftCount ? `${draftCount} ${draftCount === 1 ? 'draft' : 'drafts'} to review` : companies.length ? 'Start another campaign' : 'Research your first company'}</h2>
              <p>{draftCount ? 'Read the drafts and check the recipients before approving.' : 'Give the agent a company name to start a campaign.'}</p>
              <Link to={draftCount ? '/drafts' : '/chat'} className="text-link mt-4">
                {draftCount ? 'Review drafts' : 'Open agent chat'}<ArrowRight size={15} aria-hidden="true" />
              </Link>
            </section>
            <section className="panel ruled h-full">
              <CardHeader title="Latest replies" action={<Link to="/replies" className="text-link">All replies <ArrowUpRight size={14} /></Link>} />
              {!replies.length && <p className="p-5 text-sm text-muted">No classified replies yet.</p>}
              {replies.slice(0, 3).map((reply) => (
                <article key={reply.id} className="ledger-row px-5 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <strong className="text-sm">{reply.from}</strong>
                    <Badge tone={reply.classification} dot>{replyTypes[reply.classification].label}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{reply.company}{reply.receivedAt && ` · ${timeAgo(reply.receivedAt)}`}</p>
                </article>
              ))}
            </section>
          </div>

          <dl className="summary-strip tabular" aria-label="Outreach totals">
            {[
              ['Campaigns', companies.length],
              ['Verified leads', `${verified} / ${people.length}`],
              ['Mails sent', sent],
              ['Replies logged', replies.length],
            ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>

          <div className="split overview-records">
            <section className="panel">
              <CardHeader title="Outreach activity" subtitle="Last seven days" />
              {live ? <ActivityChart data={activity} /> : (
                <div className="activity-empty">
                  <ArrowDownRight size={20} className="text-muted" aria-hidden="true" />
                  <h3>No send history in demo mode</h3>
                  <p className="text-muted">The chart uses dated mail records from the backend.</p>
                </div>
              )}
            </section>
            <section className="panel">
              <CardHeader title="Reply breakdown" subtitle={replies.length ? `${interested} interested · ${bounces} ${bounces === 1 ? 'bounce' : 'bounces'}` : undefined} />
              <ReplyBreakdown replies={replies} />
            </section>
          </div>

          <section className="panel">
            <CardHeader title="Outreach pipeline" subtitle="Progress across your saved campaigns."
              action={<Link to="/chat" className="text-link">Agent chat <ArrowUpRight size={14} /></Link>} />
            <PipelineSteps steps={AGENT_STEPS} stateFor={(key) => steps[key] ?? 'queued'} />
          </section>
        </>
      )}
    </>
  )
}
