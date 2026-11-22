import { useState } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Avatar, Badge, DemoDataNotice, EmptyState, LoadingState, PageHeader } from '../components/ui'
import LeadDrawer from '../components/LeadDrawer'
import { isPendingMail, sameCompany, SEED_DRAFTS, SEED_PEOPLE, useLiveData, type Person } from '../lib/data'
import type { ToastTone } from '../App'

const filters = { all: 'All leads', verified: 'Verified', unverified: 'Unverified' } as const
type Filter = keyof typeof filters

export default function Leads({ query, onToast }: { query: string; onToast: (msg: string, tone?: ToastTone) => void }) {
  const { data, loading } = useLiveData()
  const [params, setParams] = useSearchParams()
  const filter: Filter = params.get('verification') === 'verified' ? 'verified' : params.get('verification') === 'unverified' ? 'unverified' : 'all'
  const sort = params.get('sort') === 'name' ? 'name' : 'score'
  const [selected, setSelected] = useState<Person | null>(null)
  const company = params.get('company') ?? ''
  const live = Boolean(data?.live)
  const allPeople = live ? data?.people ?? [] : SEED_PEOPLE
  const companies = Array.from(new Set([...allPeople.map((person) => person.company), ...(company ? [company] : [])])).sort()
  const search = query.trim().toLowerCase()
  const matches = allPeople.filter((person) =>
    (!company || sameCompany(person.company, company)) &&
    [person.name, person.email, person.title, person.company].some((field) => field.toLowerCase().includes(search)),
  )
  const verified = matches.filter((person) => person.verified).length
  const counts = { all: matches.length, verified, unverified: matches.length - verified }
  const list = matches.filter((person) => filter === 'all' || person.verified === (filter === 'verified'))
    .sort((a, b) => (sort === 'score' ? b.score - a.score : 0) || a.name.localeCompare(b.name))

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const draft = selected?.email && (live
    ? data?.campaigns?.mails.find((m) => m.email.toLowerCase() === selected.email.toLowerCase() && sameCompany(m.company, selected.company) && isPendingMail(m.status))
    : SEED_DRAFTS.find((m) => m.to.toLowerCase() === selected.email.toLowerCase() && m.company === selected.company))
  const peers = selected ? allPeople.filter((p) => p !== selected && sameCompany(p.company, selected.company)) : []

  return (
    <>
      <PageHeader title="Leads" subtitle="Browse contacts and check which addresses are verified for outreach." />
      {loading ? <LoadingState label="Loading leads…" /> : (
        <>
          {!live && <DemoDataNotice what="leads" />}
          <div className="panel ruled">
            <div className="filter-bar" aria-label="Lead filters">
              {(Object.keys(filters) as Filter[]).map((value) => (
                <button key={value} type="button" className="filter-button" onClick={() => setFilter('verification', value === 'all' ? '' : value)} aria-pressed={filter === value}>
                  {filters[value]} <span className="text-xs tabular">{counts[value]}</span>
                </button>
              ))}
              <select value={company} onChange={(event) => setFilter('company', event.target.value)}
                aria-label="Filter by company" className="input max-w-full">
                <option value="">All companies</option>
                {companies.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={sort} className="input sort-select" aria-label="Sort leads"
                onChange={(event) => setFilter('sort', event.target.value === 'score' ? '' : event.target.value)}>
                <option value="score">Highest score</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
            {list.length === 0 ? (
              <EmptyState icon={Search} title="No matching leads" body="Clear the search or try a different company or verification filter." />
            ) : (
              <table key={`${company}-${filter}-${sort}`} className="lead-table record-enter" role="table">
                <caption className="sr-only">{list.length} matching leads</caption>
                <thead role="rowgroup"><tr role="row">
                  {['Person', 'Company', 'Email', 'Score', 'Status'].map((label) => <th key={label} scope="col" role="columnheader">{label}</th>)}
                </tr></thead>
                <tbody role="rowgroup">
                  {list.map((p) => (
                    <tr role="row" key={`${p.company}-${p.email || p.name}`}>
                      <td role="cell">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.name} />
                          <div>
                            <button className="lead-link font-semibold" type="button" onClick={() => setSelected(p)}>{p.name}</button>
                            <p className="text-sm text-muted">{p.title}</p>
                          </div>
                        </div>
                      </td>
                      <td role="cell" className="text-sm">{p.company}</td>
                      <td role="cell" className="break-all font-mono text-xs text-muted">{p.email || 'No verified email'}</td>
                      <td role="cell">
                        <div className="score-line">
                          <meter min={0} max={100} value={p.score} aria-label="Lead score" />
                          <span className="tabular text-sm font-semibold" aria-hidden="true">{p.score}</span>
                        </div>
                      </td>
                      <td role="cell"><Badge tone={p.verified ? 'verified' : 'muted'} dot>{p.verified ? 'Verified' : 'Unverified'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
      <LeadDrawer person={selected} peers={peers} draft={draft || undefined} onClose={() => setSelected(null)} onSelect={setSelected} onToast={onToast} />
    </>
  )
}
