import { Layer, Source } from '@vis.gl/react-maplibre'
import type { ExpressionSpecification } from 'maplibre-gl'
import { ROUTE_COLOURS } from '../../shared/colours'
import { ROUTE_HIT_LAYER_ID, ROUTE_HIT_WIDTH_PX, ROUTE_LINE_LAYER_ID } from './mapConstants'
import type { RouteLines } from './routeGeoJson'

interface RouteLayersProps {
  lines: RouteLines
  selectedRouteId: string | null
}

const ROUND_LINES = { 'line-cap': 'round', 'line-join': 'round' } as const

function whenSelected(
  selectedRouteId: string | null,
  selected: number | string,
  other: number | string | ExpressionSpecification,
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
          'line-color': ROUTE_COLOURS.casing,
          'line-width': whenSelected(selectedRouteId, 10, 7),
        }}
      />
      <Layer
        id={ROUTE_LINE_LAYER_ID}
        type="line"
        layout={{ ...ROUND_LINES, 'line-sort-key': whenSelected(selectedRouteId, 1, 0) }}
        paint={{
          'line-color': whenSelected(selectedRouteId, ROUTE_COLOURS.selected, ['get', 'colour']),
          'line-width': whenSelected(selectedRouteId, 6, 4),
        }}
      />
      <Layer
        id={ROUTE_HIT_LAYER_ID}
        type="line"
        layout={ROUND_LINES}
        paint={{
          'line-color': ROUTE_COLOURS.casing,
          'line-opacity': 0,
          'line-width': ROUTE_HIT_WIDTH_PX,
        }}
      />
    </Source>
  )
}
