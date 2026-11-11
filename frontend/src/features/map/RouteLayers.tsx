import { Layer, Source } from '@vis.gl/react-maplibre'
import type { ExpressionSpecification } from 'maplibre-gl'
import { useTheme } from '@mui/material/styles'
import { ROUTE_CASING_COLOUR } from '../../shared/colours'
import { ROUTE_HIT_LAYER_ID, ROUTE_HIT_WIDTH_PX, ROUTE_LINE_LAYER_ID } from './mapConstants'
import type { RouteLines } from './routeGeoJson'

interface RouteLayersProps {
  lines: RouteLines
  selectedRouteId: string | null
}

const HALO_OPACITY = 0.35
const HALO_WIDTH_PX = 16

function hueByPosition(hues: readonly string[]): ExpressionSpecification {
  const [first = '', second = first, third = first] = hues
  return ['match', ['get', 'position'], 0, first, 1, second, third]
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

const HIT_PAINT = {
  'line-color': ROUTE_CASING_COLOUR,
  'line-opacity': 0,
  'line-width': ROUTE_HIT_WIDTH_PX,
} as const

// Every route keeps its own hue; the selected one is told apart by width and a halo, never by changing colour.
// The layers must stay direct children of the source, which hands them its id.
export function RouteLayers({ lines, selectedRouteId }: RouteLayersProps) {
  const { palette } = useTheme()
  const isSelected: ExpressionSpecification = ['==', ['get', 'routeId'], selectedRouteId ?? '']
  const sortKey = { ...ROUND_LINES, 'line-sort-key': whenSelected(selectedRouteId, 1, 0) }
  return (
    <Source id="routes" type="geojson" data={lines}>
      <Layer
        id="route-halo"
        type="line"
        filter={isSelected}
        layout={ROUND_LINES}
        paint={{
          'line-color': palette.common.white,
          'line-opacity': HALO_OPACITY,
          'line-width': HALO_WIDTH_PX,
        }}
      />
      <Layer
        id="route-casing"
        type="line"
        layout={sortKey}
        paint={{
          'line-color': ROUTE_CASING_COLOUR,
          'line-width': whenSelected(selectedRouteId, 10, 7),
        }}
      />
      <Layer
        id={ROUTE_LINE_LAYER_ID}
        type="line"
        layout={sortKey}
        paint={{
          'line-color': hueByPosition(palette.route),
          'line-width': whenSelected(selectedRouteId, 6, 4),
        }}
      />
      <Layer id={ROUTE_HIT_LAYER_ID} type="line" layout={ROUND_LINES} paint={HIT_PAINT} />
    </Source>
  )
}
