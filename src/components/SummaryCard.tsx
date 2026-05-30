import type { UnitAnalysis } from '../types'
import { buildVerdict, buildGoldenHourLine, seasonalHours } from '../lib/verdict'
import { exposureColor, hoursToExposure } from '../lib/lightRamp'

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

  // Warm to cool ramp on the headline stat so the number itself reads as
  // "bright unit" (amber) or "dark unit" (slate) at a glance.
  const annualColor = exposureColor(hoursToExposure(totalSunHours.annual))
  const summerColor = exposureColor(hoursToExposure(summerHours))
  const winterColor = exposureColor(hoursToExposure(winterHours))

  // Per-month exposure for the seasonal light strip. monthly[m] is the count of
  // lit hours on that month's representative day, so it already reads as
  // hours-per-day and maps straight onto the ramp.
  const monthExposure = totalSunHours.monthly.map((h) => hoursToExposure(h))

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
          <span className="stat-value" style={{ color: annualColor }}>{totalSunHours.annual.toFixed(1)}</span>
          <span className="stat-label">avg hrs/day</span>
        </div>
        <div className="stat">
          <span className="stat-value" style={{ color: summerColor }}>{summerHours.toFixed(1)}</span>
          <span className="stat-label">summer hrs</span>
        </div>
        <div className="stat">
          <span className="stat-value" style={{ color: winterColor }}>{winterHours.toFixed(1)}</span>
          <span className="stat-label">winter hrs</span>
        </div>
      </div>

      {/* Seasonal light strip: 12 months of sun, warm where bright, cool where dark. */}
      <div className="summary-light-strip" aria-hidden="true">
        {monthExposure.map((score, i) => (
          <span
            key={i}
            className="light-strip-cell"
            style={{ backgroundColor: exposureColor(score) }}
            title={`${MONTHS[i]}`}
          />
        ))}
      </div>
      <div className="summary-light-strip-labels" aria-hidden="true">
        <span>Jan</span>
        <span>Jun</span>
        <span>Dec</span>
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
