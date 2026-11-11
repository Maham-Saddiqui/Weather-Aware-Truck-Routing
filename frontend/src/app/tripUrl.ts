import { MAX_LOAD_LB, SPACING_OPTIONS_MILES } from '../shared/constants'
import { dayjs } from '../shared/time'
import type { Place, SpacingMiles, TripRequest } from '../shared/types'

const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/
const MAX_LABEL_LENGTH = 200

function readNumber(params: URLSearchParams, name: string, limit: number): number | null {
  const text = params.get(name)
  if (text === null || !NUMBER_PATTERN.test(text)) return null
  const value = Number(text)
  return Math.abs(value) <= limit ? value : null
}

function readPlace(params: URLSearchParams, prefix: 'o' | 'd'): Place | null {
  const label = params.get(prefix)
  const lat = readNumber(params, `${prefix}lat`, 90)
  const lon = readNumber(params, `${prefix}lon`, 180)
  const isLabelValid = label !== null && label.length > 0 && label.length <= MAX_LABEL_LENGTH
  return isLabelValid && lat !== null && lon !== null ? { label, lat, lon } : null
}

function readSpacing(params: URLSearchParams): SpacingMiles | null {
  const spacing = Number(params.get('spacing'))
  return SPACING_OPTIONS_MILES.find((option) => option === spacing) ?? null
}

function readDeparture(params: URLSearchParams): string | null {
  const text = params.get('dep')
  const departure = text === null ? null : dayjs(text)
  return departure?.isValid() ? departure.toISOString() : null
}

function readLoad(params: URLSearchParams): number | null {
  const text = params.get('load')
  const isWholeNumber = text !== null && /^\d+$/.test(text)
  return isWholeNumber && Number(text) <= MAX_LOAD_LB ? Number(text) : null
}

export function parseTrip(search: string): TripRequest | null {
  const params = new URLSearchParams(search)
  const origin = readPlace(params, 'o')
  const destination = readPlace(params, 'd')
  const departure = readDeparture(params)
  const load = readLoad(params)
  const spacing = readSpacing(params)
  if (!origin || !destination || departure === null || load === null || spacing === null)
    return null
  const isSamePlace = origin.lat === destination.lat && origin.lon === destination.lon
  if (isSamePlace) return null
  return {
    origin,
    destination,
    departure_utc: departure,
    load_lb: load,
    spacing_miles: spacing,
  }
}

export function encodeTrip(trip: TripRequest): string {
  return new URLSearchParams({
    o: trip.origin.label,
    olat: String(trip.origin.lat),
    olon: String(trip.origin.lon),
    d: trip.destination.label,
    dlat: String(trip.destination.lat),
    dlon: String(trip.destination.lon),
    dep: trip.departure_utc,
    load: String(trip.load_lb),
    spacing: String(trip.spacing_miles),
  }).toString()
}
