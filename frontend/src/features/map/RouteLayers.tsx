import { Layer, Source } from '@vis.gl/react-maplibre'
import type { ExpressionSpecification } from 'maplibre-gl'
import {
  ROUTE_CASING_COLOUR,
  ROUTE_COLOUR_MUTED,
  ROUTE_COLOUR_SELECTED,
  ROUTE_HIT_LAYER_ID,
  ROUTE_HIT_WIDTH_PX,
  ROUTE_LINE_LAYER_ID,
} from './mapConstants'
import type { RouteLines } from './routeGeoJson'

interface RouteLayersProps {
  lines: RouteLines
  selectedRouteId: string | null
}

const ROUND_LINES = { 'line-cap': 'round', 'line-join': 'round' } as const

function whenSelected(
  selectedRouteId: string | null,
  selected: number | string,
  other: number | string,
) {
  const isSelected: ExpressionSpecification = ['==', ['get', 'routeId'], selectedRouteId ?? '']
  return ['case', isSelected, selected, other] as ExpressionSpecification
}

export function RouteLayers({ lines, selectedRouteId }: RouteLayersProps) {
  return (
    <Source id="routes" type="geojson" data={lines}>
      <Layer
        id="route-casing"
        type="line"
        layout={{ ...ROUND_LINES, 'line-sort-key': whenSelected(selectedRouteId, 1, 0) }}
        paint={{
          'line-color': ROUTE_CASING_COLOUR,
          'line-width': whenSelected(selectedRouteId, 10, 7),
        }}
      />
      <Layer
        id={ROUTE_LINE_LAYER_ID}
        type="line"
        layout={{ ...ROUND_LINES, 'line-sort-key': whenSelected(selectedRouteId, 1, 0) }}
        paint={{
          'line-color': whenSelected(selectedRouteId, ROUTE_COLOUR_SELECTED, ROUTE_COLOUR_MUTED),
          'line-width': whenSelected(selectedRouteId, 6, 4),
        }}
      />
      <Layer
        id={ROUTE_HIT_LAYER_ID}
        type="line"
        layout={ROUND_LINES}
        paint={{
          'line-color': ROUTE_CASING_COLOUR,
          'line-opacity': 0,
          'line-width': ROUTE_HIT_WIDTH_PX,
        }}
      />
    </Source>
  )
}
