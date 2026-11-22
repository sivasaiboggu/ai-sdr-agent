import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { REPLY_MIX } from '../lib/data'

/** Dark-aware tooltip — the old contentStyle was a light card that
 * stayed light in dark mode. This one follows the theme like the
 * rest of the UI. */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; stroke?: string; fill?: string; dataKey?: string | number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-zinc-200/70 bg-white px-3 py-2 text-xs shadow-pop dark:border-zinc-700/80 dark:bg-zinc-900">
      {label && <p className="font-semibold text-zinc-900 dark:text-zinc-100">{label}</p>}
      {payload.map((p) => (
        <p key={String(p.dataKey ?? p.name)} className="mt-1 flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.stroke || p.fill }} />
          {p.name}: <span className="tabular font-semibold text-zinc-900 dark:text-zinc-100">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

/** Flat area fills: the old gradient fills were decoration on a chart
 * that already had the numbers. A solid low-opacity fill reads the
 * same in both themes and never pretends to be a highlight. */
export function ActivityChart({ data }: { data: { day: string; sent: number; replies: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          {/* Mid-grey at low opacity reads as a hairline in both themes;
              the old #e4e4e7 grid was invisible in light mode and harsh
              in dark mode. */}
          <CartesianGrid stroke="#a1a1aa" strokeOpacity={0.25} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="sent" name="Mails sent" stroke="#4f46e5" strokeWidth={2.5} fill="#4f46e5" fillOpacity={0.08} isAnimationActive={false} />
          <Area type="monotone" dataKey="replies" name="Replies" stroke="#10b981" strokeWidth={2.5} fill="#10b981" fillOpacity={0.08} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ReplyDonut({ mix = REPLY_MIX }: { mix?: typeof REPLY_MIX }) {
  const total = mix.reduce((n, d) => n + d.value, 0)
  if (total === 0) {
    return <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-10 text-center text-sm leading-relaxed text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">No replies logged yet — the breakdown appears once the tracker classifies a real reply.</p>
  }
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={mix} dataKey="value" nameKey="name" innerRadius={52} outerRadius={72} paddingAngle={3} strokeWidth={0} isAnimationActive={false}>
              {mix.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2.5 text-sm">
        {mix.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white dark:ring-zinc-900" style={{ background: d.color }} />
            <span className="whitespace-nowrap text-zinc-600 dark:text-zinc-300">{d.name}</span>
            <span className="tabular ml-auto pl-4 font-bold text-zinc-900 dark:text-zinc-100">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
