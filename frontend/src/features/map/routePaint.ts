import type { ExpressionSpecification } from 'maplibre-gl'
import { ROUTE_CASING_COLOUR } from '../../shared/colours'

// The selected route is the loudest thing on the map: wide, solid and haloed. The others stay thin and see-through
// but remain clickable (the hit layer is wider than either) and readable beside their checkpoint dots.
export const SELECTED_ROUTE = { linePx: 7, casingPx: 11, opacity: 1 } as const
export const OTHER_ROUTE = { linePx: 3, casingPx: 5, opacity: 0.6 } as const
export const HALO_WIDTH_PX = 18
export const HALO_OPACITY = 0.35

export function selectedRouteFilter(selectedRouteId: string | null): ExpressionSpecification {
  return ['==', ['get', 'routeId'], selectedRouteId ?? '']
}

function whenSelected(selectedRouteId: string | null, selected: number, other: number) {
  return ['case', selectedRouteFilter(selectedRouteId), selected, other] as ExpressionSpecification
}

export function selectedOnTop(selectedRouteId: string | null) {
  return { 'line-sort-key': whenSelected(selectedRouteId, 1, 0) }
}

function hueByPosition(hues: readonly string[]): ExpressionSpecification {
  const [first = '', second = first, third = first] = hues
  return ['match', ['get', 'position'], 0, first, 1, second, third]
}

export function casingPaint(selectedRouteId: string | null) {
  return {
    'line-color': ROUTE_CASING_COLOUR,
    'line-width': whenSelected(selectedRouteId, SELECTED_ROUTE.casingPx, OTHER_ROUTE.casingPx),
    'line-opacity': whenSelected(selectedRouteId, SELECTED_ROUTE.opacity, OTHER_ROUTE.opacity),
  }
}

export function linePaint(selectedRouteId: string | null, hues: readonly string[]) {
  return {
    'line-color': hueByPosition(hues),
    'line-width': whenSelected(selectedRouteId, SELECTED_ROUTE.linePx, OTHER_ROUTE.linePx),
    'line-opacity': whenSelected(selectedRouteId, SELECTED_ROUTE.opacity, OTHER_ROUTE.opacity),
  }
}
