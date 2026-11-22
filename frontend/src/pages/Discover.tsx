import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Ban, ExternalLink, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod/mini'
import { Alert, Badge, Button, CardHeader, LoadingState, PageHeader } from '../components/ui'
import { fetchBoards } from '../lib/boards'
import { fetchCoverage, normalizeCompanyName, SEED_CAMPAIGNS, type Board, type CoverageResponse } from '../lib/data'

const boardStatus = {
  'signed-in': { label: 'Signed in', tone: 'verified' },
  'not-signed-in': { label: 'Sign-in needed', tone: 'warning' },
  'browse-only': { label: 'Browse freely', tone: 'muted' },
}
const companyName = z.string().check(z.trim(), z.minLength(1, 'Enter a company name.'), z.maxLength(200, 'Use 200 characters or fewer.'))

export default function Discover() {
  const navigate = useNavigate()
  const [sources, setSources] = useState<{ boards: Board[]; live: boolean } | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [coverage, setCoverage] = useState<CoverageResponse | null | undefined>(undefined)
  const [company, setCompany] = useState('')
  const [error, setError] = useState('')
  const [checked, setChecked] = useState<{ name: string; kind: 'covered' | 'new' | 'blocked' } | null>(null)

  useEffect(() => {
    let active = true
    fetchBoards().then((value) => { if (active) setSources(value) })
    fetchCoverage().then((value) => { if (active) setCoverage(value) })
    return () => { active = false }
  }, [])

  const boards = sources?.boards ?? []
  const selected = boards.find((board) => board.id === selectedId) ?? boards[0]
  const covered = new Map((coverage === null ? SEED_CAMPAIGNS : []).map((c) => [normalizeCompanyName(c.name), { name: c.name, status: c.status as string, sent: c.sent, demo: true }]))
  for (const c of coverage?.companies ?? []) covered.set(normalizeCompanyName(c.name), { ...c, demo: false })
  const found = checked && covered.get(normalizeCompanyName(checked.name))

  function checkCompany(event: FormEvent) {
    event.preventDefault()
    const result = companyName.safeParse(company)
    if (!result.success) { setError(result.error.issues[0].message); return }
    const name = result.data
    const key = normalizeCompanyName(name)
    const blocked = coverage?.do_not_mail.some(({ email }) => {
      const domain = (email.split('@')[1] ?? '').replace(/\.[a-z]{2,}$/i, '')
      const normalized = normalizeCompanyName(domain)
      return normalized && key && normalized === key
    })
    setChecked({ name, kind: blocked ? 'blocked' : covered.has(key) ? 'covered' : 'new' })
  }

  function research(name: string) {
    navigate('/chat', { state: { message: `Research ${name} and draft mails` } })
  }

  return (
    <>
      <PageHeader title="Discover" subtitle="Check a company against your outreach records, or browse the job boards you research from." />
      <section className="panel coverage-sheet mb-6">
        <div className="p-5 sm:p-6">
          <h2 className="section-title">Check company coverage</h2>
          <p className="mt-2 text-muted">Look up a company before starting another campaign.</p>
          <form className="mt-4 max-w-2xl" onSubmit={checkCompany} noValidate>
            <label className="control-label" htmlFor="company-name">Company name</label>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <input id="company-name" className="input" value={company} placeholder="Enter a company name"
                aria-invalid={Boolean(error)} aria-describedby={error ? 'company-error' : undefined}
                onChange={(event) => { setCompany(event.target.value); setChecked(null); setError('') }} />
              <Button type="submit" variant="brand" disabled={coverage === undefined} className="shrink-0"><Search size={16} /> Check coverage</Button>
            </div>
            {error && <p id="company-error" className="field-error" role="alert">{error}</p>}
          </form>
          {coverage === undefined && <p className="mt-3 text-sm text-muted" role="status">Loading coverage…</p>}
          {coverage === null && <p className="mt-3 text-sm text-muted">Live coverage is unavailable. Checks use the demo records.</p>}
          {checked && (
            <div className="mt-4">
              {checked.kind === 'blocked' && <Alert tone="error"><Ban size={16} /><span><strong>{checked.name} appears on the do-not-mail list.</strong> Choose another contact route.</span></Alert>}
              {checked.kind === 'covered' && found && (
                <Alert tone="warning"><span><strong>{found.name} is already covered.</strong> {found.demo ? 'Demo record' : found.status}{found.sent ? ` · ${found.sent} sent` : ''}. <Link className="text-link" to={`/campaigns?company=${encodeURIComponent(found.name)}`}>View campaigns</Link></span></Alert>
              )}
              {checked.kind === 'new' && (
                <>
                  <Alert><span><strong>{checked.name}</strong> was absent from {coverage ? 'current coverage' : 'the demo records'}.</span></Alert>
                  <Button className="mt-3" onClick={() => research(checked.name)}>Research in Agent chat <ArrowRight size={16} /></Button>
                </>
              )}
            </div>
          )}
        </div>
      </section>
      <dl className="summary-strip summary-strip--three tabular" aria-label="Coverage totals">
        <div><dt>Job boards</dt><dd>{sources ? boards.length : '…'}</dd></div>
        <div><dt>Companies covered</dt><dd>{coverage === undefined ? '…' : covered.size}</dd></div>
        <div><dt>Live sends recorded</dt><dd>{coverage ? coverage.companies.reduce((sum, c) => sum + c.sent, 0) : '—'}</dd></div>
      </dl>

      {!sources ? <LoadingState label="Loading job boards…" /> : (
        <div className="split discovery-layout">
          <section className="panel">
            <CardHeader title="Job boards" subtitle={sources.live ? undefined : 'Cached board list. Sign-in details may have changed.'} />
            {!boards.length && <p className="p-5 text-muted">No boards are listed.</p>}
            {boards.map((board) => (
              <button type="button" className="board-button" key={board.id} aria-pressed={selected?.id === board.id} onClick={() => setSelectedId(board.id)}>
                <span><strong className="block">{board.name}</strong><span className="block text-sm text-muted">{board.focus}</span></span>
                <Badge tone={boardStatus[board.signin].tone} dot>{boardStatus[board.signin].label}</Badge>
              </button>
            ))}
          </section>
          {selected && (
            <section key={selected.id} className="panel source-sheet record-enter" aria-label="Selected job board">
              <CardHeader title={selected.name} subtitle={selected.focus} />
              <div className="space-y-4 p-5">
                <div><p className="eyebrow">Best for</p><p>{selected.best_for}</p></div>
                <div><p className="eyebrow">Sign-in</p><p>{selected.signin_note}</p></div>
                <div><p className="eyebrow">How to apply</p><p>{selected.apply_note}</p></div>
                <a className="button button--ghost" href={selected.url} target="_blank" rel="noreferrer">Open {selected.name} <ExternalLink size={15} /></a>
              </div>
            </section>
          )}
        </div>
      )}

      {Boolean(coverage?.do_not_mail.length) && (
        <section className="panel mt-6">
          <CardHeader title="Do not mail" subtitle="Addresses flagged by the reply tracker." />
          <ul>{coverage?.do_not_mail.map((entry) => (
            <li key={entry.email} className="ledger-row px-5 py-3"><span className="break-all font-mono text-xs">{entry.email}</span><p className="text-sm text-muted">{entry.reason}</p></li>
          ))}</ul>
        </section>
      )}
    </>
  )
}
