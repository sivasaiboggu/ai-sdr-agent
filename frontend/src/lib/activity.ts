/**
 * Outreach activity, counted from real mail records — never invented.
 *
 * One bucket per day for the last 7 days, ending today. A mail counts
 * as sent on the day its `sent_at` says it went out. A reply counts on
 * the day its `replied_at` says it arrived; rows recorded before that
 * column existed fall back to the sent day, because the reply arrived
 * after the send and the sent day is the closest true date we have.
 * Mails that were never sent (drafts, blocked, failed) count nowhere.
 */

export type ActivityMail = {
  sent_at: number | null
  status: string
  reply_class: string | null
  replied_at?: number | null
}

export type ActivityDay = { day: string; sent: number; replies: number }

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function buildActivity(mails: ActivityMail[], now = new Date()): ActivityDay[] {
  const days: ActivityDay[] = []
  const index = new Map<string, ActivityDay>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const entry: ActivityDay = {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      sent: 0,
      replies: 0,
    }
    days.push(entry)
    index.set(dayKey(d), entry)
  }
  for (const m of mails) {
    if (m.status !== 'sent' || !m.sent_at) continue
    const sentDay = index.get(dayKey(new Date(m.sent_at * 1000)))
    if (sentDay) sentDay.sent += 1
    if (m.reply_class) {
      // Reply day when we know it, sent day when the row predates it.
      const replyAt = m.replied_at ?? m.sent_at
      const replyDay = index.get(dayKey(new Date(replyAt * 1000)))
      if (replyDay) replyDay.replies += 1
    }
  }
  return days
}
