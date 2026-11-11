import { Marker } from '@vis.gl/react-maplibre'
import { formatClockTime, instantAfterHours } from '../../shared/time'
import type { Heatmap, Route } from '../../shared/types'
import { TruckBadge } from './TruckBadge'
import { truckPositionAt } from './truckPosition'

const LIFT_ABOVE_ROUTE: [number, number] = [0, -14]

interface TruckMarkerProps {
  route: Route
  heatmap: Heatmap
  hourOffset: number
}

// Moves through the map's marker API on each tick; the route lines are not redrawn (FE-08).
export function TruckMarker({ route, heatmap, hourOffset }: TruckMarkerProps) {
  const instant = instantAfterHours(heatmap.start_utc, hourOffset)
  const truck = truckPositionAt(route.checkpoints, instant.getTime())
  const timeZone = route.checkpoints[0]?.time_zone
  if (!truck || !timeZone) {
    return null
  }
  const clock = formatClockTime(instant.toISOString(), timeZone)
  const label = truck.hasArrived ? `Truck arrived, ${clock}` : `Truck at ${clock}`
  return (
    <Marker
      longitude={truck.position.lon}
      latitude={truck.position.lat}
      anchor="bottom"
      offset={LIFT_ABOVE_ROUTE}
    >
      <TruckBadge label={label} hasArrived={truck.hasArrived} />
    </Marker>
  )
}
