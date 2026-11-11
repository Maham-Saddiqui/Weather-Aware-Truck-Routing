import { describe, expect, it } from 'vitest'
import { dayjs } from '../../shared/time'
import {
  checkTripForm,
  DEPARTURE_WINDOW_HINT,
  departureWindow,
  type TripFormValues,
} from './validation'

const NOW = dayjs('2026-11-11T10:20:00Z')

const VALID: TripFormValues = {
  origin: { label: 'Chicago', lat: 41.88, lon: -87.63 },
  destination: { label: 'Denver', lat: 39.74, lon: -104.99 },
  departure: NOW.add(1, 'day'),
  loadLb: '42000',
  spacingMiles: 25,
}

function errorsFor(changes: Partial<TripFormValues>) {
  const result = checkTripForm({ ...VALID, ...changes }, NOW)
  return result.isValid ? {} : result.errors
}

describe('trip form validation (RR-29)', () => {
  it('accepts a complete trip and builds the request', () => {
    const result = checkTripForm(VALID, NOW)

    expect(result).toMatchObject({ isValid: true, trip: { load_lb: 42_000, spacing_miles: 25 } })
  })

  it('accepts a departure within the current hour', () => {
    expect(errorsFor({ departure: NOW.subtract(15, 'minute') }).departure).toBeUndefined()
  })

  it('rejects a departure before the current hour', () => {
    expect(errorsFor({ departure: NOW.subtract(2, 'hour') }).departure).toBe(
      'Departure cannot be in the past.',
    )
  })

  it('rejects a departure more than 7 days ahead', () => {
    expect(errorsFor({ departure: NOW.add(8, 'day') }).departure).toBe(
      'Departure must be within the next 7 days.',
    )
  })

  it('rejects an empty departure', () => {
    expect(errorsFor({ departure: null }).departure).toBe('Pick a departure date and time.')
  })

  it('rejects the same place as origin and destination', () => {
    expect(errorsFor({ destination: VALID.origin }).destination).toBe(
      'Origin and destination must be different places.',
    )
  })

  it.each(['', 'heavy', '-5', '12.5'])('rejects the weight "%s"', (loadLb) => {
    expect(errorsFor({ loadLb }).loadLb).toContain('Enter the cargo weight')
  })

  it('accepts 0 and 80,000 lb but not 80,001 lb', () => {
    expect(errorsFor({ loadLb: '0' }).loadLb).toBeUndefined()
    expect(errorsFor({ loadLb: '80,000' }).loadLb).toBeUndefined()
    expect(errorsFor({ loadLb: '80001' }).loadLb).toContain('at most 80,000')
  })
})

describe('departure window (RR-29)', () => {
  it('opens at the start of the current hour and accepts exactly that moment', () => {
    const { earliest } = departureWindow(NOW)

    expect(earliest.toISOString()).toBe('2026-11-11T10:00:00.000Z')
    expect(errorsFor({ departure: earliest }).departure).toBeUndefined()
    expect(errorsFor({ departure: earliest.subtract(1, 'millisecond') }).departure).toBe(
      'Departure cannot be in the past.',
    )
  })

  it('closes exactly 7 days after now and rejects the next millisecond', () => {
    const { latest } = departureWindow(NOW)

    expect(latest.toISOString()).toBe('2026-11-18T10:20:00.000Z')
    expect(errorsFor({ departure: latest }).departure).toBeUndefined()
    expect(errorsFor({ departure: latest.add(1, 'millisecond') }).departure).toContain('7 days')
  })

  it('reads the same window on the clock of an origin zone other than the browser zone', () => {
    const { earliest, latest } = departureWindow(NOW)

    expect(earliest.tz('Pacific/Honolulu').format('YYYY-MM-DD HH:mm')).toBe('2026-11-11 00:00')
    expect(latest.tz('Pacific/Honolulu').format('YYYY-MM-DD HH:mm')).toBe('2026-11-18 00:20')
    expect(earliest.tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm')).toBe('2026-11-11 19:00')
  })

  it('states the same number of days in the hint and in the error message', () => {
    expect(DEPARTURE_WINDOW_HINT).toBe('Departures from now to 7 days ahead')
    expect(errorsFor({ departure: NOW.add(8, 'day') }).departure).toContain('7 days')
  })
})
