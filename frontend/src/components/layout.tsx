import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  Building2, ChevronRight, Command, Compass, LayoutDashboard,
  Mail, Menu, MessageCircle, MessageSquare, Moon, Reply, Search, Sun, Users, X,
} from 'lucide-react'
import { SEED_CAMPAIGNS, fetchHealth, useLiveData, type Health } from '../lib/data'
import { Avatar } from './ui'

export function useBackendHealth() {
  const [health, setHealth] = useState<Health | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    const check = () => fetchHealth().then((value) => { if (alive) setHealth(value) })
    check()
    const interval = window.setInterval(check, 60_000)
    return () => { alive = false; window.clearInterval(interval) }
  }, [])
  return health
}

export const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/campaigns', label: 'Campaigns', icon: Building2 },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/drafts', label: 'Draft mails', icon: Mail },
  { to: '/replies', label: 'Replies', icon: Reply },
  { to: '/chat', label: 'Agent chat', icon: MessageSquare },
]

export function LedgerMark() {
  return <span className="ledger-mark" aria-hidden="true"><i /><i /><i /></span>
}

function Navigation({ onClose }: { onClose?: () => void }) {
  const { data, loading } = useLiveData()
  const campaigns = loading ? [] : data?.live
    ? (data.coverage?.companies ?? []).map((company) => ({
        name: company.name,
        leads: (data.people ?? []).filter((p) => p.company.toLowerCase() === company.name.toLowerCase()).length,
      }))
    : SEED_CAMPAIGNS

  return (
    <>
      <div className="sidebar-masthead">
        <Link className="identity" to="/" onClick={onClose}>
          <LedgerMark /><span>SDR Agent<small>Outreach ledger</small></span>
        </Link>
        {onClose && <button className="sidebar-close" type="button" onClick={onClose} aria-label="Close menu"><X size={20} /></button>}
      </div>
      <nav className="sidebar-navigation" aria-label="Workspace">
        <p className="eyebrow">Workspace</p>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end onClick={onClose} className="nav-entry">
            <Icon size={17} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
        {campaigns.length > 0 && (
          <div className="sidebar-campaigns">
            <p className="eyebrow">Campaigns</p>
            {campaigns.map((c) => (
              <Link key={c.name} to={`/campaigns?company=${encodeURIComponent(c.name)}`} onClick={onClose}>
                <span>{c.name}</span><span className="tabular" aria-label={`${c.leads} leads`}>{c.leads}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-channel">
          <MessageCircle size={17} aria-hidden="true" />
          <div><strong>WhatsApp bot</strong><p>Research, draft, or reply YES to approve.</p></div>
        </div>
        <div className="sidebar-profile">
          <Avatar name="Sivasai Boggu" size="sm" />
          <div><strong>Sivasai Boggu</strong><p>IIIT Kottayam · BTech CS ’27</p></div>
        </div>
      </div>
    </>
  )
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) onClose() }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [onClose])

  return (
    <>
      <aside className="sidebar desktop-sidebar"><Navigation /></aside>
      <dialog id="mobile-menu" ref={dialogRef} className="sidebar mobile-sidebar" aria-label="Workspace menu"
        onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
        {open && <Navigation onClose={onClose} />}
      </dialog>
    </>
  )
}

export function Topbar({ dark, onToggleTheme, menuOpen, onOpenSidebar, onOpenPalette, query, onQuery, health }: {
  dark: boolean; onToggleTheme: () => void; menuOpen: boolean; onOpenSidebar: () => void
  onOpenPalette: () => void; query: string; onQuery: (value: string) => void; health: Health | null | undefined
}) {
  const { pathname } = useLocation()
  const current = NAV.find((item) => item.to === pathname)?.label ?? 'Page not found'
  const isSearchPage = pathname === '/leads' || pathname === '/campaigns'
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (event.key !== '/' || event.defaultPrevented || event.ctrlKey || event.metaKey ||
        !(target instanceof HTMLElement) || target.closest('input, textarea, select, [contenteditable], dialog')) return
      event.preventDefault()
      if (searchRef.current) searchRef.current.focus()
      else onOpenPalette()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onOpenPalette])

  const liveSending = health?.gmail_configured && health.gmail_send_enabled
  const backendLabel = health === undefined ? 'Checking backend' : health ? 'Backend online' : 'Demo mode'
  const gmail = health && (liveSending ? 'Gmail sending on' : health.gmail_configured ? 'Gmail dry run' : 'Gmail not set up')

  return (
    <header className="topbar">
      <button className="icon-button mobile-menu-button" onClick={onOpenSidebar} aria-label="Open menu"
        aria-controls="mobile-menu" aria-expanded={menuOpen}><Menu size={20} /></button>
      <div className="breadcrumbs"><Link to="/">Workspace</Link><ChevronRight size={14} aria-hidden="true" /><span>{current}</span></div>
      <div className="topbar-actions">
        {isSearchPage && (
          <label className="quick-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" ref={searchRef} value={query} onChange={(event) => onQuery(event.target.value)}
              placeholder={`Search ${current.toLowerCase()}`} aria-label={`Search ${current.toLowerCase()}`} />
            <kbd>/</kbd>
          </label>
        )}
        <span className="connection">
          <span className={`status-dot ${health ? 'tone-success' : 'tone-muted'}`} aria-hidden="true" />{backendLabel}{gmail && <span className="connection-detail">{gmail}</span>}
        </span>
        <button className="command-trigger" onClick={onOpenPalette} aria-label="Commands" aria-keyshortcuts="Control+k Meta+k" title="Ctrl+K or ⌘K">
          <Command size={16} aria-hidden="true" /><span>Commands</span>
        </button>
        <button className="icon-button" onClick={onToggleTheme} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  )
}
