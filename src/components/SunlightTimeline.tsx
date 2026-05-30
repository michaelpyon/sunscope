import type { SunlightResult } from '../types'
import { cellColor, RAMP_LEGEND } from '../lib/lightRamp'

interface Props {
  results: SunlightResult[] // 24 entries, one per hour for today
}

const STATUS_LABELS = {
  SUNLIT: 'Direct sun',
  BLOCKED: 'Blocked',
  DARK: 'Night',
}

const LEGEND_COLORS = {
  SUNLIT: RAMP_LEGEND.sun,
  BLOCKED: RAMP_LEGEND.blocked,
  DARK: RAMP_LEGEND.dark,
}

export function SunlightTimeline({ results }: Props) {
  const now = new Date().getHours()

  return (
    <div className="sunlight-timeline" role="region" aria-label="Today's sunlight by hour">
      <h3>Today's Sunlight</h3>
      <div className="timeline-bar" role="img" aria-label="24-hour timeline showing direct sun, blocked, and night periods">
        {results.map((r) => (
          <div
            key={r.hour}
            className={`timeline-cell ${r.hour === now ? 'current' : ''}`}
            style={{ backgroundColor: cellColor(r) }}
            title={`${r.hour}:00 - ${STATUS_LABELS[r.status]}${r.sunAltitude ? ` (sun at ${r.sunAltitude.toFixed(1)}°)` : ''}`}
          >
            {r.hour % 3 === 0 && <span className="timeline-label">{r.hour}</span>}
          </div>
        ))}
      </div>
      <div className="timeline-legend">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <span key={key} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: LEGEND_COLORS[key as keyof typeof LEGEND_COLORS] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
