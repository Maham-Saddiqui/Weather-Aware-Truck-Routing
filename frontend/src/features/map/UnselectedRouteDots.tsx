import { Layer, Source } from '@vis.gl/react-maplibre'
import type { ExpressionSpecification } from 'maplibre-gl'
import { useMemo } from 'react'
import { RISK_COLOURS, ROUTE_CASING_COLOUR } from '../../shared/colours'
import type { Route } from '../../shared/types'
import {
  UNSELECTED_DOT_LAYER_IDS,
  UNSELECTED_DOT_TIER_MIN_ZOOMS,
  UNSELECTED_DOTS_SOURCE_ID,
} from './mapConstants'
import { unselectedDotFeatures } from './unselectedDotFeatures'

interface UnselectedRouteDotsProps {
  routes: readonly Route[]
  selectedRouteId: string | null
}

const DOT_RADIUS_BY_ZOOM: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  3,
  3,
  9,
  6,
]
const DOT_COLOUR_BY_LEVEL: ExpressionSpecification = [
  'match',
  ['get', 'level'],
  'low',
  RISK_COLOURS.low,
  'moderate',
  RISK_COLOURS.moderate,
  'high',
  RISK_COLOURS.high,
  'severe',
  RISK_COLOURS.severe,
  'no_travel',
  RISK_COLOURS.no_travel,
  RISK_COLOURS.no_data,
]

// Small dots in the same risk colours as the selected route's icons; the selected route's own dots are drawn as markers.
// The layers must stay direct children of the source, which hands them its id.
export function UnselectedRouteDots({ routes, selectedRouteId }: UnselectedRouteDotsProps) {
  const dots = useMemo(() => unselectedDotFeatures(routes), [routes])
  return (
    <Source id={UNSELECTED_DOTS_SOURCE_ID} type="geojson" data={dots}>
      {UNSELECTED_DOT_TIER_MIN_ZOOMS.map((minZoom, tier) => (
        <Layer
          key={UNSELECTED_DOT_LAYER_IDS[tier]}
          id={UNSELECTED_DOT_LAYER_IDS[tier]}
          type="circle"
          minzoom={minZoom}
          filter={[
            'all',
            ['==', ['get', 'tier'], tier],
            ['!=', ['get', 'routeId'], selectedRouteId ?? ''],
          ]}
          paint={{
            'circle-radius': DOT_RADIUS_BY_ZOOM,
            'circle-color': DOT_COLOUR_BY_LEVEL,
            'circle-stroke-color': ROUTE_CASING_COLOUR,
            'circle-stroke-width': 1.5,
          }}
        />
      ))}
    </Source>
  )
}
