import { useRef, useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { LatLng, BuildingPolygon, BuildingFace } from '../types'

interface Props {
  center: LatLng
  building: BuildingPolygon
  nearbyBuildings: BuildingPolygon[]
  faces: BuildingFace[]
  selectedFace: number | null
  onFaceClick: (faceIndex: number) => void
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

export function BuildingMap({ center, building, nearbyBuildings, faces, selectedFace, onFaceClick }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [center.lng, center.lat],
      zoom: 17,
      pitch: 0,
      bearing: 0,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.on('load', () => {
      setMapLoaded(true)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
  }, [center.lat, center.lng])

  // Draw buildings and faces when map is loaded
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    // Nearby buildings (gray fill)
    const nearbyFeatures = nearbyBuildings
      .filter(b => b.id !== building.id)
      .map(b => ({
        type: 'Feature' as const,
        properties: { id: b.id, height: b.height },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[...b.coords.map(c => [c.lng, c.lat]), [b.coords[0].lng, b.coords[0].lat]]],
        },
      }))

    // Target building (highlighted)
    const targetFeature = {
      type: 'Feature' as const,
      properties: { id: building.id, height: building.height },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[...building.coords.map(c => [c.lng, c.lat]), [building.coords[0].lng, building.coords[0].lat]]],
      },
    }

    // Face lines
    const faceFeatures = faces.map((face, i) => ({
      type: 'Feature' as const,
      properties: { index: i, bearing: face.bearing, label: face.label, selected: i === selectedFace },
      geometry: {
        type: 'LineString' as const,
        coordinates: [[face.start.lng, face.start.lat], [face.end.lng, face.end.lat]],
      },
    }))

    // Remove existing sources/layers
    for (const id of ['nearby-buildings', 'target-building', 'faces', 'face-labels']) {
      if (map.getLayer(id)) map.removeLayer(id)
      if (map.getLayer(id + '-outline')) map.removeLayer(id + '-outline')
      if (map.getSource(id)) map.removeSource(id)
    }

    // Add nearby buildings
    map.addSource('nearby-buildings', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: nearbyFeatures },
    })
    map.addLayer({
      id: 'nearby-buildings',
      type: 'fill',
      source: 'nearby-buildings',
      paint: { 'fill-color': '#d1d5db', 'fill-opacity': 0.5 },
    })

    // Add target building
    map.addSource('target-building', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [targetFeature] },
    })
    map.addLayer({
      id: 'target-building',
      type: 'fill',
      source: 'target-building',
      paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.3 },
    })
    map.addLayer({
      id: 'target-building-outline',
      type: 'line',
      source: 'target-building',
      paint: { 'line-color': '#2563eb', 'line-width': 2 },
    })

    // Add face lines
    map.addSource('faces', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: faceFeatures },
    })
    map.addLayer({
      id: 'faces',
      type: 'line',
      source: 'faces',
      paint: {
        'line-color': ['case', ['get', 'selected'], '#f59e0b', '#6366f1'],
        'line-width': ['case', ['get', 'selected'], 5, 3],
      },
    })

    // Face label points
    const labelFeatures = faces.map((face, i) => ({
      type: 'Feature' as const,
      properties: { label: face.label, index: i },
      geometry: {
        type: 'Point' as const,
        coordinates: [face.centroid.lng, face.centroid.lat],
      },
    }))

    map.addSource('face-labels', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: labelFeatures },
    })
    map.addLayer({
      id: 'face-labels',
      type: 'symbol',
      source: 'face-labels',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 12,
        'text-font': ['Open Sans Bold'],
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#1e293b',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
      },
    })

    // Click handler for faces
    map.on('click', 'faces', (e) => {
      if (e.features && e.features[0]) {
        const idx = e.features[0].properties?.index
        if (typeof idx === 'number') onFaceClick(idx)
      }
    })

    map.on('mouseenter', 'faces', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'faces', () => {
      map.getCanvas().style.cursor = ''
    })
  }, [mapLoaded, building, nearbyBuildings, faces, selectedFace, onFaceClick])

  return (
    <div className="building-map">
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      {faces.length > 0 && !selectedFace && selectedFace !== 0 && (
        <div className="map-hint">Click a building face to analyze sunlight</div>
      )}
    </div>
  )
}
