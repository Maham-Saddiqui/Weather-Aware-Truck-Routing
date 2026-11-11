import { describe, expect, it } from 'vitest'
import { encodePolyline, NORTH_ROUTE, TWO_ROUTES } from './routeFixtures'
import { boundsOfLines, routeLines } from './routeGeoJson'

describe('routeLines (REQ-08: one line per route)', () => {
  it('makes one line per route in the order the server sent them, tagged with the route id', () => {
    const { features } = routeLines(TWO_ROUTES)

    expect(features.map((feature) => feature.properties.routeId)).toEqual([
      'route-north',
      'route-south',
    ])
  })

  it('gives each route position its own line colour so alternatives can be told apart', () => {
    const colours = routeLines([NORTH_ROUTE, NORTH_ROUTE, NORTH_ROUTE]).features.map(
      (feature) => feature.properties.colour,
    )

    expect(new Set(colours).size).toBe(3)
  })

  it('decodes each line with the precision stated in its own geometry', () => {
    const points: [number, number][] = [
      [-87.123456, 41.654321],
      [-88.000001, 40.000002],
    ]
    const route = {
      ...NORTH_ROUTE,
      geometry: {
        encoding: 'encoded_polyline' as const,
        precision: 6,
        data: encodePolyline(points, 6),
      },
    }

    const [feature] = routeLines([route]).features

    expect(feature?.geometry.coordinates).toEqual(points)
  })
})

describe('boundsOfLines (REQ-08: fit the map to all routes)', () => {
  it('spans every point of every route, west and south corner first', () => {
    const bounds = boundsOfLines(routeLines(TWO_ROUTES))

    expect(bounds).toEqual([
      [-104.99, 38.63],
      [-87.63, 41.88],
    ])
  })

  it('has no bounds when there are no routes', () => {
    expect(boundsOfLines(routeLines([]))).toBeNull()
  })
})
