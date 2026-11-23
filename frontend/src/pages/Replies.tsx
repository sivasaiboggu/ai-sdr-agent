import { Inbox } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ActionLink, Badge, CardHeader, DemoDataNotice, EmptyState, LoadingState, PageHeader } from '../components/ui'
import { ReplyBreakdown } from '../components/charts'
import { sameCompany, useLiveData } from '../lib/data'
import { replyRecords, replyTypes, type ReplyType } from '../lib/replies'
import { timeAgo } from '../lib/utils'

export default function Replies() {
  const { data, loading } = useLiveData()
  const live = Boolean(data?.live)
  const [params, setParams] = useSearchParams()
  const company = params.get('company')
  const category = params.get('class') ?? ''
  const all = replyRecords(live ? data?.campaigns ?? { companies: [], mails: [] } : null)
    .filter((reply) => !company || sameCompany(reply.company, company))
  const replies = all.filter((reply) => !category || reply.classification === category)

  return (
    <>
      <PageHeader title="Replies" subtitle="See how each reply was classified and decide what to do next." />
      {loading ? <LoadingState label="Loading replies…" /> : (
        <>
          {!live && <DemoDataNotice what="replies" />}
          {company && <div className="mb-4 flex flex-wrap items-center gap-3"><strong>{company}</strong><Link className="text-link" to="/replies">All companies</Link></div>}
          {all.length === 0 ? (
            <EmptyState icon={Inbox} title="No replies yet" body="Replies appear here after the tracker classifies them."
              action={<ActionLink to="/drafts">Review drafts</ActionLink>} />
          ) : (
            <div className="split">
              <section className="panel ruled">
                <CardHeader title="Reply log" subtitle={`${replies.length} of ${all.length} ${all.length === 1 ? 'reply' : 'replies'}`}
                  action={<select className="input" aria-label="Filter replies" value={category}
                    onChange={(event) => {
                      const next = new URLSearchParams(params)
                      if (event.target.value) next.set('class', event.target.value)
                      else next.delete('class')
                      setParams(next, { replace: true })
                    }}>
                    <option value="">All classifications</option>
                    {(Object.keys(replyTypes) as ReplyType[]).map((key) => <option key={key} value={key}>{replyTypes[key].label}</option>)}
                  </select>} />
                {!replies.length && <p className="p-5 text-muted">No replies match this classification.</p>}
                {replies.map((reply) => {
                  const category = replyTypes[reply.classification]
                  return (
                    <article className="reply-entry ledger-row record-enter" key={reply.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{reply.from}</p>
                          <p className="text-xs text-muted">{reply.company}{reply.receivedAt && ` · ${timeAgo(reply.receivedAt)}`}</p>
                        </div>
                        <Badge tone={reply.classification} dot>{category.label}</Badge>
                      </div>
                      <h3 className="mt-3 break-words text-lg font-semibold">{reply.subject}</h3>
                      {reply.snippet && <p className="mt-2 max-w-prose text-sm text-muted">{reply.snippet}</p>}
                      <div className="reply-next">
                        <p className="eyebrow">Next step</p>
                        <p className="text-sm">{category.next}</p>
                      </div>
                    </article>
                  )
                })}
              </section>
              <section className="panel"><CardHeader title="Reply breakdown" /><ReplyBreakdown replies={all} /></section>
            </div>
          )}
        </>
      )}
    </>
  )
}
