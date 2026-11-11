import { describe, expect, it } from 'vitest'
import {
  dayjs,
  formatClockTime,
  formatDuration,
  formatLocalTime,
  instantAfterHours,
  tomorrowMorning,
  zoneAbbreviation,
} from './time'

describe('time formatting', () => {
  it('shows an arrival in the checkpoint zone with its abbreviation (RR-18)', () => {
    const text = formatLocalTime('2026-11-12T21:05:00Z', 'America/Denver')

    expect(text).toBe('Thu, Nov 12, 14:05 MT')
  })

  it('writes the same abbreviation everywhere, generic and not MST or MDT (RR-18)', () => {
    expect(formatClockTime('2026-11-12T21:05:00Z', 'America/Denver')).toBe('Thu 14:05 MT')
    expect(formatClockTime('2026-07-02T20:05:00Z', 'America/Denver')).toBe('Thu 14:05 MT')
    expect(formatLocalTime('2026-07-02T20:05:00Z', 'America/Denver')).toContain('14:05 MT')
    expect(zoneAbbreviation('2026-07-02T20:05:00Z', 'America/Denver')).toBe('MT')
  })

  it('shows midnight as 00 and not 24 (RR-18)', () => {
    expect(formatClockTime('2026-11-12T06:00:00Z', 'America/Chicago')).toBe('Thu 00:00 CT')
  })

  it('shows a different abbreviation for the same instant in another zone (RR-18)', () => {
    expect(zoneAbbreviation('2026-11-12T21:05:00Z', 'America/Chicago')).toBe('CT')
    expect(zoneAbbreviation('2026-11-12T21:05:00Z', 'America/New_York')).toBe('ET')
  })

  it('names the departure tomorrow at 08:00 in the given zone (REQ-11)', () => {
    const now = dayjs('2026-11-11T20:00:00Z')

    const departure = tomorrowMorning(now, 'America/Los_Angeles')

    expect(departure.toISOString()).toBe('2026-11-12T16:00:00.000Z')
  })

  it.each([
    ['America/Chicago', '2026-10-31T23:00:00Z', '2026-11-01T14:00:00.000Z'],
    ['America/Chicago', '2027-03-13T23:00:00Z', '2027-03-14T13:00:00.000Z'],
    ['America/Los_Angeles', '2026-10-31T20:00:00Z', '2026-11-01T16:00:00.000Z'],
    ['America/Los_Angeles', '2027-03-13T20:00:00Z', '2027-03-14T15:00:00.000Z'],
    ['America/Denver', '2026-10-31T20:00:00Z', '2026-11-01T15:00:00.000Z'],
    ['America/Denver', '2027-03-13T20:00:00Z', '2027-03-14T14:00:00.000Z'],
  ])(
    'keeps 08:00 local on the day before a clock change in %s from %s (RR-18, REQ-11)',
    (zone, nowIso, expectedIso) => {
      const departure = tomorrowMorning(dayjs(nowIso), zone)

      expect(departure.toISOString()).toBe(expectedIso)
    },
  )

  it('uses the origin calendar day when it differs from the clock in the browser zone (REQ-11)', () => {
    const lateEveningUtc = dayjs('2026-11-12T03:00:00Z')

    expect(tomorrowMorning(lateEveningUtc, 'America/Los_Angeles').toISOString()).toBe(
      '2026-11-12T16:00:00.000Z',
    )
  })

  it('adds whole hours to the departure instant for the forecast slider (RR-28)', () => {
    expect(instantAfterHours('2026-11-12T23:00:00Z', 6).toISOString()).toBe(
      '2026-11-13T05:00:00.000Z',
    )
  })

  it('writes travel time as hours and minutes', () => {
    expect(formatDuration(4200)).toBe('1 h 10 min')
    expect(formatDuration(1500)).toBe('25 min')
  })
})
