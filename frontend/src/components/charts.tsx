import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { REPLY_MIX, WEEKLY_ACTIVITY } from '../lib/data'

export function ActivityChart() {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={WEEKLY_ACTIVITY} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="replyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', boxShadow: '0 12px 32px -8px rgba(16,24,40,.18)', fontSize: 13 }}
          />
          <Area type="monotone" dataKey="sent" name="Mails sent" stroke="#4f46e5" strokeWidth={2.5} fill="url(#sentGrad)" />
          <Area type="monotone" dataKey="replies" name="Replies" stroke="#10b981" strokeWidth={2.5} fill="url(#replyGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ReplyDonut() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={REPLY_MIX} dataKey="value" nameKey="name" innerRadius={52} outerRadius={72} paddingAngle={3} strokeWidth={0}>
              {REPLY_MIX.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2.5 text-sm">
        {REPLY_MIX.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-zinc-600 dark:text-zinc-300">{d.name}</span>
            <span className="ml-auto pl-4 font-bold text-zinc-900 dark:text-zinc-100">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
