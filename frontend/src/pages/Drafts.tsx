import { useRef, useState } from 'react'
import { Check, Clock, Mail, PenLine, Send } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ActionLink, Avatar, Badge, Button, CardHeader, DemoDataNotice, EmptyState, LoadingState, PageHeader } from '../components/ui'
import { approveCompany, invalidateLiveData, SEED_DRAFTS, useLiveData, type Draft } from '../lib/data'
import type { ToastTone } from '../App'

function draftKey(draft: Draft) {
  return `${draft.company ?? ''}:${draft.to}`
}

export default function Drafts({ onToast }: { onToast: (message: string, tone?: ToastTone) => void }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data, loading } = useLiveData()
  const live = Boolean(data?.live)
  const [approved, setApproved] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState<string | null>(null)
  const inFlight = useRef(false)
  const company = params.get('company')
  const selectedTo = params.get('to')
  const receiving = data?.campaigns?.mails ?? []
  const allDrafts: Draft[] = live ? receiving
    .filter((mail) => mail.status.startsWith('draft') || mail.status === 'ready-to-send')
    .map((mail) => ({ to: mail.email, name: mail.recipient, subject: mail.subject, body: mail.body, company: mail.company }))
    : SEED_DRAFTS
  const drafts = company ? allDrafts.filter((draft) => draft.company?.toLowerCase() === company.toLowerCase()) : allDrafts
  const selected = drafts.find((draft) => draft.to === selectedTo) ?? drafts[0]
  const isApproved = selected && approved.has(draftKey(selected))

  function rewrite(draft: Draft) {
    try {
      sessionStorage.setItem('sdr-pending-chat',
        `Rewrite the draft mail for ${draft.name} at ${draft.company ?? 'this company'} — keep the hook from the research, tighten the wording, no new facts.`)
    } catch { /* Storage is optional. */ }
    navigate('/chat')
  }

  async function approve(draft: Draft) {
    if (inFlight.current || !draft.company) return
    inFlight.current = true
    setSending(draftKey(draft))
    try {
      const result = await approveCompany(draft.company)
      const accepted = result.sent.filter(({ status }) => status === 'sent' || status === 'draft (dry-run)')
      const sent = accepted.filter(({ status }) => status === 'sent').length
      const dryRuns = accepted.length - sent
      const unsent = result.sent.length - accepted.length
      if (accepted.length) {
        setApproved((current) => new Set([...current, ...accepted.map(({ to }) => draftKey({ ...draft, to }))]))
        invalidateLiveData()
      }
      const status = [sent && `${sent} sent`, dryRuns && `${dryRuns} recorded as dry runs`, unsent && `${unsent} could not send`].filter(Boolean).join(', ')
      const details = result.sent.find((entry) => !accepted.includes(entry))?.status
      onToast(status ? `${draft.company}: ${status}.${details ? ` First issue: ${details}.` : ''}` : 'The backend returned no send results.',
        unsent || !accepted.length ? 'error' : 'success')
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Couldn’t approve the drafts. Try again.', 'error')
    } finally {
      inFlight.current = false
      setSending(null)
    }
  }

  return (
    <>
      <PageHeader title="Draft mails" subtitle="Read the copy and check the recipient before approving outreach."
        actions={<Badge tone="warning"><Clock size={15} /> Approval required</Badge>} />
      {loading ? <LoadingState label="Loading draft mails…" /> : (
        <>
          {!live && <DemoDataNotice what="draft mails" />}
          {company && <div className="mb-4 flex flex-wrap items-center gap-3 text-sm"><strong>{company}</strong><Link to="/drafts" className="text-link">Show all drafts</Link></div>}
          {!selected ? (
            <EmptyState icon={Mail} title="No drafts waiting" body="Ask the agent to research a company and write drafts for its verified contacts."
              action={<ActionLink to="/chat" variant="brand">Research a company</ActionLink>} />
          ) : (
            <div className="draft-layout">
              <section className="panel ruled">
                <CardHeader title="Review queue" subtitle={`${drafts.length} ${drafts.length === 1 ? 'draft' : 'drafts'}`} />
                {drafts.map((draft) => (
                  <button className="draft-selector" type="button" key={draftKey(draft)} aria-pressed={draft === selected}
                    onClick={() => setParams(company ? { company, to: draft.to } : { to: draft.to }, { replace: true })}>
                    <span className="min-w-0">
                      <strong className="block break-words leading-tight">{draft.name}</strong>
                      <span className="mt-1 block text-sm text-muted">{draft.company}</span>
                    </span>
                    {approved.has(draftKey(draft)) && <Check size={16} className="text-success" aria-label="Approved" />}
                  </button>
                ))}
              </section>
              <article className="panel">
                <header className="border-b border-rule p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <Avatar name={selected.name} />
                    <div className="min-w-0">
                      <p className="font-semibold">To {selected.name}</p>
                      <p className="break-all font-mono text-xs text-muted">{selected.to}</p>
                    </div>
                  </div>
                  <h2 className="section-title mt-4 break-words">{selected.subject}</h2>
                </header>
                <div className="p-5 sm:p-6"><p className="letter whitespace-pre-wrap">{selected.body}</p></div>
                <footer className="border-t border-rule p-5 sm:p-6">
                  <p className="mb-4 text-sm text-muted">Approval runs for the whole company. The backend controls the send interval and résumé attachment.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => rewrite(selected)}><PenLine size={15} /> Rewrite in chat</Button>
                    <Button variant="brand" disabled={Boolean(sending) || Boolean(isApproved) || !selected.company} onClick={() => approve(selected)}>
                      {isApproved ? <Check size={16} /> : <Send size={16} />}
                      {isApproved ? 'Approved' : sending ? 'Approving…' : 'Approve company drafts'}
                    </Button>
                  </div>
                </footer>
              </article>
            </div>
          )}
        </>
      )}
    </>
  )
}
