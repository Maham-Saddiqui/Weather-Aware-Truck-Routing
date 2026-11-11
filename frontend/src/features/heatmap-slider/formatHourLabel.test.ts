import { describe, expect, it } from 'vitest'
import { formatHourLabel } from './formatHourLabel'

describe('formatHourLabel (RR-28 and RR-18: the real clock time with its zone)', () => {
  it('shows the worked example from the rules: Thu 22:00 MT, +6 h', () => {
    expect(formatHourLabel('2026-11-12T23:00:00Z', 6, 'America/Denver')).toBe('Thu 22:00 MT, +6 h')
  })

  it('starts at the departure instant for hour 0', () => {
    expect(formatHourLabel('2026-11-12T23:00:00Z', 0, 'America/Denver')).toBe('Thu 16:00 MT, +0 h')
  })

  it('rolls over to the next day and to hour 48', () => {
    expect(formatHourLabel('2026-11-12T23:00:00Z', 48, 'America/Denver')).toBe(
      'Sat 16:00 MT, +48 h',
    )
  })

  it('keeps real clock time across the spring clock change and the same zone letters', () => {
    expect(formatHourLabel('2026-03-08T07:00:00Z', 1, 'America/Denver')).toBe('Sun 01:00 MT, +1 h')
    expect(formatHourLabel('2026-03-08T07:00:00Z', 2, 'America/Denver')).toBe('Sun 03:00 MT, +2 h')
  })

  it('uses the zone given and not the browser zone', () => {
    expect(formatHourLabel('2026-11-12T23:00:00Z', 0, 'America/New_York')).toBe(
      'Thu 18:00 ET, +0 h',
    )
  })
})
