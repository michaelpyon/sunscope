import type { UnitAnalysis, LatLng } from '../types'
import { getGoldenHour } from './sun'

// Average direct sun hours for the three summer and three winter months.
export function seasonalHours(analysis: UnitAnalysis): { summer: number; winter: number } {
  const m = analysis.totalSunHours.monthly
  const summer = (m[5] + m[6] + m[7]) / 3
  const winter = (m[11] + m[0] + m[1]) / 3
  return { summer, winter }
}

// Describe a winter sun amount in plain words.
function winterWord(winter: number): string {
  if (winter < 1.5) return 'dim in winter'
  if (winter < 3.5) return 'modest in winter'
  return 'still bright in winter'
}

// Build a one-line human summary from the real computed values.
// Example: "South face, floor 5: about 4 hours of direct sun in summer, dim in winter."
export function buildVerdict(analysis: UnitAnalysis): string {
  const { summer, winter } = seasonalHours(analysis)
  const summerRounded = Math.round(summer)
  const hourWord = summerRounded === 1 ? 'hour' : 'hours'
  return `${analysis.faceLabel} face, floor ${analysis.floor}: about ${summerRounded} ${hourWord} of direct sun in summer, ${winterWord(winter)}.`
}

// Format a Date to a short local time like "6:42 PM". Returns null if invalid.
function formatTime(d: Date): string | null {
  if (isNaN(d.getTime())) return null
  let h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

// Evening golden hour window for today, as a one-line string for photographers.
// Returns null when the values are unavailable (e.g. polar day or night).
export function buildGoldenHourLine(location: LatLng): string | null {
  const golden = getGoldenHour(new Date(), location)
  const start = formatTime(golden.evening.start)
  const end = formatTime(golden.evening.end)
  if (!start || !end) return null
  return `Evening golden hour today: ${start} to ${end}`
}
