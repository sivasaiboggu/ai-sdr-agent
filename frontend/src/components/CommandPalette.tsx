import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Building2, LayoutDashboard, Mail, MessageSquare, Moon, Reply, Search, Sun, Users,
} from 'lucide-react'
import { cn } from '../lib/utils'

export type PaletteAction = {
  id: string
  label: string
  hint?: string
  group: string
  icon: React.ComponentType<{ className?: string }>
  run: () => void
}

/** ⌘K command palette: jump to any page, start research on a known
 * company, or toggle the theme — all keyboard-first. Research actions
 * queue the request for Agent chat via session storage; Chat picks it
 * up on mount and asks the agent. */
export default function CommandPalette({ open, onClose, onToggleTheme, dark }: {
  open: boolean
  onClose: () => void
  onToggleTheme: () => void
  dark: boolean
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const actions: PaletteAction[] = useMemo(() => {
    const go = (to: string) => () => { navigate(to); onClose() }
    const research = (company: string) => () => {
      try { window.sessionStorage.setItem('sdr-pending-chat', `Research ${company} and draft mails`) } catch { /* ignore */ }
      navigate('/chat')
      onClose()
    }
    return [
      { id: 'nav-overview', label: 'Go to Overview', group: 'Navigate', icon: LayoutDashboard, run: go('/') },
      { id: 'nav-campaigns', label: 'Go to Campaigns', group: 'Navigate', icon: Building2, run: go('/campaigns') },
      { id: 'nav-leads', label: 'Go to Leads', group: 'Navigate', icon: Users, run: go('/leads') },
      { id: 'nav-drafts', label: 'Go to Draft mails', group: 'Navigate', icon: Mail, run: go('/drafts') },
      { id: 'nav-replies', label: 'Go to Replies', group: 'Navigate', icon: Reply, run: go('/replies') },
      { id: 'nav-chat', label: 'Go to Agent chat', group: 'Navigate', icon: MessageSquare, run: go('/chat') },
      { id: 'research-iion', label: 'Research iion and draft mails', group: 'Research', icon: MessageSquare, run: research('iion') },
      { id: 'research-alchemyst', label: 'Research Alchemyst AI and draft mails', group: 'Research', icon: MessageSquare, run: research('Alchemyst AI') },
      { id: 'research-discover', label: 'Research Discover Dollar and draft mails', group: 'Research', icon: MessageSquare, run: research('Discover Dollar') },
      { id: 'research-drivetrain', label: 'Research Drivetrain and draft mails', group: 'Research', icon: MessageSquare, run: research('Drivetrain') },
      { id: 'theme', label: dark ? 'Switch to light theme' : 'Switch to dark theme', group: 'Appearance', icon: dark ? Sun : Moon, run: () => { onToggleTheme(); onClose() } },
    ]
  }, [navigate, onClose, onToggleTheme, dark])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions
    return actions.filter((a) => a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q))
  }, [actions, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open ])

  useEffect(() => { setActive(0) }, [query])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
      else if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); filtered[active].run() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, filtered, active])

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  let lastGroup = ''
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/50 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={onClose} role="dialog" aria-modal="true" aria-label="Command palette">
          <motion.div initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-pop ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800">
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                aria-label="Search commands" />
              <kbd className="shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">ESC</kbd>
            </div>
            <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
              {filtered.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-zinc-500">No commands match “{query}”.</p>
              )}
              {filtered.map((a, i) => {
                const groupHeader = a.group !== lastGroup
                lastGroup = a.group
                return (
                  <div key={a.id}>
                    {groupHeader && <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 first:pt-1">{a.group}</p>}
                    <button data-idx={i} onMouseEnter={() => setActive(i)} onClick={a.run}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                        i === active ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800')}>
                      <a.icon className="h-4 w-4 shrink-0 opacity-70" />
                      <span className="truncate font-medium">{a.label}</span>
                      {i === active && <kbd className="ml-auto rounded border border-white/30 px-1.5 py-0.5 text-[10px] font-semibold opacity-70">↵</kbd>}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 border-t border-zinc-100 px-4 py-2.5 text-[11px] text-zinc-400 dark:border-zinc-800">
              <span><kbd className="rounded border border-zinc-200 px-1 dark:border-zinc-700">↑↓</kbd> navigate</span>
              <span><kbd className="rounded border border-zinc-200 px-1 dark:border-zinc-700">↵</kbd> run</span>
              <span><kbd className="rounded border border-zinc-200 px-1 dark:border-zinc-700">esc</kbd> close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
