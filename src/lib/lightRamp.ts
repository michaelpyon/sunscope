// Warm to cool light-temperature ramp.
//
// The goal is to make sun data FEEL like light: strong direct sun reads warm
// (golden/amber), blocked or low sun reads cool (blue/slate). For lit hours we
// also key the warmth to sun ALTITUDE, so a low-angle golden-hour sun looks
// warmer and a high midday sun looks brighter. Kept tasteful (a single
// amber-to-slate gradient), not a rainbow.

import type { SunlightResult } from '../types'

// Linear interpolation between two hex colors. t is clamped to 0..1.
function lerpColor(a: string, b: string, t: number): string {
  const tt = Math.max(0, Math.min(1, t))
  const ax = parseInt(a.slice(1), 16)
  const bx = parseInt(b.slice(1), 16)
  const ar = (ax >> 16) & 0xff
  const ag = (ax >> 8) & 0xff
  const ab = ax & 0xff
  const br = (bx >> 16) & 0xff
  const bg = (bx >> 8) & 0xff
  const bb = bx & 0xff
  const r = Math.round(ar + (br - ar) * tt)
  const g = Math.round(ag + (bg - ag) * tt)
  const bl = Math.round(ab + (bb - ab) * tt)
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`
}

// Color stops along the ramp. Cool slate at the bottom (no direct light) rising
// through warm amber, with a deep golden anchor for low-angle light.
const COOL_DARK = '#1e293b' // night / no sun, deep slate
const COOL = '#64748b' // blocked / dim, cool slate
const GOLD_LOW = '#f59e0b' // low-angle golden-hour amber
const GOLD_WARM = '#fbbf24' // warm direct sun
const GOLD_BRIGHT = '#fde68a' // bright high-midday wash

// A lit-cell color keyed to sun altitude in degrees. Low sun stays a deep
// golden amber (golden hour), high sun warms toward a bright wash. Altitude is
// soft-clamped so anything above roughly 60 degrees reads as full midday.
export function sunlitColor(altitudeDeg: number): string {
  const t = Math.max(0, Math.min(1, altitudeDeg / 60))
  // First half of the ramp moves from deep golden to warm amber, second half
  // from warm amber to a brighter wash, so the warmth never washes fully white.
  if (t < 0.5) return lerpColor(GOLD_LOW, GOLD_WARM, t / 0.5)
  return lerpColor(GOLD_WARM, GOLD_BRIGHT, (t - 0.5) / 0.5)
}

// Per-cell color for the timeline and heatmap. SUNLIT keys to altitude, BLOCKED
// reads cool slate, DARK reads deep slate.
export function cellColor(result: Pick<SunlightResult, 'status' | 'sunAltitude'>): string {
  if (result.status === 'SUNLIT') return sunlitColor(result.sunAltitude ?? 30)
  if (result.status === 'BLOCKED') return COOL
  return COOL_DARK
}

// Map an overall sun-exposure score (0 = dark unit, 1 = very bright unit) onto
// the warm to cool ramp for headline numbers. This is what makes a stat instantly
// read as "bright unit" (amber) vs "dark unit" (slate). The midpoint stays a
// neutral warm so middling units do not look alarming.
export function exposureColor(score: number): string {
  const t = Math.max(0, Math.min(1, score))
  if (t < 0.5) return lerpColor(COOL, GOLD_LOW, t / 0.5)
  return lerpColor(GOLD_LOW, GOLD_WARM, (t - 0.5) / 0.5)
}

// Normalize average direct-sun hours per day into a 0..1 exposure score. Roughly
// 6+ hours of direct sun is a bright unit; 0 is fully shaded. Tuned so the common
// NYC range (1 to 5 hours) spreads across the ramp rather than clipping.
export function hoursToExposure(avgHoursPerDay: number): number {
  return Math.max(0, Math.min(1, avgHoursPerDay / 6))
}

// Legend swatch colors so legends match the ramp the cells actually use.
export const RAMP_LEGEND = {
  sun: GOLD_WARM,
  blocked: COOL,
  dark: COOL_DARK,
}
