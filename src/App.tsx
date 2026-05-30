import { useState, useCallback, useEffect, useRef } from 'react'
import type { AppState, LatLng } from './types'
import { geocodeAddress } from './lib/geocoding'
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

export default function App() {
  const [state, setState] = useState<AppState>({ phase: 'search' })
  const [selectedFace, setSelectedFace] = useState<number | null>(null)
  const [floor, setFloor] = useState(5)
  const [displayAddress, setDisplayAddress] = useState('')
  // Guards the one-time restore from the URL so it does not re-run on re-render.
  const restoredRef = useRef(false)

  const handleSearch = useCallback(async (query: string) => {
    setState({ phase: 'loading', address: query })

    try {
      // Step 1: Geocode the address
      const { center, displayName } = await geocodeAddress(query)
      setDisplayAddress(displayName)

      // Step 2: Fetch buildings from Overpass
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

      // Step 3: Find the closest building to the geocoded point
      const targetBuilding = findClosestBuilding(buildings, center)
      if (!targetBuilding) {
        setState({ phase: 'error', error: { type: 'NO_BUILDING_DATA', message: 'Could not identify building' } })
        return
      }

      // Step 4: Extract faces
      const faces = extractFaces(targetBuilding)

      setSelectedFace(null)
      setState({
        phase: 'select-face',
        address: displayName,
        building: targetBuilding,
        nearbyBuildings: buildings,
        faces,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      if (msg === 'ADDRESS_NOT_FOUND') {
        setState({ phase: 'error', error: { type: 'ADDRESS_NOT_FOUND', message: msg } })
      } else {
        setState({ phase: 'error', error: { type: 'API_DOWN', message: msg } })
      }
    }
  }, [])

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

  // Current sun azimuth for compass
  const currentSunAzimuth = (() => {
    if (state.phase === 'select-face' || state.phase === 'results') {
      const center = state.building.coords[0]
      const pos = getSunPosition(new Date(), center)
      return pos.altitude > 0 ? pos.azimuth : undefined
    }
    return undefined
  })()

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
            />
            <CompassOverlay sunAzimuth={currentSunAzimuth} />
          </div>

          <div className="results-panel">
            <FloorSlider floor={floor} maxFloor={maxFloor} onChange={handleFloorChange} />

            {state.phase === 'select-face' && (
              <div className="select-face-prompt">
                <p>Click a building face on the map to see sunlight analysis</p>
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
            )}

            {state.phase === 'results' && todayResults && (
              <>
                <SunlightTimeline results={todayResults} />
                <YearlyHeatmap results={state.analysis.results} />
                <SummaryCard analysis={state.analysis} />
                <ShareBar
                  shareUrl={shareUrl}
                  shareTitle={`${state.analysis.faceLabel} face, floor ${state.analysis.floor} sun exposure`}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
