import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Send, WifiOff } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { z } from 'zod/mini'
import {
  AGENT_STEPS, API_BASE_LABEL, API_BASE_URL, checkHealth, invalidateLiveData,
  sendChat, streamChat, type ChatResponse, type Draft,
} from '../lib/data'
import { Alert, Badge, Button, CardHeader, PageHeader, PipelineSteps } from '../components/ui'
import type { ToastTone } from '../App'

type Message = { role: 'user' | 'agent'; text: string }

const suggestions = ['iion', 'Alchemyst AI', 'Discover Dollar', 'Drivetrain']
const chatMessage = z.string().check(z.trim(), z.minLength(1, 'Enter a message.'), z.maxLength(1000, 'Use 1,000 characters or fewer.'))

export default function Chat({ onToast }: { onToast: (message: string, tone?: ToastTone) => void }) {
  const location = useLocation()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', text: 'Give me a company name. I can look up the company, find verified contacts and write drafts for you to review.' },
  ])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [step, setStep] = useState(0)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const pendingRun = useRef(false)
  const transcript = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    checkHealth().then((ok) => { if (active && !pendingRun.current) setApiStatus(ok ? 'online' : 'offline') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    // Queue on the next task so StrictMode's first setup can cancel cleanly.
    const timer = window.setTimeout(() => {
      let pending: string | null = null
      try {
        pending = sessionStorage.getItem('sdr-pending-chat')
        if (pending) sessionStorage.removeItem('sdr-pending-chat')
      } catch { /* Storage is optional. */ }
      if (pending) {
        if (pendingRun.current) setInput(pending)
        else void ask(pending)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [location.key])

  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight
  }, [messages.length, busy])

  function onResult(data: Pick<ChatResponse, 'drafts'>) {
    const next = data.drafts ?? []
    setDrafts(next)
    setApiStatus('online')
    invalidateLiveData()
    onToast(next.length ? `${next.length} ${next.length === 1 ? 'draft' : 'drafts'} ready for review.` : 'Agent request finished.')
  }

  async function ask(text: string) {
    if (pendingRun.current) return
    const result = chatMessage.safeParse(text)
    if (!result.success) { setError(result.error.issues[0].message); return }
    const request = result.data
    pendingRun.current = true
    setInput('')
    setError('')
    setBusy(true)
    setStreaming(true)
    setStep(0)
    setMessages((current) => [...current, { role: 'user', text: request }, { role: 'agent', text: '' }])
    let sawToken = false
    let sawStep = false
    let streamDone = false
    let serverError = ''

    try {
      await streamChat(request, (event) => {
        if (event.kind === 'step') {
          sawStep = true
          const index = AGENT_STEPS.findIndex((stage) => stage.key === event.key)
          if (index >= 0) setStep(event.state === 'done' ? Math.min(index + 1, AGENT_STEPS.length - 1) : index)
        } else if (event.kind === 'token') {
          sawToken = true
          setMessages((current) => [...current.slice(0, -1), { role: 'agent', text: current[current.length - 1].text + event.text }])
        } else if (event.kind === 'done') {
          streamDone = true
          if (!sawToken) setMessages((current) => [...current.slice(0, -1), { role: 'agent', text: event.reply || 'Request finished.' }])
          onResult(event)
        } else {
          serverError = event.detail
        }
      })
      if (serverError || !streamDone) throw new Error(serverError || 'The connection closed before the agent finished.')
    } catch {
      setStreaming(false)
      if (!sawToken && !sawStep && !serverError && !streamDone) {
        try {
          const reply = await sendChat(request)
          setMessages((current) => [...current.slice(0, -1), { role: 'agent', text: reply.reply || 'Request finished.' }])
          onResult(reply)
          return
        } catch {
          setApiStatus('offline')
          serverError = `Couldn’t reach the agent at ${API_BASE_LABEL}. Check the backend, then try again.`
        }
      }
      const message = serverError || 'The connection closed before the agent finished.'
      if (!sawToken && !streamDone) setMessages((current) => [...current.slice(0, -1), { role: 'agent', text: message }])
      onToast(message, 'error')
    } finally {
      pendingRun.current = false
      setBusy(false)
      setStreaming(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void ask(input)
  }

  return (
    <>
      <PageHeader title="Agent chat" subtitle="Research a company or ask for revisions. Approve drafts before sending." />
      {apiStatus === 'offline' && (
        <div className="mb-6"><Alert tone="error"><WifiOff size={16} /><span>
          <strong>Backend offline.</strong>{' '}
          {API_BASE_URL ? 'Check the API deployment and its allowed origins.' : <>Start the API with <code className="break-words">uvicorn backend.app.api:app --port 8000</code>.</>}
          {' '}You can still browse the draft examples.
        </span></Alert></div>
      )}
      <div className="split">
        <section className="panel ruled">
          <CardHeader title="Conversation"
            action={<Badge tone={apiStatus === 'online' ? 'verified' : 'muted'} dot>{apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Connecting'}</Badge>} />
          <div ref={transcript} className="transcript space-y-5 p-5" role="log" aria-label="Agent conversation"
            aria-live={streaming ? 'off' : 'polite'} aria-busy={streaming}>
            {messages.map((message, index) => (
              <div key={index} className="message" data-role={message.role}>
                <p className="eyebrow">{message.role === 'user' ? 'You' : 'SDR Agent'}</p>
                <p className="mt-1">{message.text || 'Working…'}</p>
              </div>
            ))}
          </div>
          <form className="border-t border-rule p-4 sm:p-5" onSubmit={submit} noValidate>
            <label htmlFor="chat-message" className="control-label">Message</label>
            <div className="flex items-start gap-2">
              <textarea id="chat-message" className="input min-h-11 resize-y" rows={2} value={input} placeholder="Research a company and draft mails"
                onChange={(event) => { setInput(event.target.value); setError('') }}
                aria-invalid={Boolean(error)} aria-describedby={error ? 'chat-error' : undefined}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    if (!busy) void ask(input)
                  }
                }} />
              <Button type="submit" variant="brand" disabled={busy}><Send size={16} /> Send</Button>
            </div>
            {error && <p className="field-error" id="chat-error" role="alert">{error}</p>}
            {busy && <p className="mt-2 text-sm text-muted" role="status">The agent is working on your request…</p>}
          </form>
        </section>

        <aside className="space-y-6" aria-label="Chat tools">
          <section className="panel">
            {busy ? (
              <>
                <CardHeader title="Run progress" />
                <div className="px-4">
                  <PipelineSteps compact steps={AGENT_STEPS} stateFor={(key) => {
                    const index = AGENT_STEPS.findIndex((stage) => stage.key === key)
                    return index < step ? 'done' : index === step ? 'current' : 'queued'
                  }} />
                </div>
              </>
            ) : (
              <>
                <CardHeader title="Start with a company" />
                {suggestions.map((company) => (
                  <button type="button" key={company} className="board-button border-t border-rule" onClick={() => ask(`Research ${company} and draft mails`)}>
                    <span>Research {company}</span><ArrowRight size={16} className="text-muted" />
                  </button>
                ))}
              </>
            )}
          </section>
          <section className="panel">
            <CardHeader title="Drafts from this chat" action={<Link to="/drafts" className="text-link">All drafts</Link>} />
            {!drafts.length && <p className="p-5 text-sm text-muted">Drafts will appear here after the agent writes them.</p>}
            {drafts.map((draft) => (
              <article key={`${draft.company}-${draft.to}`} className="ledger-row p-4">
                <p className="text-sm font-semibold">{draft.name}</p>
                <p className="break-all font-mono text-xs text-muted">{draft.to}</p>
                <p className="mt-2 text-sm">{draft.subject}</p>
              </article>
            ))}
          </section>
          <p className="border-t border-rule pt-3 text-sm text-muted">Approve company drafts in the workspace or reply YES in WhatsApp.</p>
        </aside>
      </div>
    </>
  )
}
