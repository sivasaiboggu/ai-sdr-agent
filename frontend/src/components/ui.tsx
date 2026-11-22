import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Check, Info, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn, initials } from '../lib/utils'

type ButtonVariant = 'brand' | 'primary' | 'ghost'

export function Button({ className, variant = 'ghost', type = 'button', ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={cn('button', `button--${variant}`, className)} {...props} />
}

export function ActionLink({ to, children, variant = 'ghost', className, onClick }: {
  to: string
  children: ReactNode
  variant?: ButtonVariant
  className?: string
  onClick?: () => void
}) {
  return <Link to={to} onClick={onClick} className={cn('button', `button--${variant}`, className)}>{children}</Link>
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="panel-heading">
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      {action}
    </div>
  )
}

const badgeTone: Record<string, string> = {
  verified: 'success', active: 'info', sent: 'info', mailed: 'info',
  replied: 'success', interested: 'success', 'not-now': 'warning',
  bounce: 'danger', 'out-of-office': 'info', warning: 'warning',
}

export function Badge({ tone = 'muted', dot = false, children, className }: {
  tone?: string; dot?: boolean; children: ReactNode; className?: string
}) {
  return (
    <span className={cn('status', `tone-${badgeTone[tone] ?? 'muted'}`, className)}>
      {dot && <span className="status-dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`initials initials--${size}`} aria-hidden="true">{initials(name)}</span>
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="panel p-6" role="status">
      <p className="text-muted">{label}</p>
      <Skeleton className="mt-4 h-4 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/2" />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, body, action }: {
  icon: LucideIcon; title: string; body: string; action?: ReactNode
}) {
  return (
    <div className="empty panel">
      <Icon size={24} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{body}</p>
      {action && <div>{action}</div>}
    </div>
  )
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'error'; children: ReactNode }) {
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`notice tone-${tone === 'error' ? 'danger' : tone}`}>{children}</div>
}

export function DemoDataNotice({ what }: { what: string }) {
  return (
    <div role="note" className="notice demo-note">
      <Info size={16} aria-hidden="true" />
      <span><strong>Demo data.</strong> Showing example {what}. Connect the backend to see your records.</span>
    </div>
  )
}

export function PageHeader({ title, subtitle, section, actions }: {
  title: string; subtitle?: string; section?: string; actions?: ReactNode
}) {
  return (
    <header className="page-heading">
      <div>
        {section && <p className="eyebrow">{section}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="page-description">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export type PipelineStepState = 'done' | 'current' | 'waiting' | 'queued'

const stepStatus: Record<PipelineStepState, string> = {
  done: 'Done', current: 'In progress', waiting: 'Needs approval', queued: 'Queued',
}

export function PipelineSteps({ steps, stateFor, compact = false }: {
  steps: readonly { key: string; label: string; detail: string }[]
  stateFor: (key: string) => PipelineStepState
  compact?: boolean
}) {
  return (
    <ol className={cn('pipeline', compact && 'pipeline--compact')}>
      {steps.map((step) => {
        const state = stateFor(step.key)
        return (
          <li key={step.key} data-state={state} aria-current={state === 'current' || state === 'waiting' ? 'step' : undefined}>
            <span className="pipeline-mark" aria-hidden="true">{state === 'done' && <Check size={12} />}</span>
            <div>
              <strong>{step.label}</strong>
              {!compact && <p>{step.detail}</p>}
            </div>
            <span className="pipeline-state">{stepStatus[state]}</span>
          </li>
        )
      })}
    </ol>
  )
}
