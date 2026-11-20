import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { cn } from '../lib/utils'

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
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
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

export function Badge({ tone = 'muted', children, className }: { tone?: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', BADGE_STYLES[tone] ?? BADGE_STYLES.muted, className)}>
      {children}
    </span>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-11 w-11 text-sm' }
  // deterministic colour from name
  const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-violet-500', 'bg-blue-500', 'bg-teal-500']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white', sizes[size], colors[h % colors.length])}>
      {initials}
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
    <div className="card flex flex-col items-center px-5 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
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
    <div role="alert" className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed', styles)}>
      {children}
    </div>
  )
}

/** Shown wherever the page renders seeded demo data (campaigns, leads,
 * drafts, replies, dashboard stats) so seeded examples are never
 * mistaken for live results. */
export function DemoDataNotice({ what = 'campaigns, leads, drafts and replies' }: { what?: string }) {
  return (
    <div role="note" className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span><strong>Demo data.</strong> The {what} below are seeded examples from the Nov 2026 research, not live results. Start the backend and use Agent chat for live campaigns.</span>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  )
}

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.06, ease: 'easeOut' as const } }),
}
