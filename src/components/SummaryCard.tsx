import type { UnitAnalysis } from '../types'
import { buildVerdict, buildGoldenHourLine, seasonalHours } from '../lib/verdict'

interface Props {
  analysis: UnitAnalysis
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function SummaryCard({ analysis }: Props) {
  const { address, floor, faceLabel, totalSunHours, dataQuality } = analysis

  const { summer: summerHours, winter: winterHours } = seasonalHours(analysis)

  const bestMonth = totalSunHours.monthly.indexOf(Math.max(...totalSunHours.monthly))
  const worstMonth = totalSunHours.monthly.indexOf(Math.min(...totalSunHours.monthly))

  const confidencePct = Math.round(dataQuality.confidence * 100)

  const verdict = buildVerdict(analysis)
  const goldenHourLine = buildGoldenHourLine({ lat: analysis.lat, lng: analysis.lng })

  return (
    <div className="summary-card" id="summary-card">
      <div className="summary-header">
        <div className="summary-logo">SunScope</div>
        <div className="summary-address">{address}</div>
        <div className="summary-unit">Floor {floor}, {faceLabel}-facing</div>
      </div>

      <p className="summary-verdict">{verdict}</p>
      {goldenHourLine && <p className="summary-golden">{goldenHourLine}</p>}

      <div className="summary-stats">
        <div className="stat">
          <span className="stat-value">{totalSunHours.annual.toFixed(1)}</span>
          <span className="stat-label">avg hrs/day</span>
        </div>
        <div className="stat">
          <span className="stat-value">{summerHours.toFixed(1)}</span>
          <span className="stat-label">summer hrs</span>
        </div>
        <div className="stat">
          <span className="stat-value">{winterHours.toFixed(1)}</span>
          <span className="stat-label">winter hrs</span>
        </div>
      </div>

      <div className="summary-details">
        <div className="detail-row">
          <span>Best month</span>
          <span>{MONTHS[bestMonth]} ({totalSunHours.monthly[bestMonth]} hrs)</span>
        </div>
        <div className="detail-row">
          <span>Worst month</span>
          <span>{MONTHS[worstMonth]} ({totalSunHours.monthly[worstMonth]} hrs)</span>
        </div>
        <div className="detail-row">
          <span>Facing</span>
          <span>{faceLabel} ({Math.round(analysis.faceBearing)}°)</span>
        </div>
      </div>

      <div className="summary-confidence">
        Based on {dataQuality.known} of {dataQuality.total} buildings with verified heights ({confidencePct}% confidence)
      </div>

      <div className="summary-footer">
        sunscope.app
      </div>
    </div>
  )
}
