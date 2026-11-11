import { Marker } from '@vis.gl/react-maplibre'
import { formatClockTime, instantAfterHours } from '../../shared/time'
import type { Heatmap, Route } from '../../shared/types'
import { TruckBadge } from './TruckBadge'
import { truckPositionAt } from './truckPosition'

interface TruckMarkerProps {
  routes: readonly Route[]
  selectedRouteId: string | null
  heatmap: Heatmap | null
  hourOffset: number
}

// Moves through the map's marker API on each tick; the route lines are not redrawn (FE-08).
export function TruckMarker({ routes, selectedRouteId, heatmap, hourOffset }: TruckMarkerProps) {
  const checkpoints = routes.find((route) => route.id === selectedRouteId)?.checkpoints ?? []
  const timeZone = checkpoints[0]?.time_zone
  if (!heatmap || !timeZone) {
    return null
  }
  const instant = instantAfterHours(heatmap.start_utc, hourOffset)
  const truck = truckPositionAt(checkpoints, instant.getTime())
  if (!truck) {
    return null
  }
  const clock = formatClockTime(instant.toISOString(), timeZone)
  const label = truck.hasArrived ? `Truck arrived, ${clock}` : `Truck at ${clock}`
  return (
    <Marker longitude={truck.position.lon} latitude={truck.position.lat} anchor="center">
      <TruckBadge label={label} hasArrived={truck.hasArrived} />
    </Marker>
  )
}
