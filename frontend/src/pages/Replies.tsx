import { Inbox } from 'lucide-react'
import { ActionLink, Badge, CardHeader, DemoDataNotice, EmptyState, LoadingState, PageHeader } from '../components/ui'
import { ReplyBreakdown } from '../components/charts'
import { useLiveData } from '../lib/data'
import { replyRecords, replyTypes } from '../lib/replies'
import { timeAgo } from '../lib/utils'

export default function Replies() {
  const { data, loading } = useLiveData()
  const live = Boolean(data?.live)
  const replies = replyRecords(live ? data?.campaigns ?? { companies: [], mails: [] } : null)

  return (
    <>
      <PageHeader title="Replies" subtitle="See how each reply was classified and decide what to do next." />
      {loading ? <LoadingState label="Loading replies…" /> : (
        <>
          {!live && <DemoDataNotice what="replies" />}
          {replies.length === 0 ? (
            <EmptyState icon={Inbox} title="No replies yet" body="Replies appear here after the tracker classifies them."
              action={<ActionLink to="/drafts">Review drafts</ActionLink>} />
          ) : (
            <div className="split">
              <section className="panel ruled">
                <CardHeader title="Reply log" subtitle={`${replies.length} ${replies.length === 1 ? 'record' : 'records'}`} />
                {replies.map((reply) => {
                  const category = replyTypes[reply.classification]
                  return (
                    <article className="ledger-row p-5" key={reply.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{reply.from}</p>
                          <p className="text-xs text-muted">{reply.company}{reply.receivedAt && ` · ${timeAgo(reply.receivedAt)}`}</p>
                        </div>
                        <Badge tone={reply.classification} dot>{category.label}</Badge>
                      </div>
                      <h3 className="mt-3 break-words text-lg font-semibold">{reply.subject}</h3>
                      {reply.snippet && <p className="mt-2 max-w-prose text-sm text-muted">{reply.snippet}</p>}
                      <div className="mt-4 border-t border-rule pt-3">
                        <p className="eyebrow">Next step</p>
                        <p className="text-sm">{category.next}</p>
                      </div>
                    </article>
                  )
                })}
              </section>
              <section className="panel"><CardHeader title="Reply breakdown" /><ReplyBreakdown replies={replies} /></section>
            </div>
          )}
        </>
      )}
    </>
  )
}
