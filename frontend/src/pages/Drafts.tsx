import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Clock, Paperclip, Send } from 'lucide-react'
import { Avatar, Badge, Button, Card, fadeUp, PageHeader } from '../components/ui'
import { SEED_DRAFTS, type Draft } from '../lib/data'
import { cn } from '../lib/utils'

export default function Drafts({ onToast }: { onToast: (msg: string) => void }) {
  const [open, setOpen] = useState<string | null>(SEED_DRAFTS[0]?.to ?? null)
  const [approved, setApproved] = useState<Set<string>>(new Set())

  function approve(d: Draft) {
    setApproved((s) => new Set(s).add(d.to))
    onToast(`Draft to ${d.name} approved — it will send with the 5-minute gap.`)
  }

  return (
    <div>
      <PageHeader title="Draft mails" subtitle="Personalised from real research. Nothing sends without your approval — approve a draft and the sender takes it from there."
        actions={<Badge tone="warning"><Clock className="h-3 w-3" /> Approval required</Badge>} />
      <div className="space-y-3">
        {SEED_DRAFTS.map((d, i) => {
          const isOpen = open === d.to
          const isApproved = approved.has(d.to)
          return (
            <motion.div key={d.to} variants={fadeUp} initial="hidden" animate="show" custom={i} className="card overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : d.to)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                <Avatar name={d.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    To: {d.name} <span className="font-normal text-zinc-400">&lt;{d.to}&gt;</span>
                  </p>
                  <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{d.subject}</p>
                </div>
                <Badge tone={d.company === 'iion' ? 'active' : 'muted'}>{d.company}</Badge>
                {isApproved && <Badge tone="interested"><Check className="h-3 w-3" /> Approved</Badge>}
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-zinc-400 transition-transform', isOpen && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
                    <div className="border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Subject: {d.subject}</p>
                      <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 font-sans text-sm leading-relaxed text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">{d.body}</pre>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500"><Paperclip className="h-3.5 w-3.5" /> Sivasai_Boggu_Resume.pdf attached</span>
                        <span className="ml-auto flex gap-2">
                          <Button variant="ghost" onClick={() => onToast('Edit mode — change the hook or proof, then approve again.')}>Edit draft</Button>
                          <Button variant={isApproved ? 'primary' : 'brand'} disabled={isApproved} onClick={() => approve(d)}>
                            <Send className="h-4 w-4" /> {isApproved ? 'Approved ✓' : 'Approve & send'}
                          </Button>
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
      <Card className="mt-4 border-dashed p-5 text-sm text-zinc-500 dark:text-zinc-400">
        Sending is rate-limited to one mail every 5 minutes, and every send is logged with its Gmail message ID so you can trace it in Sent.
      </Card>
    </div>
  )
}
