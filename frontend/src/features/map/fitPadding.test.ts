import { describe, expect, it } from 'vitest'
import { fitPadding } from './fitPadding'
import { FIT_BOTTOM_CLEARANCE_PX, FIT_PADDING_PX } from './mapConstants'

describe('fitting the map to the routes (REQ-08, NFR-04)', () => {
  it('keeps the route end clear of the forecast panel that floats over the map on wide screens', () => {
    expect(fitPadding(true)).toEqual({
      top: FIT_PADDING_PX,
      left: FIT_PADDING_PX,
      right: FIT_PADDING_PX,
      bottom: FIT_PADDING_PX + FIT_BOTTOM_CLEARANCE_PX,
    })
  })

  it('uses the same margin on every side on phones, where the panel sits below the map', () => {
    expect(fitPadding(false)).toBe(FIT_PADDING_PX)
  })
})
