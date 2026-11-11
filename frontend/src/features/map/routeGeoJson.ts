import type { FeatureCollection, LineString } from 'geojson'
import type { Route } from '../../shared/types'
import { alternateColourFor } from './alternateColours'
import { decodePolyline } from './polyline'
import type { LonLat } from './polyline'

export type RouteLines = FeatureCollection<LineString, { routeId: string; colour: string }>

export type Bounds = [southWest: LonLat, northEast: LonLat]

export function routeLines(routes: readonly Route[]): RouteLines {
  return {
    type: 'FeatureCollection',
    features: routes.map((route, index) => ({
      type: 'Feature',
      properties: { routeId: route.id, colour: alternateColourFor(index) },
      geometry: {
        type: 'LineString',
        coordinates: decodePolyline(route.geometry.data, route.geometry.precision),
      },
    })),
  }
}

export function boundsOfLines(lines: RouteLines): Bounds | null {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity
  for (const feature of lines.features) {
    for (const [longitude = 0, latitude = 0] of feature.geometry.coordinates) {
      west = Math.min(west, longitude)
      east = Math.max(east, longitude)
      south = Math.min(south, latitude)
      north = Math.max(north, latitude)
    }
  }
  return west > east
    ? null
    : [
        [west, south],
        [east, north],
      ]
}
