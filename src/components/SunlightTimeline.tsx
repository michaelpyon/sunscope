import type { SunlightResult } from '../types'

interface Props {
  results: SunlightResult[] // 24 entries, one per hour for today
}

const STATUS_COLORS = {
  SUNLIT: '#fbbf24',
  BLOCKED: '#6b7280',
  DARK: '#1e293b',
}

const STATUS_LABELS = {
  SUNLIT: 'Direct sun',
  BLOCKED: 'Blocked',
  DARK: 'Night',
}

export function SunlightTimeline({ results }: Props) {
  const now = new Date().getHours()

  return (
    <div className="sunlight-timeline">
      <h3>Today's Sunlight</h3>
      <div className="timeline-bar">
        {results.map((r) => (
          <div
            key={r.hour}
            className={`timeline-cell ${r.hour === now ? 'current' : ''}`}
            style={{ backgroundColor: STATUS_COLORS[r.status] }}
            title={`${r.hour}:00 - ${STATUS_LABELS[r.status]}${r.sunAltitude ? ` (sun at ${r.sunAltitude.toFixed(1)}°)` : ''}`}
          >
            {r.hour % 3 === 0 && <span className="timeline-label">{r.hour}</span>}
          </div>
        ))}
      </div>
      <div className="timeline-legend">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <span key={key} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: STATUS_COLORS[key as keyof typeof STATUS_COLORS] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
