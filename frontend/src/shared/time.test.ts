import { describe, expect, it } from 'vitest'
import {
  dayjs,
  formatClockTime,
  formatDuration,
  formatLocalTime,
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

  it('writes travel time as hours and minutes', () => {
    expect(formatDuration(4200)).toBe('1 h 10 min')
    expect(formatDuration(1500)).toBe('25 min')
  })
})
