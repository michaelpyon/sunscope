import { useState, useCallback, useEffect, useRef } from 'react'
import type { AppState, LatLng, BuildingFace, BuildingPolygon } from './types'
import { geocodeAddress } from './lib/geocoding'
import type { GeocodeCandidate } from './lib/geocoding'
import { fetchBuildings, findClosestBuilding } from './lib/overpass'
import { extractFaces, analyzeUnit, analyzeTodaySunlight } from './lib/obstruction'
import { AddressSearch } from './components/AddressSearch'
import { BuildingMap } from './components/BuildingMap'
import { CompassOverlay } from './components/CompassOverlay'
import { FloorSlider } from './components/FloorSlider'
import { SunlightTimeline } from './components/SunlightTimeline'
import { YearlyHeatmap } from './components/YearlyHeatmap'
import { SummaryCard } from './components/SummaryCard'
import { ShareBar } from './components/ShareBar'
import { ErrorState } from './components/ErrorState'
import { getSunPosition } from './lib/sun'
import { readUrlState, writeUrlState, encodeUrlState } from './lib/urlState'

// Estimate how many floors a building has from its measured height (matches the
// floor slider cap logic so the default floor is always in range).
function estimateMaxFloor(building: BuildingPolygon): number {
  const estimated = Math.round(building.height / 3)
  return Math.min(Math.max(estimated, 2), 60)
}

// Pick a sensible default face: prefer a south-facing one (the most-asked "does
// it get sun" case in the Northern Hemisphere), otherwise fall back to the first
// face. Returns the face index, or null when the building has no usable faces.
function pickDefaultFace(faces: BuildingFace[]): number | null {
  if (faces.length === 0) return null
  // Bearing 180 is due south. Score each face by how close it points to south,
  // accepting anything within the southern half (SE through SW).
  let bestIndex = 0
  let bestDiff = Infinity
  faces.forEach((face, i) => {
    const diff = Math.abs(face.bearing - 180)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIndex = i
    }
  })
  // Within 90 degrees of south counts as south-facing; otherwise use face 0.
  return bestDiff <= 90 ? bestIndex : 0
}

// Pick a representative floor: a mid floor for taller buildings, floor 1 for
// low-rise. Keeps the auto-run analysis sensible without user input.
function pickDefaultFloor(building: BuildingPolygon): number {
  const maxFloor = estimateMaxFloor(building)
  if (maxFloor <= 3) return 1
  return Math.max(1, Math.round(maxFloor / 2))
}

