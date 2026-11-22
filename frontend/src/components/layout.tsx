import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, Mail, MessageSquare, Reply,
  Search, Sun, Moon, Zap, MessageCircle, ChevronRight, Compass,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { SEED_CAMPAIGNS, fetchHealth, useLiveData, type Health } from '../lib/data'

/** Backend /health, polled once a minute. `undefined` = not checked yet,
 * `null` = unreachable. Status pills read this instead of assuming the
 * backend is live — the dashboard shows seeded demo data until it is.
 * App calls this hook once and passes the result down: Sidebar and
 * Topbar used to poll separately, doubling /health traffic. */
export function useBackendHealth() {
  const [health, setHealth] = useState<Health | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    const check = () => fetchHealth().then((h) => { if (alive) setHealth(h) })
    check()
    const t = window.setInterval(check, 60_000)
    return () => { alive = false; window.clearInterval(t) }
  }, [])
  return health
}

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/campaigns', label: 'Campaigns', icon: Building2 },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/drafts', label: 'Draft mails', icon: Mail },
  { to: '/replies', label: 'Replies', icon: Reply },
  { to: '/chat', label: 'Agent chat', icon: MessageSquare },
]

export function Sidebar({ open, onClose, health }: { open: boolean; onClose: () => void; health: Health | null | undefined }) {
  const live = health !== undefined && health !== null
  // Campaign shortcuts follow the same source as the pages: live memory
  // when the backend answers, the seeded list while it is offline.
  const { data } = useLiveData()
  const sidebarCampaigns = data?.live
    ? (data.coverage?.companies ?? []).map((c) => ({
        name: c.name,
        leads: (data.people ?? []).filter((p) => p.company.toLowerCase() === c.name.toLowerCase()).length,
      }))
    : SEED_CAMPAIGNS.map((c) => ({ name: c.name, leads: c.leads }))
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-zinc-950/40 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200/70 bg-white transition-transform duration-300 dark:border-zinc-800/70 dark:bg-zinc-900 lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-base font-bold text-white shadow-sm dark:bg-white dark:text-zinc-900">S</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-zinc-900 dark:text-white">SDR Agent</p>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">AI Sales Development</p>
          </div>
          {/* Honest backend state: "Live" only when /health actually
              answers — otherwise the dashboard is showing seeded demo
              data, and the badge says Demo. */}
          <span title={live ? 'Backend reachable — live data' : 'Backend unreachable — showing seeded demo data'}
            className={cn(
              'ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
              live
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-zinc-100 text-zinc-500 ring-zinc-600/20 dark:bg-zinc-800 dark:text-zinc-400',
            )}>
            {live && (
              <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>
            )}
            {live ? 'LIVE' : 'DEMO'}
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={onClose}
              className={({ isActive }) => cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100',
              )}>
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 transition group-hover:opacity-60" />
            </NavLink>
          ))}

          <p className="eyebrow px-3 pb-1 pt-6">Active campaigns</p>
          {sidebarCampaigns.map((c) => (
            <NavLink key={c.name} to="/campaigns" onClick={onClose}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100/80 dark:text-zinc-400 dark:hover:bg-zinc-800/70">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-600 ring-1 ring-inset ring-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700/60">
                {c.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="truncate">{c.name}</span>
              <span className="tabular ml-auto text-xs font-semibold text-zinc-400">{c.leads} leads</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-100/80 p-4 dark:border-zinc-800/80">
          <div className="rounded-2xl bg-zinc-900 p-4 text-white shadow-soft dark:bg-zinc-800 dark:text-zinc-100">
            <div className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-emerald-400" /><Zap className="h-4 w-4 text-emerald-400" /> WhatsApp bot</div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">Chat with the agent on WhatsApp — research, draft, approve with a YES.</p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 ring-1 ring-inset ring-white/10">
              <MessageCircle className="h-3 w-3" /> Free Cloud API
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 px-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white ring-2 ring-white dark:bg-white dark:text-zinc-900 dark:ring-zinc-900">SB</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">Sivasai Boggu</p>
              <p className="truncate text-xs text-zinc-500">IIIT Kottayam · BTech CS ’27</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export function Topbar({ dark, onToggleTheme, onOpenSidebar, onOpenPalette, query, onQuery, health }: {
  dark: boolean; onToggleTheme: () => void; onOpenSidebar: () => void; onOpenPalette: () => void; query: string; onQuery: (v: string) => void; health: Health | null | undefined
}) {
  const searchRef = useRef<HTMLInputElement>(null)
  // "/" focuses the search box; ⌘K now opens the command palette (App owns it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-white dark:border-zinc-800/70 dark:bg-zinc-950">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button onClick={onOpenSidebar} className="btn-ghost !px-2.5 lg:hidden" aria-label="Open menu">
          <LayoutDashboard className="h-4 w-4" />
        </button>
        <div className="relative hidden w-full max-w-md sm:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input ref={searchRef} value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search companies, leads, mails…  ( / to focus )"
            className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50/80 py-2.5 pl-10 pr-16 text-sm shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-zinc-700/80 dark:bg-zinc-900 dark:focus:bg-zinc-900" />
          <button onClick={onOpenPalette} aria-label="Open command palette"
            className="kbd pointer-events-auto absolute right-3 top-1/2 hidden -translate-y-1/2 transition hover:border-brand-300 hover:text-brand-600 md:block">⌘K</button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Gmail state from /health — never claimed when the backend is
              unreachable or no app password is configured. There is no
              notifications system, so no bell: the old one showed a fake
              unread dot and did nothing when clicked. */}
          <span title={health ? `Backend ${health.database} · Gemini ${health.gemini_configured ? 'on' : 'off'} · Apollo ${health.apollo_configured ? 'on' : 'off'}` : undefined} className={cn(
            'hidden items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-medium shadow-sm md:inline-flex dark:bg-zinc-900',
            health && health.gmail_configured && health.gmail_send_enabled
              ? 'border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-400'
              : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300',
          )}>
            <span className={cn(
              'h-2 w-2 rounded-full',
              health === undefined ? 'bg-zinc-400'
                : !health ? 'bg-amber-500'
                : health.gmail_configured && health.gmail_send_enabled ? 'bg-emerald-500'
                : 'bg-zinc-400',
            )} />
            {health === undefined ? 'Checking backend…'
              : !health ? 'Backend offline'
              : health.gmail_configured && health.gmail_send_enabled ? 'Gmail sending on'
              : health.gmail_configured ? 'Gmail dry-run'
              : 'Gmail not set up'}
          </span>
          <button onClick={onToggleTheme} className="btn-ghost !px-2.5" aria-label="Toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}
