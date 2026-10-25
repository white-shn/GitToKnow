const SEGMENT_COLORS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5']
const MAX_SEGMENTS = 5

/** Stacked bar + legend of the language breakdown (top 5, the rest grouped as "Other"). */
export default function LanguageBar({ languages }) {
  if (!languages.length) return <p className="text-sm text-muted-foreground">No source languages detected.</p>

  const top = languages.slice(0, MAX_SEGMENTS)
  const restPercent = languages.slice(MAX_SEGMENTS).reduce((sum, l) => sum + l.percent, 0)
  const segments = top.map((l, i) => ({ name: l.language, percent: l.percent, color: SEGMENT_COLORS[i] }))
  if (restPercent > 0) segments.push({ name: 'Other', percent: Math.round(restPercent * 10) / 10, color: 'bg-muted-foreground/50' })

  return (
    <div className="space-y-3">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {segments.map((s) => (
          <div key={s.name} className={s.color} style={{ width: `${s.percent}%` }} title={`${s.name} ${s.percent}%`} />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.name} className="flex items-center gap-2">
            <span className={`size-2.5 shrink-0 rounded-full ${s.color}`} />
            <span className="truncate">{s.name}</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{s.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
