import { instantAfterHours } from '../../shared/time'
import type { Heatmap, Route } from '../../shared/types'
import { CheckpointMarkers } from './CheckpointMarkers'
import { EndpointMarkers } from './EndpointMarkers'
import type { EndpointLabels } from './EndpointMarkers'
import { TruckFollower } from './TruckFollower'
import { TruckMarker } from './TruckMarker'

interface RouteMarkersProps {
  routes: readonly Route[]
  selectedRouteId: string | null
  selectedCheckpointIndex: number | null
  onSelectCheckpoint: (routeId: string, checkpointIndex: number) => void
  heatmap: Heatmap | null
  hourOffset: number
  showTruckRequest?: number
  endpointLabels?: EndpointLabels
}

// Kept apart from the route lines, which are memoised, so a slider tick redraws markers only (FE-08).
// The truck comes first so the checkpoint dots stay on top of it and remain clickable; the two route ends come last.
export function RouteMarkers({
  routes,
  heatmap,
  hourOffset,
  showTruckRequest,
  endpointLabels,
  ...checkpoints
}: RouteMarkersProps) {
  const route = routes.find((candidate) => candidate.id === checkpoints.selectedRouteId)
  if (!route) {
    return null
  }
  const forecastMs = heatmap && instantAfterHours(heatmap.start_utc, hourOffset).getTime()
  return (
    <>
      {heatmap && (
        <TruckMarker key={route.id} route={route} heatmap={heatmap} hourOffset={hourOffset} />
      )}
      {heatmap && (
        <TruckFollower
          route={route}
          heatmap={heatmap}
          hourOffset={hourOffset}
          showTruckRequest={showTruckRequest}
        />
      )}
      <CheckpointMarkers route={route} forecastMs={forecastMs} {...checkpoints} />
      <EndpointMarkers route={route} labels={endpointLabels} />
    </>
  )
}
