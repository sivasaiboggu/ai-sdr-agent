import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Sidebar, Topbar } from './components/layout'
import CommandPalette from './components/CommandPalette'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import Leads from './pages/Leads'
import Drafts from './pages/Drafts'
import Replies from './pages/Replies'
import Chat from './pages/Chat'

function useTheme() {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('sdr-theme', dark ? 'dark' : 'light') } catch { /* ignore */ }
  }, [dark])
  return { dark, toggle: () => setDark((d) => !d) }
}

export type ToastTone = 'success' | 'error' | 'info'

const TOAST_ICON = {
  success: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400 dark:text-emerald-600" />,
  error: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400 dark:text-rose-500" />,
  info: <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400 dark:text-sky-500" />,
} as const

export default function App() {
  const { dark, toggle } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<{ msg: string; tone: ToastTone } | null>(null)
  const location = useLocation()

  const showToast = useCallback((msg: string, tone: ToastTone = 'success') => {
    setToast({ msg, tone })
    window.setTimeout(() => setToast(null), 4200)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  // ⌘K / Ctrl+K opens the command palette anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onToggleTheme={toggle} dark={dark} />
      <div className="lg:pl-64">
        <Topbar dark={dark} onToggleTheme={toggle} onOpenSidebar={() => setSidebarOpen(true)} onOpenPalette={() => setPaletteOpen(true)} query={query} onQuery={setQuery} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campaigns query={query} />} />
            <Route path="/leads" element={<Leads query={query} onToast={showToast} />} />
            <Route path="/drafts" element={<Drafts onToast={showToast} />} />
            <Route path="/replies" element={<Replies />} />
            <Route path="/chat" element={<Chat onToast={showToast} />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
          <footer className="mt-10 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-5 text-xs text-zinc-400 dark:border-zinc-800">
            <span>SDR Agent v0.7 — LangGraph · FastAPI · Gemini (free tier) · Apollo · Gmail</span>
            <span className="ml-auto">Verified emails only · Nothing sends without approval · 5-minute gap</span>
          </footer>
        </main>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl bg-zinc-900 px-4 py-3.5 text-sm font-medium text-white shadow-pop dark:bg-white dark:text-zinc-900"
            role="status">
            {TOAST_ICON[toast.tone]}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
