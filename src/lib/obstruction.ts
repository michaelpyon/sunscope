import type { LatLng, BuildingPolygon, BuildingFace, SunlightResult, UnitAnalysis } from '../types'
import { generateYearlySunData, getTodaySunPositions } from './sun'

const METERS_PER_DEGREE_LAT = 111320
const METERS_PER_FLOOR = 3

// Convert degrees to radians
function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

// Haversine-approximated distance in meters between two lat/lng points
function distanceMeters(a: LatLng, b: LatLng): number {
  const dlat = (b.lat - a.lat) * METERS_PER_DEGREE_LAT
  const dlng = (b.lng - a.lng) * METERS_PER_DEGREE_LAT * Math.cos(toRad(a.lat))
  return Math.sqrt(dlat * dlat + dlng * dlng)
}

// Compute convex hull of a set of points (Graham scan)
function convexHull(points: LatLng[]): LatLng[] {
  if (points.length <= 3) return [...points]

  const sorted = [...points].sort((a, b) => a.lng - b.lng || a.lat - b.lat)

  const cross = (o: LatLng, a: LatLng, b: LatLng) =>
    (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng)

  // Lower hull
  const lower: LatLng[] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }

  // Upper hull
  const upper: LatLng[] = []
  for (const p of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }

  // Remove last point of each half because it's repeated
  lower.pop()
  upper.pop()

  return [...lower, ...upper]
}

// 2D ray-segment intersection. Returns parameter t along ray (>0 means ahead), or null.
function raySegmentIntersect(
  origin: LatLng,
  dirLat: number,
  dirLng: number,
  p1: LatLng,
  p2: LatLng
): number | null {
  const dx = p2.lng - p1.lng
  const dy = p2.lat - p1.lat

  const denom = dirLng * dy - dirLat * dx
  if (Math.abs(denom) < 1e-12) return null // parallel

  const t = ((p1.lng - origin.lng) * dy - (p1.lat - origin.lat) * dx) / denom
  const u = ((p1.lng - origin.lng) * dirLat - (p1.lat - origin.lat) * dirLng) / denom

  if (t > 0.0001 && u >= 0 && u <= 1) return t
  return null
}

// Check if a 2D ray from origin in a given compass bearing hits any edge of a convex polygon.
// Returns the closest intersection distance in meters, or null.
function rayIntersectsBuilding(
  origin: LatLng,
  azimuthDeg: number,
  building: LatLng[]
): number | null {
  // Azimuth: 0=N, 90=E, 180=S, 270=W
  // In lat/lng space: N = +lat, E = +lng
  const azRad = toRad(azimuthDeg)
  const dirLat = Math.cos(azRad)  // north component
  const dirLng = Math.sin(azRad)  // east component

  let minT = Infinity

  for (let i = 0; i < building.length; i++) {
    const j = (i + 1) % building.length
    const t = raySegmentIntersect(origin, dirLat, dirLng, building[i], building[j])
    if (t !== null && t < minT) {
      minT = t
    }
  }

  if (minT === Infinity) return null

  // Convert parameter t to approximate meters
  const hitLat = origin.lat + dirLat * minT
  const hitLng = origin.lng + dirLng * minT
  return distanceMeters(origin, { lat: hitLat, lng: hitLng })
}

// Extract faces from a building polygon (each edge is a face)
export function extractFaces(building: BuildingPolygon): BuildingFace[] {
  const coords = building.coords
  const faces: BuildingFace[] = []

  for (let i = 0; i < coords.length; i++) {
    const start = coords[i]
    const end = coords[(i + 1) % coords.length]

    const midLat = (start.lat + end.lat) / 2
    const midLng = (start.lng + end.lng) / 2

    // Edge vector
    const dLat = end.lat - start.lat
    const dLng = end.lng - start.lng

    // Outward normal (rotate edge 90 degrees clockwise)
    // Edge direction: (dLng, dLat) in map space
    // Normal pointing outward: depends on polygon winding
    // For OSM (counter-clockwise), right-hand normal = outward
    const normalLat = -dLng
    const normalLng = dLat

    // Convert to compass bearing
    let bearing = (Math.atan2(normalLng, normalLat) * 180) / Math.PI
    if (bearing < 0) bearing += 360

    // Edge length in meters (skip tiny edges)
    const length = distanceMeters(start, end)
    if (length < 2) continue

    faces.push({
      start,
      end,
      centroid: { lat: midLat, lng: midLng },
      bearing,
      label: bearingToLabel(bearing),
    })
  }

  return faces
}

