import { describe, expect, it } from 'vitest'
import {
  FOLLOW_IN_VIEW_SLACK_PX,
  FOLLOW_MEDIUM_PANEL_CLEARANCE_PX,
  FOLLOW_NARROW_PANEL_CLEARANCE_PX,
  FOLLOW_WIDE_PANEL_CLEARANCE_PX,
} from './mapConstants'
import { isInsideSafeArea, safeAreaCentreOffset, safeMargins } from './safeArea'

const SIZE = { width: 1000, height: 600 }
const WIDE = safeMargins(1000, true)
const PHONE = safeMargins(1000, false)

describe('isInsideSafeArea keeps the truck in the part of the map the driver can see (REQ-08, REQ-09, FE-07)', () => {
  it('accepts a truck in the middle of the map', () => {
    expect(isInsideSafeArea({ x: 500, y: 250 }, SIZE, WIDE)).toBe(true)
  })

  it('accepts a truck on each margin and refuses one a little way outside it', () => {
    const outside = FOLLOW_IN_VIEW_SLACK_PX + 1

    expect(isInsideSafeArea({ x: WIDE.left, y: 250 }, SIZE, WIDE)).toBe(true)
    expect(isInsideSafeArea({ x: WIDE.left - outside, y: 250 }, SIZE, WIDE)).toBe(false)
    expect(isInsideSafeArea({ x: SIZE.width - WIDE.right, y: 250 }, SIZE, WIDE)).toBe(true)
    expect(isInsideSafeArea({ x: SIZE.width - WIDE.right + outside, y: 250 }, SIZE, WIDE)).toBe(
      false,
    )
    expect(isInsideSafeArea({ x: 500, y: WIDE.top - outside }, SIZE, WIDE)).toBe(false)
  })

  it('accepts a route start a pixel outside the margin it was fitted to, so the follow does not undo the fit', () => {
    expect(isInsideSafeArea({ x: WIDE.left - 1, y: WIDE.top - 1 }, SIZE, WIDE)).toBe(true)
  })

  it('refuses a truck that left the map', () => {
    expect(isInsideSafeArea({ x: -40, y: 250 }, SIZE, WIDE)).toBe(false)
    expect(isInsideSafeArea({ x: 500, y: 900 }, SIZE, WIDE)).toBe(false)
  })

  it('refuses a truck behind the forecast panel on a wide screen but not on a phone', () => {
    const behindPanel = { x: 500, y: SIZE.height - FOLLOW_WIDE_PANEL_CLEARANCE_PX / 2 }

    expect(isInsideSafeArea(behindPanel, SIZE, WIDE)).toBe(false)
    expect(isInsideSafeArea(behindPanel, SIZE, PHONE)).toBe(true)
  })

  it('refuses a truck under the legend at the top', () => {
    expect(isInsideSafeArea({ x: 100, y: 20 }, SIZE, PHONE)).toBe(false)
  })
})

describe('safeMargins lets the bottom margin follow the forecast panel, which is taller on a narrower map (REQ-08, FE-07)', () => {
  it.each([
    [1000, FOLLOW_WIDE_PANEL_CLEARANCE_PX],
    [700, FOLLOW_MEDIUM_PANEL_CLEARANCE_PX],
    [441, FOLLOW_MEDIUM_PANEL_CLEARANCE_PX],
    [440, FOLLOW_NARROW_PANEL_CLEARANCE_PX],
    [380, FOLLOW_NARROW_PANEL_CLEARANCE_PX],
  ])('on a map %i px wide keeps the truck %i px above the bottom', (mapWidth, clearance) => {
    expect(safeMargins(mapWidth, true).bottom).toBe(clearance)
  })

  it('grows the clearance as the map narrows', () => {
    expect(safeMargins(600, true).bottom).toBeGreaterThan(safeMargins(900, true).bottom)
    expect(safeMargins(400, true).bottom).toBeGreaterThan(safeMargins(600, true).bottom)
  })

  it('keeps a truck at 150 px from the bottom in view on a wide map but not on a medium one', () => {
    const point = { x: 500, y: SIZE.height - 150 }

    expect(isInsideSafeArea(point, SIZE, safeMargins(900, true))).toBe(true)
    expect(isInsideSafeArea(point, SIZE, safeMargins(600, true))).toBe(false)
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
