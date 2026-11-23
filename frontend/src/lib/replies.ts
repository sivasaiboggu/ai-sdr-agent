import { SEED_REPLIES, type CampaignsResponse, type ReplyItem } from './data'

export const replyTypes = {
  interested: { label: 'Interested', next: 'Reply and suggest a time to talk.', tone: 'success' },
  'not-now': { label: 'Not now', next: 'Follow up in three to four weeks.', tone: 'warning' },
  bounce: { label: 'Bounce', next: 'Keep this address out of future outreach.', tone: 'danger' },
  'out-of-office': { label: 'Out of office', next: 'Follow up after the recipient returns.', tone: 'info' },
  other: { label: 'Other', next: 'Read the thread before deciding whether to follow up.', tone: 'muted' },
} as const

export type ReplyType = keyof typeof replyTypes
type ReplyRecord = Omit<ReplyItem, 'receivedAt' | 'classification'> & { receivedAt: string | null; classification: ReplyType }

function classify(value: string): ReplyType {
  const key = value.trim().toLowerCase().replace(/ /g, '-')
  return Object.prototype.hasOwnProperty.call(replyTypes, key) ? key as ReplyType : 'other'
}

export function replyRecords(campaigns: CampaignsResponse | null | undefined): ReplyRecord[] {
  if (!campaigns) return SEED_REPLIES
  return campaigns.mails.flatMap((mail, index) => mail.reply_class ? [{
    id: mail.id?.toString() ?? `${mail.company}-${mail.email}-${index}`,
    from: mail.recipient,
    company: mail.company,
    subject: mail.subject,
    classification: classify(mail.reply_class),
    snippet: '',
    receivedAt: mail.replied_at ? new Date(mail.replied_at * 1000).toISOString() : null,
  }] : []).sort((a, b) => (b.receivedAt ?? '').localeCompare(a.receivedAt ?? ''))
}
