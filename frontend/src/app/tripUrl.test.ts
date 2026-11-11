import { describe, expect, it } from 'vitest'
import type { TripRequest } from '../shared/types'
import { encodeTrip, parseTrip } from './tripUrl'

const TRIP: TripRequest = {
  origin: { label: 'Chicago, Illinois', lat: 41.8781, lon: -87.6298 },
  destination: { label: 'Denver, Colorado', lat: 39.7392, lon: -104.9903 },
  departure_utc: '2026-11-12T14:00:00.000Z',
  load_lb: 42_000,
  spacing_miles: 25,
}

function withChange(changes: Record<string, string>): string {
  const params = new URLSearchParams(encodeTrip(TRIP))
  for (const [name, value] of Object.entries(changes)) params.set(name, value)
  return params.toString()
}

describe('trip in the page address (REQ-14, FE-16)', () => {
  it('restores exactly the trip that was encoded', () => {
    expect(parseTrip(encodeTrip(TRIP))).toEqual(TRIP)
  })

  it('restores the trip from an address with a leading question mark', () => {
    expect(parseTrip(`?${encodeTrip(TRIP)}`)).toEqual(TRIP)
  })

  it('ignores an address with no trip', () => {
    expect(parseTrip('')).toBeNull()
  })

  it.each([
    ['a latitude outside the globe', { olat: '123' }],
    ['a text latitude', { olat: 'north' }],
    ['an empty longitude', { dlon: '' }],
    ['an unknown spacing', { spacing: '30' }],
    ['a weight above 80,000 lb', { load: '80001' }],
    ['a negative weight', { load: '-1' }],
    ['a decimal weight', { load: '10.5' }],
    ['an unreadable departure', { dep: 'tomorrow' }],
    ['a departure that is only a year', { dep: '2026' }],
    ['a departure without a time zone', { dep: '2026-11-12T14:00:00' }],
    ['an empty origin label', { o: '' }],
  ])('rejects %s', (_name, changes) => {
    expect(parseTrip(withChange(changes))).toBeNull()
  })

  it('rejects the same place as origin and destination (RR-29)', () => {
    expect(parseTrip(withChange({ dlat: '41.8781', dlon: '-87.6298' }))).toBeNull()
  })
})
