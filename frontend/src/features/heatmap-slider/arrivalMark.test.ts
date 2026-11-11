import { describe, expect, it } from 'vitest'
import { arrivalLabelLeft, arrivalMarkFor } from './arrivalMark'

describe('arrivalMarkFor places the arrival on the slider track (REQ-09, RR-28)', () => {
  it('sits at the arrival hour as a share of the 48 hour track', () => {
    expect(arrivalMarkFor(12, 48)?.percent).toBe(25)
    expect(arrivalMarkFor(36, 48)?.percent).toBe(75)
  })

  it('says in words where the arrival is and that the forecast goes on', () => {
    expect(arrivalMarkFor(14, 48)?.description).toBe(
      'Arrival at +14 h; the forecast continues to +48 h',
    )
  })

  it('is left out when the trip arrives at or after the last forecast hour', () => {
    expect(arrivalMarkFor(48, 48)).toBeNull()
    expect(arrivalMarkFor(60, 48)).toBeNull()
  })
})

describe('arrivalLabelLeft keeps the label on the track (REQ-09)', () => {
  it('clamps the label away from both ends', () => {
    expect(arrivalLabelLeft(1)).toBe('clamp(32px, 1%, calc(100% - 32px))')
  })
})
