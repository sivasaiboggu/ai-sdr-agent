import { useRef, useState, type FormEvent } from 'react'
import { Check, Clock, Mail, PenLine, Send } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ActionLink, Avatar, Badge, Button, CardHeader, DemoDataNotice, EmptyState, LoadingState, PageHeader } from '../components/ui'
import { approveCompany, invalidateLiveData, isPendingMail, sameCompany, saveDraft, SEED_DRAFTS, useLiveData, type Draft, type Health } from '../lib/data'
import type { ToastTone } from '../App'

function draftKey(draft: Draft) {
  return draft.id === undefined ? `${draft.company ?? ''}:${draft.to}` : String(draft.id)
}

export default function Drafts({ onToast, health }: {
  onToast: (message: string, tone?: ToastTone) => void
  health?: Health | null
}) {
  const [params, setParams] = useSearchParams()
  const { data, loading } = useLiveData()
  const live = Boolean(data?.live)
  const [acceptedKeys, setAcceptedKeys] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const inFlight = useRef(false)
  const [edit, setEdit] = useState<{ id: number; subject: string; body: string } | null>(null)
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  const company = params.get('company')
  const selectedTo = params.get('to')
  const selection = params.get('draft')
  const allDrafts: Draft[] = live ? (data?.campaigns?.mails ?? [])
    .filter((mail) => isPendingMail(mail.status))
    .map((mail) => ({ id: mail.id, to: mail.email, name: mail.recipient, subject: mail.subject, body: mail.body, company: mail.company, status: mail.status }))
    : SEED_DRAFTS
  const pending = allDrafts.filter((draft) => !acceptedKeys.has(draftKey(draft)))
  const drafts = company ? pending.filter((draft) => sameCompany(draft.company, company)) : pending
  const selected = drafts.find((draft) => draftKey(draft) === selection) ?? drafts.find((draft) => draft.to === selectedTo) ?? drafts[0]
  const batch = selected ? pending.filter((draft) => sameCompany(draft.company, selected.company)) : []
  const sendMode = health?.gmail_send_enabled
    ? health.gmail_configured ? 'Approval sends these drafts through Gmail.' : 'Gmail sending is on. Set up Gmail before approving.'
    : health ? 'Gmail is in dry-run mode. Approval records the result.' : null
  const editing = edit && edit.id === selected?.id ? edit : null

  function select(draft: Draft) {
    setEdit(null)
    setEditError('')
    const next = new URLSearchParams(params)
    next.delete('to')
    next.set('draft', draftKey(draft))
    setParams(next, { replace: true })
  }

  async function commitEdit(event: FormEvent) {
    event.preventDefault()
    if (!editing || !selected || inFlight.current) return
    if (!editing.subject.trim() || !editing.body.trim()) {
      setEditError('Enter a subject and message.')
      return
    }
    inFlight.current = true
    setSaving(true)
    setEditError('')
    try {
      const { id } = await saveDraft(editing.id, editing.subject.trim(), editing.body.trim())
      select({ ...selected, id })
      invalidateLiveData()
      onToast('Draft saved.', 'success')
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Couldn’t save the draft.')
    } finally {
      setSaving(false)
      inFlight.current = false
    }
  }

  async function approve(draft: Draft) {
    if (inFlight.current || !draft.company || !live) return
    inFlight.current = true
    setSending(true)
    try {
      const ids = batch.flatMap(({ id }) => id === undefined ? [] : [id])
      const result = await approveCompany(draft.company, ids.length === batch.length ? ids : undefined)
      const accepted = result.sent.filter(({ status }) => status === 'sent' || status === 'draft (dry-run)')
      const sent = accepted.filter(({ status }) => status === 'sent').length
      const dryRuns = accepted.length - sent
      const unsent = result.sent.length - accepted.length
      if (accepted.length) {
        const delivered = new Set(accepted.map(({ to }) => to.toLowerCase()))
        setAcceptedKeys((current) => new Set([...current, ...batch.filter(({ to }) => delivered.has(to.toLowerCase())).map(draftKey)]))
      }
      invalidateLiveData()
      const report = [sent && `${sent} sent`, dryRuns && `${dryRuns} recorded as dry runs`, unsent && `${unsent} could not send`].filter(Boolean).join(', ')
      const details = result.sent.find((entry) => !accepted.includes(entry))?.status
      onToast(report ? `${draft.company}: ${report}.${details ? ` First issue: ${details}.` : ''}` : 'The backend returned no send results.',
        unsent || !accepted.length ? 'error' : 'success')
    } catch (error) {
      invalidateLiveData()
      onToast(error instanceof Error ? error.message : 'Couldn’t approve the drafts. Try again.', 'error')
    } finally {
      inFlight.current = false
      setSending(false)
    }
  }

  return (
    <>
      <PageHeader title="Draft mails" subtitle="Check the recipients and the exact text before sending."
        actions={pending.length > 0 && <Badge tone="warning"><Clock size={15} /> Approval required</Badge>} />
      {loading ? <LoadingState label="Loading draft mails…" /> : (
        <>
          {!live && <DemoDataNotice what="draft mails" />}
          {company && <div className="mb-4 flex flex-wrap items-center gap-3 text-sm"><strong>{company}</strong><Link to="/drafts" className="text-link">Show all drafts</Link></div>}
          {live && !data?.campaigns ? (
            <EmptyState icon={Mail} title="Draft records unavailable" body="The backend did not return the draft queue."
              action={<Button onClick={invalidateLiveData}>Reload draft records</Button>} />
          ) : !selected ? (
            <EmptyState icon={Mail} title="No drafts waiting" body="Ask the agent to research a company and write drafts for its verified contacts."
              action={<ActionLink to="/chat" variant="brand">Research a company</ActionLink>} />
          ) : (
            <div className="draft-layout">
              <section className="panel draft-index">
                <CardHeader title="Review queue" subtitle={`${drafts.length} ${drafts.length === 1 ? 'draft' : 'drafts'}`} />
                {drafts.map((draft) => (
                  <button className="draft-selector" type="button" key={draftKey(draft)} aria-pressed={draft === selected}
                    disabled={saving || sending} onClick={() => select(draft)}>
                    <Avatar name={draft.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <strong className="block break-words leading-tight">{draft.name}</strong>
                      <span className="mt-1 block text-sm text-muted">{draft.company}</span>
                    </span>
                  </button>
                ))}
              </section>
              <article className="panel letter-sheet record-enter" key={draftKey(selected)}>
                <header className="letter-heading">
                  <div className="flex items-center gap-3">
                    <Avatar name={selected.name} />
                    <div className="min-w-0">
                      <p className="font-semibold">To {selected.name}</p>
                      <p className="break-all font-mono text-xs text-muted">{selected.to}</p>
                    </div>
                  </div>
                  <h2 className="section-title mt-4 break-words">{selected.subject}</h2>
                  {selected.status?.startsWith('failed: ') && <p className="mt-2 text-sm text-danger">The previous delivery failed. This draft is still in the queue.</p>}
                </header>
                {editing ? (
                  <form className="space-y-4 p-5 sm:p-6" onSubmit={commitEdit}>
                    <div>
                      <label htmlFor="draft-subject" className="control-label">Subject</label>
                      <input id="draft-subject" className="input" value={editing.subject} required maxLength={120}
                        onChange={(event) => setEdit({ ...editing, subject: event.target.value })} />
                    </div>
                    <div>
                      <label htmlFor="draft-body" className="control-label">Message</label>
                      <textarea id="draft-body" className="input resize-y" rows={11} value={editing.body} required maxLength={10000}
                        onChange={(event) => setEdit({ ...editing, body: event.target.value })} />
                    </div>
                    {editError && <p className="field-error" role="alert">{editError}</p>}
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" variant="brand" disabled={saving}><Check size={16} /> {saving ? 'Saving…' : 'Save draft'}</Button>
                      <Button disabled={saving} onClick={() => setEdit(null)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="letter-body"><p className="letter whitespace-pre-wrap">{selected.body}</p></div>
                    <footer className="approval-footer">
                      {sendMode && <p className="mb-2 text-sm text-muted">{sendMode}</p>}
                      <details className="mb-4 text-sm">
                        <summary className="cursor-pointer font-semibold">{batch.length} {batch.length === 1 ? 'recipient' : 'recipients'} at {selected.company}</summary>
                        <ul className="mt-2">
                          {batch.map((draft) => <li className="break-all text-muted" key={draftKey(draft)}>{draft.name} · {draft.to}</li>)}
                        </ul>
                      </details>
                      <div className="flex flex-wrap gap-2">
                        {selected.id !== undefined && live && (
                          <Button disabled={sending} onClick={() => {
                            if (selected.id === undefined) return
                            setEditError('')
                            setEdit({ id: selected.id, subject: selected.subject, body: selected.body })
                          }}>
                            <PenLine size={15} /> Edit draft
                          </Button>
                        )}
                        <Button variant="brand" disabled={sending || !live || !selected.company || Boolean(health?.gmail_send_enabled && !health.gmail_configured)} onClick={() => approve(selected)}>
                          <Send size={16} /> {sending ? 'Approving…' : 'Approve company drafts'}
                        </Button>
                      </div>
                    </footer>
                  </>
                )}
              </article>
            </div>
          )}
        </>
      )}
    </>
  )
}
