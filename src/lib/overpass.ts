import type { LatLng, BuildingPolygon } from '../types'

const QUERY_RADIUS_M = 500
const DEFAULT_HEIGHT = 15 // 5-story estimate
const METERS_PER_LEVEL = 3

// Round to 0.001 degree grid for cache key
function cacheKey(center: LatLng): string {
  const lat = (Math.round(center.lat * 1000) / 1000).toFixed(3)
  const lng = (Math.round(center.lng * 1000) / 1000).toFixed(3)
  return `overpass:${lat},${lng}`
}

function buildQuery(center: LatLng): string {
  return `[out:json][timeout:25];
(
  way["building"](around:${QUERY_RADIUS_M},${center.lat},${center.lng});
  relation["building"](around:${QUERY_RADIUS_M},${center.lat},${center.lng});
);
out body;
>;
out skel qt;`
}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  nodes?: number[]
  tags?: Record<string, string>
  members?: { type: string; ref: number; role: string }[]
}

function parseBuildings(elements: OverpassElement[]): BuildingPolygon[] {
  const nodes = new Map<number, LatLng>()
  const buildings: BuildingPolygon[] = []

  // First pass: index all nodes
  for (const el of elements) {
    if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
      nodes.set(el.id, { lat: el.lat, lng: el.lon })
    }
  }

  // Second pass: build polygons from ways with building tag
  for (const el of elements) {
    if (el.type === 'way' && el.tags?.building && el.nodes) {
      const coords: LatLng[] = []
      for (const nodeId of el.nodes) {
        const node = nodes.get(nodeId)
        if (node) coords.push(node)
      }
      if (coords.length < 3) continue

      // Remove duplicate closing node if present
      const first = coords[0]
      const last = coords[coords.length - 1]
      if (first.lat === last.lat && first.lng === last.lng) {
        coords.pop()
      }

      const { height, source } = parseHeight(el.tags)
      buildings.push({
        id: el.id,
        coords,
        height,
        heightSource: source,
        levels: el.tags['building:levels'] ? parseInt(el.tags['building:levels']) : undefined,
      })
    }
  }

  return buildings
}

function parseHeight(tags: Record<string, string>): { height: number; source: 'measured' | 'levels' | 'estimated' } {
  if (tags.height) {
    const h = parseFloat(tags.height)
    if (!isNaN(h)) return { height: h, source: 'measured' }
  }
  if (tags['building:levels']) {
    const levels = parseInt(tags['building:levels'])
    if (!isNaN(levels)) return { height: levels * METERS_PER_LEVEL, source: 'levels' }
  }
  return { height: DEFAULT_HEIGHT, source: 'estimated' }
}

export async function fetchBuildings(center: LatLng): Promise<BuildingPolygon[]> {
  const key = cacheKey(center)

  // Check localStorage cache
  const cached = localStorage.getItem(key)
  if (cached) {
    try {
      return JSON.parse(cached) as BuildingPolygon[]
    } catch {
      localStorage.removeItem(key)
    }
  }

  const query = buildQuery(center)

  // Use local proxy in dev, Edge Function in prod
  const baseUrl = import.meta.env.DEV ? '/api/overpass' : '/api/overpass-proxy'
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!res.ok) {
    throw new Error('API_DOWN')
  }

  const data = await res.json()
  const buildings = parseBuildings(data.elements || [])

  // Cache in localStorage
  try {
    localStorage.setItem(key, JSON.stringify(buildings))
  } catch {
    // localStorage full, ignore
  }

  return buildings
}

export function findClosestBuilding(buildings: BuildingPolygon[], point: LatLng): BuildingPolygon | null {
  let closest: BuildingPolygon | null = null
  let minDist = Infinity

  for (const b of buildings) {
    for (const c of b.coords) {
      const d = Math.hypot(c.lat - point.lat, c.lng - point.lng)
      if (d < minDist) {
        minDist = d
        closest = b
      }
    }
  }

  return closest
}