function bearingToLabel(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(bearing / 45) % 8
  return directions[index]
}

// The core analysis: for a given window position, check all (hour, month) combos
export function analyzeUnit(
  windowPoint: LatLng,
  floor: number,
  faceBearing: number,
  faceLabel: string,
  targetBuildingId: number,
  nearbyBuildings: BuildingPolygon[],
  address: string
): UnitAnalysis {
  const windowHeight = floor * METERS_PER_FLOOR
  const yearlyData = generateYearlySunData(windowPoint)
  const results: SunlightResult[] = []

  // Pre-compute convex hulls for nearby buildings (excluding target)
  const obstacles = nearbyBuildings
    .filter(b => b.id !== targetBuildingId)
    .map(b => ({
      hull: convexHull(b.coords),
      height: b.height,
      id: b.id,
      heightSource: b.heightSource,
    }))

  // Data quality
  const known = obstacles.filter(o => o.heightSource === 'measured').length
  const total = obstacles.length

  // Check each (month, hour) pair
  for (const { month, hour, azimuth, altitude } of yearlyData) {
    // Sun below horizon
    if (altitude <= 0) {
      results.push({ hour, month, status: 'DARK', sunAzimuth: azimuth, sunAltitude: altitude })
      continue
    }

    let blocked = false
    let blockedById: number | undefined

    for (const obs of obstacles) {
      const dist = rayIntersectsBuilding(windowPoint, azimuth, obs.hull)
      if (dist === null) continue

      // Line-of-sight height at the intersection point
      const losHeight = windowHeight + dist * Math.tan(toRad(altitude))

      if (obs.height > losHeight) {
        blocked = true
        blockedById = obs.id
        break // First obstruction is enough
      }
    }

    results.push({
      hour,
      month,
      status: blocked ? 'BLOCKED' : 'SUNLIT',
      sunAzimuth: azimuth,
      sunAltitude: altitude,
      blockedBy: blockedById,
    })
  }

  // Compute monthly sun hours
  const monthly = Array(12).fill(0) as number[]
  for (const r of results) {
    if (r.status === 'SUNLIT') {
      monthly[r.month]++
    }
  }
  const annual = monthly.reduce((a, b) => a + b, 0) / 12

  return {
    address,
    lat: windowPoint.lat,
    lng: windowPoint.lng,
    floor,
    faceBearing,
    faceLabel,
    results,
    totalSunHours: { monthly, annual },
    dataQuality: { known, total, confidence: total > 0 ? known / total : 0 },
  }
}

// Quick today-only analysis for the timeline view
export function analyzeTodaySunlight(
  windowPoint: LatLng,
  floor: number,
  targetBuildingId: number,
  nearbyBuildings: BuildingPolygon[]
): SunlightResult[] {
  const windowHeight = floor * METERS_PER_FLOOR
  const todayData = getTodaySunPositions(windowPoint)
  const results: SunlightResult[] = []

  const obstacles = nearbyBuildings
    .filter(b => b.id !== targetBuildingId)
    .map(b => ({
      hull: convexHull(b.coords),
      height: b.height,
      id: b.id,
    }))

  const now = new Date()

  for (const { hour, azimuth, altitude } of todayData) {
    if (altitude <= 0) {
      results.push({ hour, month: now.getMonth(), status: 'DARK', sunAzimuth: azimuth, sunAltitude: altitude })
      continue
    }

    let blocked = false
    let blockedById: number | undefined

    for (const obs of obstacles) {
      const dist = rayIntersectsBuilding(windowPoint, azimuth, obs.hull)
      if (dist === null) continue

      const losHeight = windowHeight + dist * Math.tan(toRad(altitude))
      if (obs.height > losHeight) {
        blocked = true
        blockedById = obs.id
        break
      }
    }

    results.push({
      hour,
      month: now.getMonth(),
      status: blocked ? 'BLOCKED' : 'SUNLIT',
      sunAzimuth: azimuth,
      sunAltitude: altitude,
      blockedBy: blockedById,
    })
  }

  return results
}
