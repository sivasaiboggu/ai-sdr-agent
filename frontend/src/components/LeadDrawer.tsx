import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BadgeCheck, Check, Copy, ExternalLink, Linkedin, Mail, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, Badge, Button } from './ui'
import { SEED_DRAFTS, SEED_PEOPLE, type Person } from '../lib/data'

/** Qualitative role tier — the same rule as backend lead_score(), used only
 * to explain in words why a lead ranks where it does. No invented points:
 * the stored score is shown as-is and the factors below are labels, not
 * arithmetic. */
export function roleTier(title: string): string {
  const t = (title || '').toLowerCase()
  if (t.includes('founder') || t.includes('ceo')) return 'Founder / CEO — highest outreach priority'
  if (t.includes('cto') || t.includes('cpo') || t.includes('chief technology') || t.includes('chief product')) return 'C-level technical decision-maker'
  if (t.includes('coo') || t.includes('cfo') || t.includes('chief')) return 'C-level decision-maker'
  if (t.includes('talent') || t.includes('people') || t.includes('hr') || t.includes('hiring') || t.includes('recruit')) return 'Hiring lead — owns the process'
  if (t.includes('vp') || t.includes('vice president') || t.includes('director') || t.includes('head of')) return 'Senior decision-maker'
  return 'Contact at the company'
}

/** Slide-over with everything known about one lead: contact details,
 * score and why it ranks there, the draft mail written for them (if any),
 * and the other leads at the same company. All data comes from the seeded
 * verified research — nothing is invented here. */
export default function LeadDrawer({ person, onClose, onSelect, onToast }: {
  person: Person | null
  onClose: () => void
  onSelect: (p: Person) => void
  onToast: (msg: string) => void
}) {
  useEffect(() => {
    if (!person) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [person, onClose])

  const draft = person ? SEED_DRAFTS.find((d) => d.to.toLowerCase() === person.email.toLowerCase()) : undefined
  const peers = person ? SEED_PEOPLE.filter((p) => p.company === person.company && p.email !== person.email) : []

  async function copyEmail() {
    if (!person?.email) return
    try {
      await navigator.clipboard.writeText(person.email)
      onToast(`Copied ${person.email}`)
    } catch {
      onToast('Copy failed — select the address manually.')
    }
  }

  return (
    <AnimatePresence>
      {person && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm" onClick={onClose} />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto bg-white shadow-pop dark:bg-zinc-900 sm:max-w-md"
            role="dialog" aria-modal="true" aria-label={`Lead details for ${person.name}`}>
            <div className="flex items-start gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <Avatar name={person.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-zinc-900 dark:text-white">{person.name}</p>
                <p className="truncate text-sm text-zinc-500">{person.title}</p>
                <p className="truncate text-sm font-medium text-zinc-600 dark:text-zinc-300">{person.company}</p>
              </div>
              <button onClick={onClose} aria-label="Close lead details" className="btn-ghost !px-2.5">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6 p-5">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Lead score</h3>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${person.score}%` }} />
                  </div>
                  <span className="text-lg font-bold text-zinc-900 dark:text-white">{person.score}</span>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{roleTier(person.title)}</li>
                  <li className="flex items-start gap-2">
                    {person.verified
                      ? <><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />Verified email — safe to mail</>
                      : <><Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />No verified email — LinkedIn only, never mailed</>}
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Contact</h3>
                <div className="mt-2 space-y-2">
                  {person.email ? (
                    <div className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
                      <Mail className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-800 dark:text-zinc-100">{person.email}</span>
                      <button onClick={copyEmail} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10">
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </button>
                    </div>
                  ) : (
                    <p className="rounded-xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-500 dark:bg-zinc-800">No verified email on file for this person.</p>
                  )}
                  {person.linkedin && (
                    <a href={`https://www.linkedin.com/in/${person.linkedin}/`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-zinc-700 dark:text-zinc-200">
                      <Linkedin className="h-4 w-4 shrink-0 text-zinc-400" /> linkedin.com/in/{person.linkedin}
                      <ExternalLink className="ml-auto h-3.5 w-3.5 text-zinc-400" />
                    </a>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Draft mail</h3>
                {draft ? (
                  <div className="mt-2 rounded-xl border border-zinc-200 p-3.5 dark:border-zinc-700">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{draft.subject}</p>
                    <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{draft.body}</p>
                    <Link to="/drafts" onClick={onClose} className="mt-2.5 inline-block">
                      <Button variant="ghost">Open in Drafts →</Button>
                    </Link>
                  </div>
                ) : (
                  <p className="mt-2 rounded-xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-500 dark:bg-zinc-800">
                    No draft written for this person yet — research {person.company} in Agent chat to draft one.
                  </p>
                )}
              </section>

              {peers.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Other leads at {person.company}</h3>
                  <div className="mt-2 space-y-1">
                    {peers.map((p) => (
                      <button key={p.email || p.name} onClick={() => onSelect(p)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800">
                        <Avatar name={p.name} size="sm" />
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{p.name}</span>
                          <span className="block truncate text-xs text-zinc-500">{p.title}</span></span>
                        {p.verified && <Badge tone="verified"><BadgeCheck className="h-3 w-3" /> Verified</Badge>}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
