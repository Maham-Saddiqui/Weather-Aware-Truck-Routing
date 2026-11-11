import { describe, expect, it } from 'vitest'
import { distanceBetween } from './pointAlong'
import { placePills, sideOffset } from './pillPlacement'
import type { LonLat } from './polyline'
import type { RouteLines } from './routeGeoJson'

function lineOf(routeId: string, position: number, points: LonLat[]): RouteLines['features'][0] {
  return {
    type: 'Feature',
    properties: { routeId, position },
    geometry: { type: 'LineString', coordinates: points },
  }
}

const SHARED_START: LonLat[] = [0, 1, 2, 3, 4].map((longitude) => [longitude, 40])
const lines: RouteLines = {
  type: 'FeatureCollection',
  features: [
    lineOf('a', 0, [...SHARED_START, ...[5, 6, 7, 8, 9, 10].map((x): LonLat => [x, 40])]),
    lineOf('b', 1, [...SHARED_START, ...[5, 6, 7, 8, 9, 10].map((x): LonLat => [x, 43])]),
  ],
}

describe('place route name pills away from other routes and from each other (REQ-08)', () => {
  it('puts each name where its line is clear of the other route, not on the shared start', () => {
    const spots = placePills(lines, 'a')

    expect(spots.get('a')?.[0]).toBeGreaterThan(6)
    expect(spots.get('b')?.[0]).toBeGreaterThan(6)
  })

  it('keeps the two names apart from each other', () => {
    const spots = placePills(lines, 'a')
    const [first = [0, 0], second = [0, 0]] = [...spots.values()]

    expect(distanceBetween(first, second)).toBeGreaterThan(1)
  })

  it('places a name for every route that has a line', () => {
    expect([...placePills(lines, null).keys()]).toEqual(['a', 'b'])
  })
})

describe('shift the selected name beside its line, off the checkpoint dots (REQ-08)', () => {
  it('lifts it above a line that runs across the screen', () => {
    const [sideways, up] = sideOffset(
      [
        [0, 40],
        [1, 40],
        [2, 40],
      ],
      [1, 40],
    )

    expect(sideways).toBeCloseTo(0)
    expect(up).toBeLessThan(-20)
  })

  it('moves it to the right of a line that runs up and down', () => {
    const [sideways, up] = sideOffset(
      [
        [0, 40],
        [0, 41],
        [0, 42],
      ],
      [0, 41],
    )

    expect(sideways).toBeGreaterThan(40)
    expect(up).toBeCloseTo(0)
  })
})
