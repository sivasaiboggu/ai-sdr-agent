import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Check, Info } from 'lucide-react'
import { avatarColor, cn, initials } from '../lib/utils'

export function Button({
  variant = 'primary', className, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'brand' | 'ghost' | 'outline' }) {
  const styles = {
    primary: 'btn-primary',
    brand: 'btn-brand',
    ghost: 'btn-ghost',
    outline: 'btn-ghost border-zinc-300 dark:border-zinc-600',
  }[variant]
  return <button className={cn(styles, className)} {...props} />
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('card', className)}>{children}</div>
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100/80 px-6 py-4 dark:border-zinc-800/80">
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const BADGE_STYLES: Record<string, string> = {
  verified: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20',
  active: 'bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/20',
  sent: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20',
  draft: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-400/20',
  replied: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20',
  interested: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20',
  'not-now': 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20',
  bounce: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20',
  'out-of-office': 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20',
  muted: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-400/20',
}

export function Badge({ tone = 'muted', dot = false, children, className }: { tone?: string; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', BADGE_STYLES[tone] ?? BADGE_STYLES.muted, className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-11 w-11 text-sm' }
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white dark:ring-zinc-900', sizes[size], avatarColor(name))}>
      {initials(name)}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function EmptyState({ icon: Icon, title, body, action }: {
  icon: typeof import('lucide-react').Inbox
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="card flex flex-col items-center border-dashed px-5 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 shadow-sm ring-1 ring-inset ring-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-500 dark:ring-zinc-700/60">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'error'; children: ReactNode }) {
  const styles = {
    info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
    error: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
  }[tone]
  return (
    <div role="alert" className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm', styles)}>
      {children}
    </div>
  )
}

/** Shown wherever the page renders seeded demo data (campaigns, leads,
 * drafts, replies, dashboard stats) so seeded examples are never
 * mistaken for live results. */
export function DemoDataNotice({ what = 'campaigns, leads, drafts and replies' }: { what?: string }) {
  return (
    <div role="note" className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span><strong>Demo data.</strong> The {what} below are seeded examples from the Nov 2026 research, not live results. Start the backend and use Agent chat for live campaigns.</span>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export type PipelineStepState = 'done' | 'current' | 'waiting' | 'queued'

/** The signature visual: the numbered pipeline rail. One indigo
 * numbered circle per agent step, joined by a hairline, a check when
 * the step is done. The same rail appears on the Dashboard pipeline
 * list and in Agent chat while a run is in progress — the product is
 * a pipeline, and the rail shows where a campaign is in it. States
 * are derived from data by the caller, never hardcoded: a step is
 * done only when the records say it ran. */
export function PipelineSteps({ steps, stateFor, compact = false, trailing }: {
  steps: readonly { key: string; label: string; detail: string }[]
  stateFor: (key: string) => PipelineStepState
  compact?: boolean
  trailing?: (state: PipelineStepState, key: string) => ReactNode
}) {
  return (
    <ol className={compact ? 'space-y-2' : 'space-y-0 p-2'}>
      {steps.map((s, i) => {
        const state = stateFor(s.key)
        const done = state === 'done'
        const current = state === 'current' || state === 'waiting'
        return (
          <li key={s.key}
            className={compact
              ? 'flex items-center gap-2.5 text-sm'
              : 'flex items-start gap-4 rounded-xl px-3 py-3 transition hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50'}>
            <span className={cn(
              'relative flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-900',
              compact ? 'h-5 w-5 text-[10px]' : 'h-8 w-8 text-xs',
              done ? 'bg-emerald-500' : current ? 'bg-brand-600' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800',
              current && !compact && 'ring-brand-500/30',
            )}>
              {done ? <Check className={compact ? 'h-3 w-3' : 'h-4 w-4'} /> : i + 1}
              {!compact && i < steps.length - 1 && (
                <span className="absolute left-1/2 top-8 h-5 w-px -translate-x-1/2 bg-zinc-200 dark:bg-zinc-700" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn(
                'text-sm font-semibold tracking-tight',
                compact
                  ? (done || current ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-400')
                  : 'text-zinc-900 dark:text-zinc-100',
              )}>{s.label}</p>
              {!compact && <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{s.detail}</p>}
            </div>
            {!compact && (trailing
              ? trailing(state, s.key)
              : state === 'waiting'
                ? <Badge tone="warning">Waiting on you</Badge>
                : state === 'queued'
                  ? <Badge tone="muted">Queued</Badge>
                  : null)}
          </li>
        )
      })}
    </ol>
  )
}
