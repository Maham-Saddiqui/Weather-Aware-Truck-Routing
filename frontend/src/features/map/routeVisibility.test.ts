import type { MapRef } from '@vis.gl/react-maplibre'
import { describe, expect, it } from 'vitest'
import type { Bounds } from './routeGeoJson'
import { isRouteInsidePadding } from './routeVisibility'

const PADDING = { top: 130, right: 76, bottom: 156, left: 56 }
const BOUNDS: Bounds = [
  [-100, 30],
  [-90, 40],
]

function mapShowing(corners: { west: number; east: number; north: number; south: number }) {
  return {
    getContainer: () => ({ clientWidth: 1000, clientHeight: 600 }),
    project: ([longitude, latitude]: [number, number]) => ({
      x: longitude === -100 ? corners.west : corners.east,
      y: latitude === 40 ? corners.north : corners.south,
    }),
  } as unknown as MapRef
}

describe('isRouteInsidePadding says whether the whole route is clear of the map overlays (REQ-08)', () => {
  it('accepts a route whose corners are inside the legend, zoom button and forecast margins', () => {
    const map = mapShowing({ west: 100, east: 900, north: 200, south: 400 })

    expect(isRouteInsidePadding(map, BOUNDS, PADDING)).toBe(true)
  })

  it('accepts a route fitted exactly to the margins, allowing for rounding', () => {
    const map = mapShowing({ west: 55, east: 925, north: 129, south: 445 })

    expect(isRouteInsidePadding(map, BOUNDS, PADDING)).toBe(true)
  })

  it.each([
    ['left, under the panel handle', { west: 20, east: 900, north: 200, south: 400 }],
    ['right, under the zoom buttons', { west: 100, east: 960, north: 200, south: 400 }],
    ['top, under the legend', { west: 100, east: 900, north: 60, south: 400 }],
    ['bottom, under the forecast panel', { west: 100, east: 900, north: 200, south: 520 }],
  ])('rejects a route reaching too far %s', (_side, corners) => {
    expect(isRouteInsidePadding(mapShowing(corners), BOUNDS, PADDING)).toBe(false)
  })
})
