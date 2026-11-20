import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Loader2, Send, Sparkles, User, WifiOff } from 'lucide-react'
import { AGENT_STEPS, API_BASE_LABEL, API_BASE_URL, checkHealth, sendChat, streamChat, type Draft } from '../lib/data'
import { Alert, Avatar, Badge, Button, Card, PageHeader } from '../components/ui'
import type { ToastTone } from '../App'
import { cn } from '../lib/utils'

type Msg = { role: 'user' | 'agent'; text: string }

const SUGGESTIONS = [
  'Research iion and draft mails',
  'Research Alchemyst AI and draft mails',
  'Research Discover Dollar and draft mails',
  'Research Drivetrain and draft mails',
]

export default function Chat({ onToast }: { onToast: (msg: string, tone?: ToastTone) => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'agent', text: "Hi Sivasai — I'm your SDR agent. Give me a company and I'll research it, find the verified founders and hiring leads, and draft personalised mails. Nothing sends without your approval." },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [apiDown, setApiDown] = useState(false)
  // Real backend status from /health — the header must not claim "Online"
  // when the API was never reached.
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [step, setStep] = useState(0)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let live = true
    checkHealth().then((ok) => {
      if (!live) return
      setApiStatus(ok ? 'online' : 'offline')
      setApiDown(!ok)
    })
    // A research request queued from the ⌘K command palette.
    try {
      const pending = window.sessionStorage.getItem('sdr-pending-chat')
      if (pending) {
        window.sessionStorage.removeItem('sdr-pending-chat')
        window.setTimeout(() => ask(pending), 300)
      }
    } catch { /* session storage unavailable — ignore */ }
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Stream the reply live from /chat/stream; fall back to the plain /chat
   * call if streaming fails before the first token arrives. */
  async function ask(text: string) {
    const q = text.trim()
    if (!q || busy) return
    setMessages((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setBusy(true)
    setStep(0)
    let sawToken = false
    let streamFailed = false
    try {
      // Append an empty agent message; tokens fill it in as they arrive.
      setMessages((m) => [...m, { role: 'agent', text: '' }])
      setStreaming(true)
      await streamChat(q, (e) => {
        if (e.kind === 'step') {
          const idx = AGENT_STEPS.findIndex((s) => s.key === e.key)
          if (idx >= 0) setStep(e.state === 'done' ? Math.min(idx + 1, AGENT_STEPS.length - 1) : idx)
        } else if (e.kind === 'token') {
          sawToken = true
          setMessages((m) => {
            const next = [...m]
            const last = next[next.length - 1]
            if (last && last.role === 'agent') next[next.length - 1] = { ...last, text: last.text + e.text }
            return next
          })
        } else if (e.kind === 'done') {
          setDrafts(e.drafts ?? [])
          setApiDown(false)
          setApiStatus('online')
          onToast(`${e.drafts?.length ?? 0} draft mails ready for review.`)
        } else if (e.kind === 'error') {
          streamFailed = true
          throw new Error(e.detail)
        }
      })
      setStreaming(false)
      if (streamFailed) throw new Error('Agent run failed')
    } catch (err) {
      // Streaming failed before any token: retry once with plain /chat.
      setStreaming(false)
      if (!sawToken) {
        setMessages((m) => m.filter((msg, i) => !(msg.role === 'agent' && msg.text === '' && i === m.length - 1)))
        try {
          const data = await sendChat(q)
          setApiDown(false)
          setApiStatus('online')
          setDrafts(data.drafts ?? [])
          setMessages((m) => [...m, { role: 'agent', text: data.reply || 'Done — drafts are ready below.' }])
          onToast(`${data.drafts?.length ?? 0} draft mails ready for review.`)
        } catch {
          setApiDown(true)
          setApiStatus('offline')
          const hint = API_BASE_URL
            ? `Check the backend deployment and that its CORS_ORIGINS allows this site.`
            : 'Start it with `uvicorn backend.app.api:app --port 8000`.'
          onToast(`Backend API is not reachable at ${API_BASE_LABEL} — ${hint}`, 'error')
          setMessages((m) => [...m, { role: 'agent', text: `The backend API is not reachable at ${API_BASE_LABEL} (${hint}). Try a suggestion below once it is up — or open Drafts to see the seeded demo mails.` }])
        }
      } else {
        // Tokens already arrived — the reply is usable even if the tail failed.
        onToast('Reply arrived but the stream cut off early — drafts below may be incomplete.', 'error')
      }
    } finally {
      setBusy(false)
      setStreaming(false)
      setStep(0)
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  return (
    <div>
      <PageHeader title="Agent chat" subtitle="Talk to the agent in plain language — it plans, researches, drafts, and waits for your approval." />
      {apiDown && (
        <div className="mb-4">
          <Alert tone="error">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <span><strong>Backend API is not reachable at {API_BASE_LABEL}.</strong> {API_BASE_URL
              ? 'Check the backend deployment and that its CORS_ORIGINS allows this site.'
              : <>Start it with <code className="rounded bg-rose-100 px-1 py-0.5 font-mono text-xs dark:bg-rose-500/20">uvicorn backend.app.api:app --port 8000</code></>} — until then, drafts below are the seeded demo mails.</span>
          </Alert>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="flex h-[560px] flex-col overflow-hidden sm:h-[620px] xl:col-span-2">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white"><Bot className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">SDR Agent</p>
              <p className={cn('flex items-center gap-1.5 text-xs',
                apiStatus === 'online' ? 'text-emerald-600 dark:text-emerald-400' : apiStatus === 'offline' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500')}>
                <span className={cn('h-1.5 w-1.5 rounded-full',
                  apiStatus === 'online' ? 'bg-emerald-500' : apiStatus === 'offline' ? 'bg-amber-500' : 'bg-zinc-400')} />
                {apiStatus === 'online' ? 'Online — LangGraph · Gemini · Gmail'
                  : apiStatus === 'offline' ? `Backend offline — demo mode (${API_BASE_LABEL})`
                    : 'Checking backend…'}
              </p>
            </div>
            <Badge tone="active" className="ml-auto">Human approval on</Badge>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                  className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    m.role === 'agent' ? 'bg-brand-600 text-white' : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900')}>
                    {m.role === 'agent' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </span>
                  <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    m.role === 'agent' ? 'rounded-tl-md bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100' : 'rounded-tr-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900')}>
                    {m.text}
                    {streaming && m.role === 'agent' && i === messages.length - 1 && (
                      <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-brand-500 align-text-bottom" aria-hidden />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {busy && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="flex items-center gap-2 text-xs font-semibold text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {streaming ? 'Writing your reply…' : 'Agent is working…'}</p>
                <div className="mt-3 space-y-2">
                  {AGENT_STEPS.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-2.5 text-sm">
                      <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                        i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800')}>
                        {i < step ? '✓' : i + 1}
                      </span>
                      <span className={i <= step ? 'font-medium text-zinc-800 dark:text-zinc-100' : 'text-zinc-400'}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
            <div className="mb-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  {s}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); ask(input) }} className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Research a company and draft mails…" className="input" />
              <Button type="submit" variant="brand" disabled={busy || !input.trim()}><Send className="h-4 w-4" /> Send</Button>
            </form>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50"><Sparkles className="h-4 w-4 text-brand-500" /> Drafts from this chat</h3>
            </div>
            <div className="space-y-3 p-5">
              {drafts.length === 0 && <p className="text-sm leading-relaxed text-zinc-500">No drafts yet — ask the agent to research a company and they'll appear here, ready for approval.</p>}
              {drafts.map((d) => (
                <div key={d.to} className="rounded-xl border border-zinc-100 p-3.5 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={d.name} size="sm" />
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{d.name}</p><p className="truncate font-mono text-[11px] text-zinc-400">{d.to}</p></div>
                  </div>
                  <p className="mt-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">{d.subject}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-5 text-white dark:from-white dark:to-zinc-200 dark:text-zinc-900">
            <p className="text-sm font-bold">How approval works</p>
            <p className="mt-1.5 text-xs leading-relaxed opacity-80">Drafts never send on their own. Approve one in Drafts, or reply YES on WhatsApp — the sender then sends one mail every 5 minutes, PDF attached, and logs every message ID.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
