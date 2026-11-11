import { Marker } from '@vis.gl/react-maplibre'
import { formatClockTime } from '../../shared/time'
import type { Heatmap, Route } from '../../shared/types'
import { TruckBadge } from './TruckBadge'
import { truckAtHour } from './truckAtHour'

const LIFT_ABOVE_ROUTE: [number, number] = [0, -14]

interface TruckMarkerProps {
  route: Route
  heatmap: Heatmap
  hourOffset: number
}

// Moves through the map's marker API on each tick; the route lines are not redrawn (FE-08).
export function TruckMarker({ route, heatmap, hourOffset }: TruckMarkerProps) {
  const truck = truckAtHour(route, heatmap, hourOffset)
  if (!truck) {
    return null
  }
  const clock = formatClockTime(truck.instant.toISOString(), truck.timeZone)
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