export default function App() {
  const [state, setState] = useState<AppState>({ phase: 'search' })
  const [selectedFace, setSelectedFace] = useState<number | null>(null)
  const [floor, setFloor] = useState(5)
  const [displayAddress, setDisplayAddress] = useState('')
  // Other geocoder matches so a wrong top pick is visible and switchable.
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([])
  // Guards the one-time restore from the URL so it does not re-run on re-render.
  const restoredRef = useRef(false)

  // Load buildings around a resolved point, then auto-select a sensible default
  // face and floor and run the analysis immediately so the payoff appears with
  // no "click a building face" step. Falls back to the select-face prompt only
  // when no usable face can be picked.
  const loadAndAnalyze = useCallback(async (center: LatLng, label: string) => {
    setState({ phase: 'loading', address: label })
    setDisplayAddress(label)

    try {
      let buildings
      try {
        buildings = await fetchBuildings(center)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        if (msg === 'API_DOWN') {
          setState({ phase: 'error', error: { type: 'API_DOWN', message: msg } })
          return
        }
        throw e
      }

      if (buildings.length === 0) {
        setState({ phase: 'error', error: { type: 'NO_BUILDING_DATA', message: 'No buildings found' } })
        return
      }

      const targetBuilding = findClosestBuilding(buildings, center)
      if (!targetBuilding) {
        setState({ phase: 'error', error: { type: 'NO_BUILDING_DATA', message: 'Could not identify building' } })
        return
      }

      const faces = extractFaces(targetBuilding)
      const defaultFace = pickDefaultFace(faces)

      // No usable face: fall back to the manual prompt.
      if (defaultFace === null) {
        setSelectedFace(null)
        setState({ phase: 'select-face', address: label, building: targetBuilding, nearbyBuildings: buildings, faces })
        return
      }

      // Auto-select the default face and a representative floor, then analyze.
      const defaultFloor = pickDefaultFloor(targetBuilding)
      const face = faces[defaultFace]
      const analysis = analyzeUnit(
        face.centroid,
        defaultFloor,
        face.bearing,
        face.label,
        targetBuilding.id,
        buildings,
        label
      )
      setFloor(defaultFloor)
      setSelectedFace(defaultFace)
      setState({
        phase: 'results',
        address: label,
        analysis,
        building: targetBuilding,
        nearbyBuildings: buildings,
        faces,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setState({ phase: 'error', error: { type: 'API_DOWN', message: msg } })
    }
  }, [])

  const handleSearch = useCallback(async (query: string) => {
    setState({ phase: 'loading', address: query })

    try {
      // Geocode the address, keeping alternate matches for confirmation.
      const { center, displayName, candidates: matches } = await geocodeAddress(query)
      setCandidates(matches)
      await loadAndAnalyze(center, displayName)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      if (msg === 'ADDRESS_NOT_FOUND') {
        setState({ phase: 'error', error: { type: 'ADDRESS_NOT_FOUND', message: msg } })
      } else {
        setState({ phase: 'error', error: { type: 'API_DOWN', message: msg } })
      }
    }
  }, [loadAndAnalyze])

  // Switch to a different geocoder candidate when the top match was wrong.
  const handlePickCandidate = useCallback((candidate: GeocodeCandidate) => {
    loadAndAnalyze(candidate.center, candidate.displayName)
  }, [loadAndAnalyze])

  const handleFaceClick = useCallback((faceIndex: number) => {
    setSelectedFace(faceIndex)
    if (state.phase !== 'select-face' && state.phase !== 'results') return

    const face = state.faces[faceIndex]
    const analysis = analyzeUnit(
      face.centroid,
      floor,
      face.bearing,
      face.label,
      state.building.id,
      state.nearbyBuildings,
      state.address
    )

    setState({
      phase: 'results',
      address: state.address,
      analysis,
      building: state.building,
      nearbyBuildings: state.nearbyBuildings,
      faces: state.faces,
    })
  }, [state, floor])

  const handleFloorChange = useCallback((newFloor: number) => {
    setFloor(newFloor)
    // Re-analyze if a face is selected
    if (selectedFace !== null && (state.phase === 'results' || state.phase === 'select-face')) {
      const face = state.faces[selectedFace]
      const analysis = analyzeUnit(
        face.centroid,
        newFloor,
        face.bearing,
        face.label,
        state.building.id,
        state.nearbyBuildings,
        state.address
      )
      setState({
        phase: 'results',
        address: state.address,
        analysis,
        building: state.building,
        nearbyBuildings: state.nearbyBuildings,
        faces: state.faces,
      })
    }
  }, [state, selectedFace])

  const handleRetry = useCallback(() => {
    setState({ phase: 'search' })
    setSelectedFace(null)
    setCandidates([])
    // Clear the deep-link so a new search starts from a clean URL.
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [])

  // On first load, restore the exact view from a shared deep-link if present.
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    const url = readUrlState()
    if (!url) return

    const center: LatLng = { lat: url.lat, lng: url.lng }
    const label = url.address || ''

    ;(async () => {
      setState({ phase: 'loading', address: label })
      try {
        const buildings = await fetchBuildings(center)
        if (buildings.length === 0) {
          setState({ phase: 'error', error: { type: 'NO_BUILDING_DATA', message: 'No buildings found' } })
          return
        }
        const targetBuilding = findClosestBuilding(buildings, center)
        if (!targetBuilding) {
          setState({ phase: 'error', error: { type: 'NO_BUILDING_DATA', message: 'Could not identify building' } })
          return
        }
        const faces = extractFaces(targetBuilding)
        const faceIndex = url.face >= 0 && url.face < faces.length ? url.face : null

        setDisplayAddress(label)
        setFloor(url.floor)

        if (faceIndex === null) {
          setSelectedFace(null)
          setState({ phase: 'select-face', address: label, building: targetBuilding, nearbyBuildings: buildings, faces })
          return
        }

        const face = faces[faceIndex]
        const analysis = analyzeUnit(
          face.centroid,
          url.floor,
          face.bearing,
          face.label,
          targetBuilding.id,
          buildings,
          label
        )
        setSelectedFace(faceIndex)
        setState({
          phase: 'results',
          address: label,
          analysis,
          building: targetBuilding,
          nearbyBuildings: buildings,
          faces,
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        setState({ phase: 'error', error: { type: 'API_DOWN', message: msg } })
      }
    })()
  }, [])

  // Keep the URL in sync with the current result so any view is linkable.
  useEffect(() => {
    if (state.phase !== 'results' || selectedFace === null) return
    writeUrlState({
      lat: state.analysis.lat,
      lng: state.analysis.lng,
      face: selectedFace,
      floor,
      address: state.address || undefined,
    })
  }, [state, selectedFace, floor])

  // Current sun position, used for the compass and the live cast-shadow polygon.
  const currentSun = (() => {
    if (state.phase === 'select-face' || state.phase === 'results') {
      const center = state.building.coords[0]
      return getSunPosition(new Date(), center)
    }
    return undefined
  })()
  // Compass only shows the bearing when the sun is up.
  const currentSunAzimuth = currentSun && currentSun.altitude > 0 ? currentSun.azimuth : undefined

  // Max floor estimate from building height (capped at 60, floor at 2)
  const maxFloor = (() => {
    if (state.phase === 'select-face' || state.phase === 'results') {
      const estimated = Math.round(state.building.height / 3)
      return Math.min(Math.max(estimated, 2), 60)
    }
    return 20
  })()

  // Deep-link URL for the current result, kept in sync by the write effect above.
  const shareUrl = (() => {
    if (state.phase === 'results' && selectedFace !== null) {
      const hash = encodeUrlState({
        lat: state.analysis.lat,
        lng: state.analysis.lng,
        face: selectedFace,
        floor,
        address: state.address || undefined,
      })
      return window.location.origin + window.location.pathname + hash
    }
    return window.location.href
  })()

  // Today's timeline data
  const todayResults = (() => {
    if (state.phase === 'results' && selectedFace !== null) {
      const face = state.faces[selectedFace]
      return analyzeTodaySunlight(face.centroid, floor, state.building.id, state.nearbyBuildings)
    }
    return null
  })()

  // Alternate geocoder matches, excluding the one currently shown, so the user
  // can switch if the top pick was wrong (e.g. Brooklyn vs Manhattan).
  const otherCandidates = candidates.filter((c) => c.displayName !== displayAddress)

  return (
    <div className="app">
      <header className="app-header">
        <h1>SunScope</h1>
        <p className="tagline">See your apartment's sunlight before signing a lease</p>
      </header>

      {state.phase === 'search' && (
        <div className="search-section">
          <AddressSearch onSearch={handleSearch} isLoading={false} />
        </div>
      )}

      {state.phase === 'loading' && (
        <div className="search-section">
          <AddressSearch onSearch={handleSearch} isLoading={true} />
          <div className="loading-indicator">
            <div className="spinner large" />
            <p>Finding building data...</p>
          </div>
        </div>
      )}

      {state.phase === 'error' && (
        <ErrorState error={state.error} onRetry={handleRetry} />
      )}

      {(state.phase === 'select-face' || state.phase === 'results') && (
        <div className="main-layout">
          <div className="map-panel">
            <div className="map-header">
              <button className="back-button" onClick={handleRetry}>← New search</button>
              <span className="current-address">{displayAddress}</span>
            </div>
            <BuildingMap
              center={state.building.coords[0]}
              building={state.building}
              nearbyBuildings={state.nearbyBuildings}
              faces={state.faces}
              selectedFace={selectedFace}
              onFaceClick={handleFaceClick}
              sunAzimuth={currentSun && currentSun.altitude > 0 ? currentSun.azimuth : undefined}
              sunAltitude={currentSun && currentSun.altitude > 0 ? currentSun.altitude : undefined}
            />
            <CompassOverlay sunAzimuth={currentSunAzimuth} />
          </div>

          <div className="results-panel">
            {/* Confirm or correct the geocoded address so a wrong pick is recoverable. */}
            {displayAddress && (
              <div className="geocode-confirm">
                <p className="geocode-confirm-label">
                  Showing: <strong>{displayAddress}</strong>
                </p>
                <p className="geocode-confirm-hint">
                  Not right? <button className="link-button" onClick={handleRetry}>Search again</button>
                  {otherCandidates.length > 0 && ' or pick a closer match below.'}
                </p>
                {otherCandidates.length > 0 && (
                  <div className="candidate-list">
                    {otherCandidates.map((c) => (
                      <button
                        key={c.displayName}
                        className="candidate-button"
                        onClick={() => handlePickCandidate(c)}
                      >
                        {c.displayName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <FloorSlider floor={floor} maxFloor={maxFloor} onChange={handleFloorChange} />

            {/* Persistent side picker so the auto-selected default is obvious and adjustable. */}
            <div className="face-picker">
              <p className="face-picker-label">Which side of the building?</p>
              <div className="face-list">
                {state.faces.map((face, i) => (
                  <button
                    key={i}
                    className={`face-button ${selectedFace === i ? 'selected' : ''}`}
                    onClick={() => handleFaceClick(i)}
                  >
                    {face.label} ({Math.round(face.bearing)}°)
                  </button>
                ))}
              </div>
            </div>

            {/* Fallback only: shown when no face could be auto-selected. */}
            {state.phase === 'select-face' && (
              <div className="select-face-prompt">
                <p>Pick a side above, or tap a building face on the map, to see its sunlight.</p>
              </div>
            )}

            {state.phase === 'results' && todayResults && (
              <>
                <SunlightTimeline results={todayResults} />
                <YearlyHeatmap results={state.analysis.results} />
                <SummaryCard analysis={state.analysis} permalink={shareUrl} />
                <ShareBar
                  shareUrl={shareUrl}
                  shareTitle={`${state.analysis.faceLabel} face, floor ${state.analysis.floor} sun exposure`}
                />
                {/* Trust signal: name the public data sources so the result does
                    not read as a black box to a skeptical first-time visitor. */}
                <details className="how-it-works">
                  <summary>How this works</summary>
                  <p>
                    Building footprints come from <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> via Overpass. Sun positions are computed locally with <a href="https://github.com/mourner/suncalc" target="_blank" rel="noopener noreferrer">SunCalc</a>. Heights are tagged as measured when present in OSM and estimated otherwise; the confidence percentage on the summary card reflects how many neighbors had measured heights.
                  </p>
                </details>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
