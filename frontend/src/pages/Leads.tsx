import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BadgeCheck, Mail, Search } from 'lucide-react'
import { Avatar, Badge, Card, DemoDataNotice, EmptyState, fadeUp, PageHeader } from '../components/ui'
import { SEED_PEOPLE } from '../lib/data'
import { cn } from '../lib/utils'

export default function Leads({ query }: { query: string }) {
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [company, setCompany] = useState('All companies')
  const companies = useMemo(() => ['All companies', ...Array.from(new Set(SEED_PEOPLE.map((p) => p.company)))], [])
  const list = SEED_PEOPLE.filter((p) => {
    if (filter === 'verified' && !p.verified) return false
    if (filter === 'unverified' && p.verified) return false
    if (company !== 'All companies' && p.company !== company) return false
    const q = query.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.company.toLowerCase().includes(q)
  })

  return (
    <div>
      <PageHeader title="Leads" subtitle="Founders, CXOs and hiring leads — verified emails only. Unverified people are never mailed." />
      <DemoDataNotice what="leads" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', 'verified', 'unverified'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition',
              filter === f ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-white text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700')}>
            {f === 'all' ? 'All leads' : f}
          </button>
        ))}
        <select value={company} onChange={(e) => setCompany(e.target.value)} className="ml-auto rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          {companies.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
                <th className="px-5 py-3 font-semibold">Person</th>
                <th className="px-5 py-3 font-semibold">Company</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Lead score</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => (
                <motion.tr key={p.email || p.name} variants={fadeUp} initial="hidden" animate="show" custom={i}
                  className="border-b border-zinc-50 transition hover:bg-zinc-50/80 last:border-0 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} />
                      <div><p className="font-semibold text-zinc-900 dark:text-zinc-100">{p.name}</p><p className="text-xs text-zinc-500">{p.title}</p></div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300">{p.company}</td>
                  <td className="px-5 py-3.5">
                    {p.email ? <span className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-700 dark:text-zinc-300"><Mail className="h-3.5 w-3.5 text-zinc-400" />{p.email}</span>
                      : <span className="text-xs text-zinc-400">No verified email — LinkedIn only</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${p.score}%` }} transition={{ duration: 0.7, delay: i * 0.05 }}
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" />
                      </div>
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{p.score}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {p.verified
                      ? <Badge tone="verified"><BadgeCheck className="h-3 w-3" /> Verified</Badge>
                      : <Badge tone="muted">Unverified</Badge>}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <EmptyState
              icon={Search}
              title="No leads match your filters"
              body="Try clearing the search or choosing another company — or research a new company in Agent chat to find more verified leads."
            />
          )}
        </div>
      </Card>
    </div>
  )
}
