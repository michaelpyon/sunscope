// Encode and decode the current result in the URL so a link reproduces the view.
// We store lat, lng, the selected face index, the floor, and an optional address
// label in the hash fragment. The hash keeps the params out of server logs and
// avoids any reload behavior.

export interface UrlState {
  lat: number
  lng: number
  face: number
  floor: number
  address?: string
}

// Round coordinates to 6 decimals (about 11cm) to keep links short.
function roundCoord(n: number): number {
  return Math.round(n * 1e6) / 1e6
}

export function encodeUrlState(s: UrlState): string {
  const params = new URLSearchParams()
  params.set('lat', String(roundCoord(s.lat)))
  params.set('lng', String(roundCoord(s.lng)))
  params.set('face', String(s.face))
  params.set('floor', String(s.floor))
  if (s.address) params.set('addr', s.address)
  return '#' + params.toString()
}

export function decodeUrlState(hash: string): UrlState | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null

  const params = new URLSearchParams(raw)
  const lat = parseFloat(params.get('lat') || '')
  const lng = parseFloat(params.get('lng') || '')
  const face = parseInt(params.get('face') || '', 10)
  const floor = parseInt(params.get('floor') || '', 10)
  const address = params.get('addr') || undefined

  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    Number.isNaN(face) ||
    Number.isNaN(floor)
  ) {
    return null
  }

  return { lat, lng, face, floor, address }
}

// Write state into the URL without adding a history entry (replaceState) so the
// back button still returns to the previous page rather than prior selections.
export function writeUrlState(s: UrlState): void {
  const hash = encodeUrlState(s)
  const url = window.location.pathname + window.location.search + hash
  window.history.replaceState(null, '', url)
}

// Read state from the current URL on first load.
export function readUrlState(): UrlState | null {
  return decodeUrlState(window.location.hash)
}
