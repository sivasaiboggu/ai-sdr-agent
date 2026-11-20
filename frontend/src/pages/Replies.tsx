import { motion } from 'framer-motion'
import { CalendarClock, Inbox } from 'lucide-react'
import { Avatar, Badge, Card, fadeUp, PageHeader } from '../components/ui'
import { SEED_REPLIES } from '../lib/data'
import { timeAgo } from '../lib/utils'

const LABELS: Record<string, string> = {
  interested: 'Interested — reply and book a call',
  'not-now': 'Not now — follow up in 3–4 weeks',
  bounce: 'Bounce — fix the address, never resend to it',
  'out-of-office': 'Out of office — follow up on the return date',
}

export default function Replies() {
  return (
    <div>
      <PageHeader title="Replies" subtitle="Every reply the tracker sees, classified — with the next step already written for you." />
      <div className="space-y-3">
        {SEED_REPLIES.map((r, i) => (
          <motion.div key={r.id} variants={fadeUp} initial="hidden" animate="show" custom={i} className="card p-5">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar name={r.from} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-zinc-900 dark:text-white">{r.from}</p>
                  <Badge tone={r.classification}>{r.classification}</Badge>
                  <span className="text-xs text-zinc-400">{r.company} · {timeAgo(r.receivedAt)}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">{r.subject}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{r.snippet}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <CalendarClock className="h-3.5 w-3.5" /> Next step: {LABELS[r.classification]}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <Card className="mt-4 flex items-start gap-3 border-dashed p-5">
        <Inbox className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Follow-ups are scheduled 4–5 days after the first mail. The tracker watches Gmail for replies, re-classifies them,
          and records which hooks and subjects got a reply — so the writer gets better with every campaign.
        </p>
      </Card>
    </div>
  )
}
