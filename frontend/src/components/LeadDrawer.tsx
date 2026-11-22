import { useEffect, useRef } from 'react'
import { Copy, ExternalLink, Linkedin, Mail, X } from 'lucide-react'
import { ActionLink, Avatar, Badge, Button } from './ui'
import type { Person } from '../lib/data'
import type { ToastTone } from '../App'

export function roleTier(title: string): string {
  const t = (title || '').toLowerCase()
  if (t.includes('founder') || t.includes('ceo')) return 'Founder / CEO — highest outreach priority'
  if (t.includes('cto') || t.includes('cpo') || t.includes('chief technology') || t.includes('chief product')) return 'C-level technical decision-maker'
  if (t.includes('coo') || t.includes('cfo') || t.includes('chief')) return 'C-level decision-maker'
  if (t.includes('talent') || t.includes('people') || t.includes('hr') || t.includes('hiring') || t.includes('recruit')) return 'Hiring lead — owns the process'
  if (t.includes('vp') || t.includes('vice president') || t.includes('director') || t.includes('head of')) return 'Senior decision-maker'
  return 'Contact at the company'
}

export default function LeadDrawer({ person, draft, peers, onClose, onSelect, onToast }: {
  person: Person | null
  draft?: { subject: string; body: string }
  peers: Person[]
  onClose: () => void
  onSelect: (person: Person) => void
  onToast: (message: string, tone?: ToastTone) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const open = Boolean(person)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email)
      onToast('Email address copied.')
    } catch {
      onToast('Couldn’t copy the email. Select the address to copy it.', 'error')
    }
  }

  return (
    <dialog ref={dialogRef} className="modal modal--drawer" aria-labelledby="lead-title"
      onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      {person && (
        <>
          <header className="flex items-start gap-3 border-b border-rule p-5">
            <Avatar name={person.name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Lead record</p>
              <h2 className="section-title mt-1 break-words" id="lead-title">{person.name}</h2>
              <p className="mt-1 text-sm text-muted">{person.title} · {person.company}</p>
            </div>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close lead details"><X size={18} /></button>
          </header>
          <div className="space-y-6 p-5">
            <section className="ruled pt-4">
              <h3 className="section-title">Contact</h3>
              <Badge className="mt-2" tone={person.verified ? 'verified' : 'muted'} dot>{person.verified ? 'Verified email' : 'Unverified'}</Badge>
              {person.email ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-y border-rule py-3">
                  <Mail size={16} className="text-muted" />
                  <span className="flex-1 break-all font-mono text-xs">{person.email}</span>
                  <Button onClick={() => copyEmail(person.email)}><Copy size={15} /> Copy</Button>
                </div>
              ) : <p className="mt-2 text-sm text-muted">No verified email on file.</p>}
              {person.linkedin && (
                <a className="text-link mt-3" href={`https://www.linkedin.com/in/${encodeURIComponent(person.linkedin)}/`} target="_blank" rel="noreferrer">
                  <Linkedin size={16} /> LinkedIn profile <ExternalLink size={14} />
                </a>
              )}
            </section>
            <section className="border-t border-rule pt-4">
              <h3 className="section-title">Lead score</h3>
              <div className="score-line mt-3">
                <meter min={0} max={100} value={person.score} aria-label="Lead score" />
                <span className="font-semibold tabular" aria-hidden="true">{person.score}</span>
              </div>
              <p className="mt-2 text-sm text-muted">{roleTier(person.title)}</p>
            </section>
            <section className="border-t border-rule pt-4">
              <h3 className="section-title">Draft mail</h3>
              {draft ? (
                <div className="mt-3">
                  <p className="font-semibold">{draft.subject}</p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted">{draft.body}</p>
                  <ActionLink to={`/drafts?company=${encodeURIComponent(person.company)}&to=${encodeURIComponent(person.email)}`} onClick={onClose} className="mt-3">Open draft</ActionLink>
                </div>
              ) : <p className="mt-2 text-sm text-muted">No draft on file for this person.</p>}
            </section>
            {peers.length > 0 && (
              <section className="border-t border-rule pt-4">
                <h3 className="section-title">Other leads at {person.company}</h3>
                <ul className="mt-2">
                  {peers.map((peer) => (
                    <li key={peer.email || peer.name} className="ledger-row py-2">
                      <button type="button" className="lead-link flex w-full items-center gap-3" onClick={() => onSelect(peer)}>
                        <Avatar name={peer.name} size="sm" /><span>{peer.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </>
      )}
    </dialog>
  )
}
