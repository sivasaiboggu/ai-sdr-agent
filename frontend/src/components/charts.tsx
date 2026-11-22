import type { buildActivity } from '../lib/activity'
import { replyTypes, type ReplyType } from '../lib/replies'

export function ActivityChart({ data }: { data: ReturnType<typeof buildActivity> }) {
  const max = Math.max(1, ...data.flatMap(({ sent, replies }) => [sent, replies]))
  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap gap-4 text-xs text-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-2"><span className="chart-key" />Sent</span>
        <span className="inline-flex items-center gap-2"><span className="chart-key chart-key--replies" />Replies</span>
      </div>
      <ul className="activity-plot" aria-label="Daily outreach activity">
        {data.map(({ day, sent, replies }) => (
          <li key={day} title={`${day}: ${sent} sent, ${replies} replies`}>
            <div className="bars" aria-hidden="true">
              <span className="bar" style={{ height: `${sent / max * 100}%` }} />
              <span className="bar bar--replies" style={{ height: `${replies / max * 100}%` }} />
            </div>
            <span>{day}<span className="sr-only">{`: ${sent} sent, ${replies} replies`}</span></span>
          </li>
        ))}
      </ul>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold">Daily counts</summary>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-muted"><tr><th scope="col">Day</th><th scope="col">Sent</th><th scope="col">Replies</th></tr></thead>
          <tbody>{data.map((day) => <tr key={day.day}><th scope="row">{day.day}</th><td>{day.sent}</td><td>{day.replies}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  )
}

export function ReplyBreakdown({ replies }: { replies: { classification: ReplyType }[] }) {
  if (replies.length === 0) return <p className="p-5 text-sm text-muted">Classified replies will appear here.</p>
  return (
    <ul className="px-5 py-2">
      {(Object.keys(replyTypes) as ReplyType[]).map((key) => {
        const count = replies.filter((reply) => reply.classification === key).length
        if (key === 'other' && count === 0) return null
        return (
          <li key={key} className="breakdown-row ledger-row">
            <span>{replyTypes[key].label}</span>
            <span className="breakdown-track" aria-hidden="true">
              <span className={`tone-${replyTypes[key].tone}`} style={{ width: `${count / replies.length * 100}%` }} />
            </span>
            <strong className="tabular">{count}</strong>
          </li>
        )
      })}
    </ul>
  )
}
