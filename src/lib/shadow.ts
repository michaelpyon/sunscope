// Cast-shadow polygon for the selected building at a given sun position.
//
// Given the building footprint, its height, and the sun azimuth + altitude, we
// project each footprint vertex onto the ground along the anti-sun direction by
// (height / tan(altitude)). The swept shadow is the convex hull of the original
// footprint plus its projected copy. This is a flat-ground, single-building
// approximation (it does not raycast against other buildings), which is enough
// to let users SEE the shadow move as time and date change.

import type { LatLng } from '../types'

const METERS_PER_DEGREE_LAT = 111320

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

// Convex hull (Graham scan) over lat/lng points, returned counter-clockwise.
function convexHull(points: LatLng[]): LatLng[] {
  if (points.length <= 3) return [...points]
  const sorted = [...points].sort((a, b) => a.lng - b.lng || a.lat - b.lat)
  const cross = (o: LatLng, a: LatLng, b: LatLng) =>
    (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng)

  const lower: LatLng[] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: LatLng[] = []
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  lower.pop()
  upper.pop()
  return [...lower, ...upper]
}

// Build the ground shadow polygon, or null when the sun is too low or down (a
// near-horizon sun casts an effectively infinite shadow we do not want to draw).
export function computeShadowPolygon(
  footprint: LatLng[],
  heightMeters: number,
  sunAzimuthDeg: number,
  sunAltitudeDeg: number
): LatLng[] | null {
  if (footprint.length < 3) return null
  // Below roughly 3 degrees the projected length explodes; skip it.
  if (sunAltitudeDeg <= 3) return null
  if (heightMeters <= 0) return null

  // Shadow length on flat ground.
  const shadowLength = heightMeters / Math.tan(toRad(sunAltitudeDeg))
  // Cap the drawn shadow so a low winter sun does not stretch off the map.
  const cappedLength = Math.min(shadowLength, 400)

  // Shadow points AWAY from the sun: anti-sun azimuth = sun azimuth + 180.
  const shadowAz = toRad(sunAzimuthDeg + 180)
  const dNorth = Math.cos(shadowAz) * cappedLength // meters north (+) / south (-)
  const dEast = Math.sin(shadowAz) * cappedLength // meters east (+) / west (-)

  // Convert the meter offset into degrees at this latitude.
  const refLat = footprint[0].lat
  const dLat = dNorth / METERS_PER_DEGREE_LAT
  const dLng = dEast / (METERS_PER_DEGREE_LAT * Math.cos(toRad(refLat)))

  const projected = footprint.map((p) => ({ lat: p.lat + dLat, lng: p.lng + dLng }))
  // Hull of footprint plus its shifted copy gives the full swept shadow.
  return convexHull([...footprint, ...projected])
}
