import type { SunlightResult } from '../types'
import { cellColor, RAMP_LEGEND } from '../lib/lightRamp'

interface Props {
  results: SunlightResult[] // all (month, hour) pairs
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const HOURS = Array.from({ length: 16 }, (_, i) => i + 5) // 5am to 8pm

export function YearlyHeatmap({ results }: Props) {
  // Build a lookup: [month][hour] -> result, so the ramp can key on altitude.
  const grid = new Map<string, SunlightResult>()
  for (const r of results) {
    grid.set(`${r.month}-${r.hour}`, r)
  }

  return (
    <div className="yearly-heatmap">
      <h3>Yearly Sunlight Map</h3>
      <div className="heatmap-grid">
        {/* Header row: months */}
        <div className="heatmap-corner" />
        {MONTHS.map(m => (
          <div key={m} className="heatmap-month-label">{m}</div>
        ))}

        {/* Data rows: hours */}
        {HOURS.map(hour => (
          <div key={hour} className="heatmap-row">
            <div className="heatmap-hour-label">
              {hour > 12 ? `${hour - 12}p` : hour === 12 ? '12p' : `${hour}a`}
            </div>
            {MONTHS.map((_, month) => {
              const cell = grid.get(`${month}-${hour}`)
              const status = cell?.status ?? 'DARK'
              const color = cell ? cellColor(cell) : RAMP_LEGEND.dark
              return (
                <div
                  key={`${month}-${hour}`}
                  className="heatmap-cell"
                  style={{ backgroundColor: color }}
                  title={`${MONTHS[month]} ${hour}:00 - ${status}`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: RAMP_LEGEND.sun }} />
          Direct sun
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: RAMP_LEGEND.blocked }} />
          Blocked
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: RAMP_LEGEND.dark }} />
          Night
        </span>
      </div>
    </div>
  )
}
