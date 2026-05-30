import type { LatLng } from '../types'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

// A single geocoder candidate the user can confirm or switch to.
export interface GeocodeCandidate {
  center: LatLng
  displayName: string
}

export interface GeocodeResult {
  center: LatLng
  displayName: string
  // Up to 5 ranked matches so a wrong top pick is visible and recoverable.
  candidates: GeocodeCandidate[]
}

export async function geocodeAddress(query: string): Promise<GeocodeResult> {
  if (!MAPBOX_TOKEN) {
    throw new Error('VITE_MAPBOX_TOKEN not set')
  }

  // Ask for up to 5 matches so the resolved address can be confirmed and
  // alternates offered, instead of blind-picking a single result.
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=address&limit=5`
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`)
  }

  const data = await res.json()

  if (!data.features || data.features.length === 0) {
    throw new Error('ADDRESS_NOT_FOUND')
  }

  const candidates: GeocodeCandidate[] = data.features.map((f: { center: [number, number]; place_name: string }) => {
    const [lng, lat] = f.center
    return { center: { lat, lng }, displayName: f.place_name }
  })

  return {
    center: candidates[0].center,
    displayName: candidates[0].displayName,
    candidates,
  }
}
