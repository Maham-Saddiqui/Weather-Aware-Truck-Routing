import { describe, expect, it } from 'vitest'
import { dayjs } from '../../shared/time'
import { EXAMPLE_TRIPS, exampleTripRequest } from './examples'

describe('example trips', () => {
  it('depart tomorrow at 08:00 in the origin zone so they never fall in the past (REQ-11)', () => {
    const now = dayjs('2026-11-11T20:00:00Z')

    const departures = EXAMPLE_TRIPS.map((example) => ({
      zone: example.originTimeZone,
      departure: dayjs(exampleTripRequest(example, now).departure_utc).tz(example.originTimeZone),
    }))

    for (const { departure } of departures) {
      expect(departure.format('YYYY-MM-DD HH:mm')).toBe('2026-11-12 08:00')
    }
  })

  it('offers three or four trips with the default spacing (REQ-11)', () => {
    expect(EXAMPLE_TRIPS.length).toBeGreaterThanOrEqual(3)
    expect(EXAMPLE_TRIPS.length).toBeLessThanOrEqual(4)
    for (const example of EXAMPLE_TRIPS) {
      expect(exampleTripRequest(example, dayjs()).spacing_miles).toBe(25)
    }
  })
})
