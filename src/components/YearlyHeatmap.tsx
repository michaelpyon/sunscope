import type { SunlightResult } from '../types'

interface Props {
  results: SunlightResult[] // all (month, hour) pairs
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const HOURS = Array.from({ length: 16 }, (_, i) => i + 5) // 5am to 8pm

function statusColor(status: string): string {
  switch (status) {
    case 'SUNLIT': return '#fbbf24'
    case 'BLOCKED': return '#94a3b8'
    case 'DARK': return '#1e293b'
    default: return '#e5e7eb'
  }
}

export function YearlyHeatmap({ results }: Props) {
  // Build a lookup: [month][hour] -> status
  const grid = new Map<string, string>()
  for (const r of results) {
    grid.set(`${r.month}-${r.hour}`, r.status)
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
              const status = grid.get(`${month}-${hour}`) || 'DARK'
              return (
                <div
                  key={`${month}-${hour}`}
                  className="heatmap-cell"
                  style={{ backgroundColor: statusColor(status) }}
                  title={`${MONTHS[month]} ${hour}:00 - ${status}`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#fbbf24' }} />
          Direct sun
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#94a3b8' }} />
          Blocked
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#1e293b' }} />
          Night
        </span>
      </div>
    </div>
  )
}
