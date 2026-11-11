import { instantAfterHours } from '../../shared/time'
import type { Heatmap, Route } from '../../shared/types'
import { CheckpointMarkers } from './CheckpointMarkers'
import { TruckFollower } from './TruckFollower'
import { TruckMarker } from './TruckMarker'

interface RouteMarkersProps {
  routes: readonly Route[]
  selectedRouteId: string | null
  selectedCheckpointIndex: number | null
  onSelectCheckpoint: (routeId: string, checkpointIndex: number) => void
  heatmap: Heatmap | null
  hourOffset: number
}

// Kept apart from the route lines, which are memoised, so a slider tick redraws markers only (FE-08).
// The truck comes first so the checkpoint dots stay on top of it and remain clickable.
export function RouteMarkers({ routes, heatmap, hourOffset, ...checkpoints }: RouteMarkersProps) {
  const route = routes.find((candidate) => candidate.id === checkpoints.selectedRouteId)
  if (!route) {
    return null
  }
  const forecastMs = heatmap && instantAfterHours(heatmap.start_utc, hourOffset).getTime()
  return (
    <>
      {heatmap && <TruckMarker route={route} heatmap={heatmap} hourOffset={hourOffset} />}
      {heatmap && <TruckFollower route={route} heatmap={heatmap} hourOffset={hourOffset} />}
      <CheckpointMarkers route={route} forecastMs={forecastMs} {...checkpoints} />
    </>
  )
}
