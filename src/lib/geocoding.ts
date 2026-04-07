import type { LatLng } from '../types'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

export async function geocodeAddress(query: string): Promise<{ center: LatLng; displayName: string }> {
  if (!MAPBOX_TOKEN) {
    throw new Error('VITE_MAPBOX_TOKEN not set')
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=address&limit=1`
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`)
  }

  const data = await res.json()

  if (!data.features || data.features.length === 0) {
    throw new Error('ADDRESS_NOT_FOUND')
  }

  const feature = data.features[0]
  const [lng, lat] = feature.center

  return {
    center: { lat, lng },
    displayName: feature.place_name,
  }
}
