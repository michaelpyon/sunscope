import SunCalc from 'suncalc'
import type { LatLng } from '../types'

// Get sun position for a given time and location
export function getSunPosition(date: Date, location: LatLng): { azimuth: number; altitude: number } {
  const pos = SunCalc.getPosition(date, location.lat, location.lng)
  // SunCalc returns azimuth in radians from south, clockwise
  // Convert to degrees from north, clockwise (compass bearing)
  let azimuthDeg = (pos.azimuth * 180) / Math.PI + 180
  if (azimuthDeg >= 360) azimuthDeg -= 360

  const altitudeDeg = (pos.altitude * 180) / Math.PI

  return { azimuth: azimuthDeg, altitude: altitudeDeg }
}

// Generate sun positions for each hour of each month (representative day = 15th)
export function generateYearlySunData(location: LatLng, year: number = 2024): Array<{ month: number; hour: number; azimuth: number; altitude: number }> {
  const data: Array<{ month: number; hour: number; azimuth: number; altitude: number }> = []

  for (let month = 0; month < 12; month++) {
    for (let hour = 5; hour <= 20; hour++) {
      // Use 15th of each month as representative
      const date = new Date(year, month, 15, hour, 0, 0)
      const { azimuth, altitude } = getSunPosition(date, location)
      data.push({ month, hour, azimuth, altitude })
    }
  }

  return data
}

// Get sunrise/sunset times for a given date
export function getSunTimes(date: Date, location: LatLng): { sunrise: Date; sunset: Date } {
  const times = SunCalc.getTimes(date, location.lat, location.lng)
  return { sunrise: times.sunrise, sunset: times.sunset }
}

// Get golden hour times
export function getGoldenHour(date: Date, location: LatLng): { morning: { start: Date; end: Date }; evening: { start: Date; end: Date } } {
  const times = SunCalc.getTimes(date, location.lat, location.lng)
  return {
    morning: { start: times.sunrise, end: times.goldenHourEnd },
    evening: { start: times.goldenHour, end: times.sunset },
  }
}

// Today's hourly sunlight status (for the timeline view)
export function getTodaySunPositions(location: LatLng): Array<{ hour: number; azimuth: number; altitude: number }> {
  const now = new Date()
  const data: Array<{ hour: number; azimuth: number; altitude: number }> = []

  for (let hour = 0; hour < 24; hour++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0)
    const { azimuth, altitude } = getSunPosition(date, location)
    data.push({ hour, azimuth, altitude })
  }

  return data
}
