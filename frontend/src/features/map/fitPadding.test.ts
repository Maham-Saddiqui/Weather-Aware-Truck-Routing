import { describe, expect, it } from 'vitest'
import { fitPadding } from './fitPadding'
import {
  FIT_BOTTOM_CLEARANCE_PX,
  FIT_PADDING_PX,
  FIT_RIGHT_CLEARANCE_PX,
  FIT_TOP_CLEARANCE_PX,
  LEGEND_BOTTOM_PX,
  TRUCK_PIN_HEIGHT_PX,
} from './mapConstants'

describe('fitting the map to the routes (REQ-08, NFR-04)', () => {
  it('keeps the route end clear of the forecast panel that floats over the map on wide screens', () => {
    expect(fitPadding(true).bottom).toBe(FIT_PADDING_PX + FIT_BOTTOM_CLEARANCE_PX)
  })

  it('uses the plain margin at the bottom on phones, where the panel sits below the map', () => {
    expect(fitPadding(false).bottom).toBe(FIT_PADDING_PX)
  })

  it.each([true, false])(
    'leaves room under the legend for a truck pin at the route start (panel over map: %s)',
    (isPanelOverMap) => {
      expect(fitPadding(isPanelOverMap).top).toBe(LEGEND_BOTTOM_PX + TRUCK_PIN_HEIGHT_PX)
      expect(fitPadding(isPanelOverMap).top).toBe(FIT_TOP_CLEARANCE_PX)
    },
  )

  it.each([true, false])(
    'keeps the route clear of the zoom buttons on the right (panel over map: %s)',
    (isPanelOverMap) => {
      expect(fitPadding(isPanelOverMap).right).toBe(FIT_RIGHT_CLEARANCE_PX)
      expect(FIT_RIGHT_CLEARANCE_PX).toBeGreaterThan(FIT_PADDING_PX)
    },
  )
})
