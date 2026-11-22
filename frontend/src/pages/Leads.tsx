import { useMemo, useState } from 'react'
import { BadgeCheck, Mail, Search } from 'lucide-react'
import { Avatar, Badge, Card, DemoDataNotice, EmptyState, PageHeader } from '../components/ui'
import LeadDrawer from '../components/LeadDrawer'
import { SEED_PEOPLE, useLiveData, type Person } from '../lib/data'
import { cn } from '../lib/utils'
import type { ToastTone } from '../App'

export default function Leads({ query, onToast }: { query: string; onToast: (msg: string, tone?: ToastTone) => void }) {
  const { data } = useLiveData()
  const live = !!data?.live
  // Live people when the backend answers, seeded demo data otherwise.
  const allPeople = live ? (data?.people ?? []) : SEED_PEOPLE
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [company, setCompany] = useState('All companies')
  const [selected, setSelected] = useState<Person | null>(null)
  const companies = useMemo(() => ['All companies', ...Array.from(new Set(allPeople.map((p) => p.company)))], [allPeople])
  const counts = useMemo(() => ({
    all: allPeople.length,
    verified: allPeople.filter((p) => p.verified).length,
    unverified: allPeople.filter((p) => !p.verified).length,
  }), [allPeople])
  const list = allPeople.filter((p) => {
    if (filter === 'verified' && !p.verified) return false
    if (filter === 'unverified' && p.verified) return false
    if (company !== 'All companies' && p.company !== company) return false
    const q = query.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.company.toLowerCase().includes(q)
  })

  return (
    <div>
      <PageHeader title="Leads" subtitle={live
        ? `Live — ${allPeople.length} people in backend memory. Verified emails only are ever mailed.`
        : 'Founders, CXOs and hiring leads — verified emails only. Unverified people are never mailed.'} />
      {!live && <DemoDataNotice what="leads" />}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', 'verified', 'unverified'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
            className={cn('rounded-full px-3.5 py-1.5 text-sm font-medium capitalize shadow-sm transition',
              filter === f ? 'bg-zinc-900 text-white ring-1 ring-inset ring-zinc-900 dark:bg-white dark:text-zinc-900 dark:ring-white' : 'bg-white text-zinc-600 ring-1 ring-inset ring-zinc-200/80 hover:bg-zinc-50 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700/80 dark:hover:bg-zinc-800')}>
            {f === 'all' ? 'All leads' : f} <span className={cn('tabular ml-1 text-xs', filter === f ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-400')}>{counts[f]}</span>
          </button>
        ))}
        <select value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Filter by company"
          className="ml-auto rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-zinc-700/80 dark:bg-zinc-900">
          {companies.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No leads match your filters"
          body="Try clearing the search or choosing another company — or research a new company in Agent chat to find more verified leads."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100/80 dark:border-zinc-800/80">
                  <th className="sticky top-0 bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400 dark:bg-zinc-900">Person</th>
                  <th className="sticky top-0 bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400 dark:bg-zinc-900">Company</th>
                  <th className="sticky top-0 bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400 dark:bg-zinc-900">Email</th>
                  <th className="sticky top-0 bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400 dark:bg-zinc-900">Lead score</th>
                  <th className="sticky top-0 bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400 dark:bg-zinc-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p, i) => (
                  <tr key={p.email || p.name}
                    onClick={() => setSelected(p)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setSelected(p) }}
                    className="cursor-pointer border-b border-zinc-50 transition last:border-0 hover:bg-zinc-50/80 focus-visible:bg-zinc-50/80 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40 dark:focus-visible:bg-zinc-800/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} />
                        <div><p className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{p.name}</p><p className="text-xs text-zinc-500">{p.title}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300">{p.company}</td>
                    <td className="px-5 py-3.5">
                      {p.email ? <span className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-700 dark:text-zinc-300"><Mail className="h-3.5 w-3.5 text-zinc-400" />{p.email}</span>
                        : <span className="text-xs text-zinc-400">No verified email — LinkedIn only</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-inset ring-black/5 dark:bg-zinc-800 dark:ring-white/5">
                          <div style={{ width: `${p.score}%` }}
                            className="h-full rounded-full bg-brand-600" />
                        </div>
                        <span className="tabular text-xs font-bold text-zinc-700 dark:text-zinc-200">{p.score}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.verified
                        ? <Badge tone="verified"><BadgeCheck className="h-3 w-3" /> Verified</Badge>
                        : <Badge tone="muted">Unverified</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <LeadDrawer person={selected} onClose={() => setSelected(null)} onSelect={setSelected} onToast={onToast} />
    </div>
  )
}
