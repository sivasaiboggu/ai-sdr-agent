import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { NAV, Sidebar, Topbar, useBackendHealth } from './components/layout'
import { ActionLink, Button, LoadingState, PageHeader } from './components/ui'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'

const CommandPalette = lazy(() => import('./components/CommandPalette'))
const Discover = lazy(() => import('./pages/Discover'))
const Campaigns = lazy(() => import('./pages/Campaigns'))
const Leads = lazy(() => import('./pages/Leads'))
const Drafts = lazy(() => import('./pages/Drafts'))
const Replies = lazy(() => import('./pages/Replies'))
const Chat = lazy(() => import('./pages/Chat'))

export type ToastTone = 'success' | 'error' | 'info'

const toastIcons = { success: CheckCircle2, error: AlertTriangle, info: Info }

class RouteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <PageHeader section="Page error" title="This page couldn’t load"
        subtitle="Reload the workspace, or return to the overview."
        actions={<><Button variant="brand" onClick={() => window.location.reload()}>Reload workspace</Button><ActionLink to="/">Overview</ActionLink></>} />
    )
  }
}

export default function App() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteUsed, setPaletteUsed] = useState(false)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<{ msg: string; tone: ToastTone } | null>(null)
  const toastTimer = useRef<number>()
  const main = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const animateView = useNavigationType() !== 'POP'
  const previousPath = useRef(pathname)
  const [chatVisited, setChatVisited] = useState(pathname === '/chat')
  useEffect(() => { if (pathname === '/chat') setChatVisited(true) }, [pathname])
  const health = useBackendHealth()
  const toggleTheme = useCallback(() => setDark((value) => !value), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const openPalette = useCallback(() => { setPaletteUsed(true); setPaletteOpen(true) }, [])
  const closePalette = useCallback(() => setPaletteOpen(false), [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#090f1d' : '#f5f7fb')
    try { localStorage.setItem('sdr-theme', dark ? 'dark' : 'light') } catch { /* Storage is optional. */ }
  }, [dark])

  const showToast = useCallback((msg: string, tone: ToastTone = 'success') => {
    window.clearTimeout(toastTimer.current)
    setToast({ msg, tone })
    toastTimer.current = window.setTimeout(() => setToast(null), 5000)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  useEffect(() => {
    document.title = `${NAV.find((item) => item.to === pathname)?.label ?? 'Page not found'} · SDR Agent`
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    window.scrollTo({ top: 0 })
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return
      if (document.querySelector('dialog[open]:not(#command-palette)')) return
      event.preventDefault()
      setPaletteUsed(true)
      setPaletteOpen((value) => !value)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const ToastIcon = toast ? toastIcons[toast.tone] : Info

  return (
    <div className="app-shell">
      <button className="button button--primary skip-link" onClick={() => main.current?.focus()}>Skip to main content</button>
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      {paletteUsed && (
        <Suspense fallback={null}>
          <CommandPalette open={paletteOpen} onClose={closePalette} onToggleTheme={toggleTheme} dark={dark} />
        </Suspense>
      )}
      <div className="app-main">
        <Topbar dark={dark} onToggleTheme={toggleTheme} menuOpen={sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)}
          onOpenPalette={openPalette} query={query} onQuery={setQuery} health={health} />
        <main ref={main} id="main-content" tabIndex={-1} className="workspace">
          {pathname !== '/chat' && <div key={pathname} className={animateView ? 'view-enter' : undefined}>
            <RouteBoundary>
              <Suspense fallback={<LoadingState label="Loading page…" />}>
                <Routes>
                  <Route path="/" element={<Dashboard health={health ?? null} />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/campaigns" element={<Campaigns query={query} />} />
                  <Route path="/leads" element={<Leads query={query} onToast={showToast} />} />
                  <Route path="/drafts" element={<Drafts onToast={showToast} health={health} />} />
                  <Route path="/replies" element={<Replies />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </RouteBoundary>
          </div>}
          {(chatVisited || pathname === '/chat') && (
            <div hidden={pathname !== '/chat'} className={pathname === '/chat' && animateView ? 'view-enter' : undefined}>
              <RouteBoundary>
                <Suspense fallback={<LoadingState label="Loading conversation…" />}>
                  <Chat onToast={showToast} />
                </Suspense>
              </RouteBoundary>
            </div>
          )}
        </main>
      </div>
      {toast && (
        <div className="toast" role={toast.tone === 'error' ? 'alert' : 'status'}>
          <ToastIcon size={16} className={`tone-${toast.tone === 'error' ? 'danger' : toast.tone}`} aria-hidden="true" />
          <p>{toast.msg}</p>
        </div>
      )}
    </div>
  )
}
