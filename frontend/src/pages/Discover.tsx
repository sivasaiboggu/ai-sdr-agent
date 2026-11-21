import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowUpRight, Ban, Building2, CheckCircle2, Compass, ExternalLink, Search, ShieldCheck,
} from 'lucide-react'
import { Alert, Badge, Button, Card, DemoDataNotice, PageHeader } from '../components/ui'
import {
  fetchBoards, fetchCoverage, normalizeCompanyName, SEED_CAMPAIGNS,
  type Board, type CoverageResponse,
} from '../lib/data'
import { cn } from '../lib/utils'

const SIGNIN_BADGE: Record<Board['signin'], { label: string; tone: 'verified' | 'muted' | 'active' }> = {
  'signed-in': { label: 'Signed in', tone: 'verified' },
  'not-signed-in': { label: 'Sign-in needed', tone: 'active' },
  'browse-only': { label: 'Browse without sign-in', tone: 'muted' },
}

/** Boards & discovery — one view over every board the agent researches
 * from (never Internshala), plus a research box for any company with a
 * dedupe check against everything already covered, so a company is never
 * re-mailed or re-applied to by accident. */
export default function Discover() {
  const navigate = useNavigate()
  const [boards, setBoards] = useState<Board[]>([])
  const [boardsLive, setBoardsLive] = useState(false)
  const [selected, setSelected] = useState<Board | null>(null)
  const [coverage, setCoverage] = useState<CoverageResponse | null>(null)
  const [coverageLoaded, setCoverageLoaded] = useState(false)
  const [company, setCompany] = useState('')
  const [check, setCheck] = useState<'idle' | 'covered' | 'new' | 'blocked'>('idle')
  const [checkedName, setCheckedName] = useState('')

  useEffect(() => {
    let live = true
    fetchBoards().then(({ boards: b, live: l }) => { if (live) { setBoards(b); setBoardsLive(l); setSelected(b[0] ?? null) } })
    fetchCoverage().then((c) => { if (live) { setCoverage(c); setCoverageLoaded(true) } })
    return () => { live = false }
  }, [])

  /** Covered companies: real backend memory first, then the seeded demo
   * campaigns (labelled demo). Dedupe is by normalised name. */
  const covered = useMemo(() => {
    const map = new Map<string, { name: string; status: string; sent: number; mails: number; demo?: boolean }>()
    for (const c of coverage?.companies ?? []) {
      map.set(normalizeCompanyName(c.name), { name: c.name, status: c.status, sent: c.sent, mails: c.mails })
    }
    for (const c of SEED_CAMPAIGNS) {
      const key = normalizeCompanyName(c.name)
      if (!map.has(key)) map.set(key, { name: c.name, status: c.status, sent: c.sent, mails: 0, demo: true })
    }
    return map
  }, [coverage])

  const sentTotal = (coverage?.companies ?? []).reduce((n, c) => n + c.sent, 0)

  function checkCompany(e: React.FormEvent) {
    e.preventDefault()
    const name = company.trim()
    if (!name) return
    setCheckedName(name)
    const key = normalizeCompanyName(name)
    // Do-not-mail is keyed by email, so match on the mail domain: strip
    // the TLD ("iion.io" -> "iion") and allow either side to contain the
    // other ("eteaminc.com" must still catch a typed "eTeam"). The old
    // comparison normalised the whole domain ("iionio") against the
    // company name ("iion") and could never match.
    const blocked = (coverage?.do_not_mail ?? []).find((d) => {
      const domain = (d.email.split('@')[1] ?? '').replace(/\.[a-z]{2,}$/i, '')
      const dom = normalizeCompanyName(domain)
      return dom.length > 0 && key.length > 0 && (dom.includes(key) || key.includes(dom))
    })
    if (blocked) { setCheck('blocked'); return }
    setCheck(covered.has(key) ? 'covered' : 'new')
  }

  function researchCompany() {
    try { window.sessionStorage.setItem('sdr-pending-chat', `Research ${checkedName} and draft mails`) } catch { /* ignore */ }
    navigate('/chat')
  }

  const found = checkedName ? covered.get(normalizeCompanyName(checkedName)) : undefined

  return (
    <div>
      <PageHeader title="Discover" subtitle="Every board the agent researches from — and any company, checked against what is already covered before you research it." />
      <DemoDataNotice what="board coverage" />

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: 'Boards', value: String(boards.length || 8), sub: 'Internshala never listed' },
          { label: 'Companies covered', value: coverageLoaded ? String(covered.size) : '…', sub: 'Researched, mailed or sent' },
          { label: 'Mails sent', value: coverageLoaded ? String(sentTotal) : '…', sub: 'Real sends logged in memory' },
        ].map((s, i) => (
          <Card key={s.label} className={`rise rise-${i + 1} p-4 text-center`}>
            <p className="tabular text-2xl font-bold text-zinc-900 dark:text-white">{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{s.label}</p>
            <p className="mt-0.5 text-[11px] text-zinc-400">{s.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-5 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
          <Search className="h-4 w-4 text-brand-500" /> Research any company
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Type any company name — the agent researches it with live web search and cited sources.
          Covered companies are flagged first, so nothing is ever re-mailed or re-applied to.
        </p>
        <form onSubmit={checkCompany} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={company} onChange={(e) => { setCompany(e.target.value); setCheck('idle') }}
            placeholder="e.g. Razorpay, Zerodha, Freshworks…" className="input flex-1" aria-label="Company name" />
          <Button type="submit" variant="brand">Check coverage</Button>
        </form>
        <AnimatePresence>
          {check === 'covered' && found && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3">
              <Alert tone="warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span><strong>{found.name} is already covered</strong> — status: {found.status}
                  {found.sent > 0 && `, ${found.sent} mail${found.sent === 1 ? '' : 's'} sent`}
                  {found.demo ? ' (demo campaign data)' : ''}. Researching again is fine, but approving would
                  re-mail them — the backend blocks re-sends. See the campaign instead.</span>
              </Alert>
              <div className="mt-2"><Button variant="ghost" onClick={() => navigate('/campaigns')}>View campaigns →</Button></div>
            </motion.div>
          )}
          {check === 'blocked' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3">
              <Alert tone="error">
                <Ban className="mt-0.5 h-4 w-4 shrink-0" />
                <span><strong>Do not mail {checkedName}</strong> — its address is on the do-not-mail list
                  (bounced before). Pick another contact route instead.</span>
              </Alert>
            </motion.div>
          )}
          {check === 'new' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3">
              <Alert tone="info">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span><strong>{checkedName} is new</strong> — not researched, mailed or applied to yet.</span>
              </Alert>
              <div className="mt-2"><Button variant="brand" onClick={researchCompany}>Research {checkedName} in Agent chat →</Button></div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <div className="mb-3 flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-white"><Compass className="h-4 w-4 text-brand-500" /> Job boards</h2>
        {!boardsLive && boards.length > 0 && (
          <span className="text-xs text-zinc-400">Cached board list — backend offline, live status unavailable</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {boards.map((b) => (
          <button key={b.id} onClick={() => setSelected(b)} aria-pressed={selected?.id === b.id}
            className={cn('card p-5 text-left transition-shadow hover:shadow-pop',
              selected?.id === b.id && 'ring-2 ring-brand-500 dark:ring-brand-400')}>
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
                {b.name.slice(0, 2).toUpperCase()}
              </span>
              <Badge tone={SIGNIN_BADGE[b.signin].tone}>{SIGNIN_BADGE[b.signin].label}</Badge>
            </div>
            <p className="mt-3 text-base font-bold text-zinc-900 dark:text-white">{b.name}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-zinc-500">{b.focus}</p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400"><span className="font-semibold text-zinc-500">Best for:</span> {b.best_for}</p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key={selected.id}>
            <Card className="mt-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-white">
                    <Building2 className="h-4 w-4 text-brand-500" /> {selected.name}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{selected.focus} — {selected.best_for}.</p>
                </div>
                <a href={selected.url} target="_blank" rel="noreferrer">
                  <Button variant="primary">Open {selected.name} <ExternalLink className="h-3.5 w-3.5" /></Button>
                </a>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-zinc-50 p-3.5 dark:bg-zinc-800/60">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-400"><ShieldCheck className="h-3.5 w-3.5" /> Sign-in status</p>
                  <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-200">{selected.signin_note}</p>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3.5 dark:bg-zinc-800/60">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">How to apply</p>
                  <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-200">{selected.apply_note}</p>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400">
                <ArrowUpRight className="h-3.5 w-3.5" /> Companies found on {selected.name} can be researched from Agent chat — the agent dedupes them against the coverage above.
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {coverage && coverage.do_not_mail.length > 0 && (
        <Card className="mt-5 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white"><Ban className="h-4 w-4 text-rose-500" /> Do not mail — bounced before</h3>
          <ul className="mt-2 space-y-1.5">
            {coverage.do_not_mail.map((d) => (
              <li key={d.email} className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-mono text-xs text-zinc-700 dark:text-zinc-200">{d.email}</span>
                <span className="text-xs text-zinc-400">{d.reason}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
