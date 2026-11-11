import { describe, expect, it } from 'vitest'
import { formatEta } from './formatEta'

describe('formatEta (RR-18: every local time carries its zone abbreviation)', () => {
  it('shows the arrival in the checkpoint zone with a generic abbreviation', () => {
    expect(formatEta('2026-11-12T21:05:00Z', 'America/Denver')).toBe('Thu 14:05 MT')
  })

  it('keeps the abbreviation generic in summer time too', () => {
    expect(formatEta('2026-07-02T20:05:00Z', 'America/Denver')).toBe('Thu 14:05 MT')
  })

  it('shows midnight as 00 and not 24', () => {
    expect(formatEta('2026-11-12T06:00:00Z', 'America/Chicago')).toBe('Thu 00:00 CT')
  })
})
