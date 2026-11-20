import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, Mail, MessageSquare, Reply,
  Search, Sun, Moon, Zap, MessageCircle, Bell, ChevronRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'
import { SEED_CAMPAIGNS } from '../lib/data'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/campaigns', label: 'Campaigns', icon: Building2 },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/drafts', label: 'Draft mails', icon: Mail },
  { to: '/replies', label: 'Replies', icon: Reply },
  { to: '/chat', label: 'Agent chat', icon: MessageSquare },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-zinc-950/40 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-900 lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-base font-bold text-white shadow-md shadow-brand-500/25">S</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-zinc-900 dark:text-white">SDR Agent</p>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">AI Sales Development</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>
            LIVE
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={onClose}
              className={({ isActive }) => cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
              )}>
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 transition group-hover:opacity-60" />
            </NavLink>
          ))}

          <p className="px-3 pb-1 pt-6 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Active campaigns</p>
          {SEED_CAMPAIGNS.map((c) => (
            <NavLink key={c.name} to="/campaigns" onClick={onClose}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {c.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="truncate">{c.name}</span>
              <span className="ml-auto text-xs font-semibold text-zinc-400">{c.leads} leads</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
          <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 p-4 text-white shadow-lg shadow-brand-600/20">
            <div className="flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4" /> WhatsApp bot</div>
            <p className="mt-1 text-xs leading-relaxed text-white/80">Chat with the agent on WhatsApp — research, draft, approve with a YES.</p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
              <MessageCircle className="h-3 w-3" /> Free Cloud API
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 px-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">SB</span>
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

export function Topbar({ dark, onToggleTheme, onOpenSidebar, query, onQuery }: {
  dark: boolean; onToggleTheme: () => void; onOpenSidebar: () => void; query: string; onQuery: (v: string) => void
}) {
  return (
    <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button onClick={onOpenSidebar} className="btn-ghost !px-2.5 lg:hidden" aria-label="Open menu">
          <LayoutDashboard className="h-4 w-4" />
        </button>
        <div className="relative hidden w-full max-w-md sm:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search companies, leads, mails…"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:bg-zinc-900" />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 md:block">⌘K</kbd>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300 md:inline-flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Gmail connected
          </span>
          <button className="btn-ghost relative !px-2.5" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-950" />
          </button>
          <button onClick={onToggleTheme} className="btn-ghost !px-2.5" aria-label="Toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </motion.header>
  )
}
