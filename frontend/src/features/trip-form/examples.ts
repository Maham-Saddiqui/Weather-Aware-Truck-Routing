import type { Dayjs } from 'dayjs'
import { DEFAULT_SPACING_MILES } from '../../shared/constants'
import { tomorrowMorning } from '../../shared/time'
import type { Place, TripRequest } from '../../shared/types'

export interface ExampleTrip {
  name: string
  origin: Place
  destination: Place
  originTimeZone: string
  loadLb: number
}

export const EXAMPLE_TRIPS: readonly ExampleTrip[] = [
  {
    name: 'Chicago to Denver',
    origin: { label: 'Chicago, Illinois', lat: 41.8781, lon: -87.6298 },
    destination: { label: 'Denver, Colorado', lat: 39.7392, lon: -104.9903 },
    originTimeZone: 'America/Chicago',
    loadLb: 42_000,
  },
  {
    name: 'Reno to Los Angeles',
    origin: { label: 'Reno, Nevada', lat: 39.5296, lon: -119.8138 },
    destination: { label: 'Los Angeles, California', lat: 34.0522, lon: -118.2437 },
    originTimeZone: 'America/Los_Angeles',
    loadLb: 42_000,
  },
  {
    name: 'Seattle to Salt Lake City',
    origin: { label: 'Seattle, Washington', lat: 47.6062, lon: -122.3321 },
    destination: { label: 'Salt Lake City, Utah', lat: 40.7608, lon: -111.891 },
    originTimeZone: 'America/Los_Angeles',
    loadLb: 41_000,
  },
  {
    name: 'Minneapolis to Kansas City',
    origin: { label: 'Minneapolis, Minnesota', lat: 44.9778, lon: -93.265 },
    destination: { label: 'Kansas City, Missouri', lat: 39.0997, lon: -94.5786 },
    originTimeZone: 'America/Chicago',
    loadLb: 30_000,
  },
]

export function exampleTripRequest(example: ExampleTrip, now: Dayjs): TripRequest {
  return {
    origin: example.origin,
    destination: example.destination,
    departure_utc: tomorrowMorning(now, example.originTimeZone).toISOString(),
    load_lb: example.loadLb,
    spacing_miles: DEFAULT_SPACING_MILES,
  }
}
