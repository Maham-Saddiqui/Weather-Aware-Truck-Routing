import { describe, expect, it } from 'vitest'
import { FOLLOW_PANEL_CLEARANCE_PX } from './mapConstants'
import { isInsideSafeArea, safeAreaCentreOffset, safeMargins } from './safeArea'

const SIZE = { width: 1000, height: 600 }
const WIDE = safeMargins(true)
const PHONE = safeMargins(false)

describe('isInsideSafeArea keeps the truck in the part of the map the driver can see (REQ-08, REQ-09, FE-07)', () => {
  it('accepts a truck in the middle of the map', () => {
    expect(isInsideSafeArea({ x: 500, y: 250 }, SIZE, WIDE)).toBe(true)
  })

  it('accepts a truck just inside each margin and refuses one just outside', () => {
    expect(isInsideSafeArea({ x: WIDE.left, y: 250 }, SIZE, WIDE)).toBe(true)
    expect(isInsideSafeArea({ x: WIDE.left - 1, y: 250 }, SIZE, WIDE)).toBe(false)
    expect(isInsideSafeArea({ x: SIZE.width - WIDE.right, y: 250 }, SIZE, WIDE)).toBe(true)
    expect(isInsideSafeArea({ x: SIZE.width - WIDE.right + 1, y: 250 }, SIZE, WIDE)).toBe(false)
    expect(isInsideSafeArea({ x: 500, y: WIDE.top - 1 }, SIZE, WIDE)).toBe(false)
  })

  it('refuses a truck that left the map', () => {
    expect(isInsideSafeArea({ x: -40, y: 250 }, SIZE, WIDE)).toBe(false)
    expect(isInsideSafeArea({ x: 500, y: 900 }, SIZE, WIDE)).toBe(false)
  })

  it('refuses a truck behind the forecast panel on a wide screen but not on a phone', () => {
    const behindPanel = { x: 500, y: SIZE.height - FOLLOW_PANEL_CLEARANCE_PX / 2 }

    expect(isInsideSafeArea(behindPanel, SIZE, WIDE)).toBe(false)
    expect(isInsideSafeArea(behindPanel, SIZE, PHONE)).toBe(true)
  })

  it('refuses a truck under the legend at the top', () => {
    expect(isInsideSafeArea({ x: 100, y: 20 }, SIZE, PHONE)).toBe(false)
  })
})

describe('safeAreaCentreOffset (NFR-04)', () => {
  it('is zero sideways because both side margins are equal', () => {
    expect(safeAreaCentreOffset(WIDE)[0]).toBe(0)
  })

  it('moves the truck up when the panel covers the bottom, and down when only the top is covered', () => {
    expect(safeAreaCentreOffset(WIDE)[1]).toBeLessThan(0)
    expect(safeAreaCentreOffset({ top: 80, right: 0, bottom: 0, left: 0 })[1]).toBe(40)
  })
})
