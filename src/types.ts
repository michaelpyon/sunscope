export interface LatLng {
  lat: number
  lng: number
}

export interface BuildingPolygon {
  id: number
  coords: LatLng[]
  height: number
  heightSource: 'measured' | 'levels' | 'estimated'
  levels?: number
}

export interface BuildingFace {
  start: LatLng
  end: LatLng
  centroid: LatLng
  bearing: number // degrees, 0=N, 90=E, 180=S, 270=W
  label: string // "North", "South-East", etc.
}

export interface SunlightResult {
  hour: number // 0-23
  month: number // 0-11
  status: 'SUNLIT' | 'BLOCKED' | 'DARK'
  sunAzimuth?: number
  sunAltitude?: number
  blockedBy?: number // building ID
}

export interface UnitAnalysis {
  address: string
  lat: number
  lng: number
  floor: number
  faceBearing: number
  faceLabel: string
  results: SunlightResult[]
  totalSunHours: { monthly: number[]; annual: number }
  dataQuality: { known: number; total: number; confidence: number }
}

export type AppError =
  | { type: 'API_DOWN'; message: string }
  | { type: 'ADDRESS_NOT_FOUND'; message: string }
  | { type: 'NO_BUILDING_DATA'; message: string }

export type AppState =
  | { phase: 'search' }
  | { phase: 'loading'; address: string }
  | { phase: 'select-face'; address: string; building: BuildingPolygon; nearbyBuildings: BuildingPolygon[]; faces: BuildingFace[] }
  | { phase: 'results'; address: string; analysis: UnitAnalysis; building: BuildingPolygon; nearbyBuildings: BuildingPolygon[]; faces: BuildingFace[] }
  | { phase: 'error'; error: AppError }
