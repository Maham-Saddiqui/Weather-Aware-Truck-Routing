import { Marker } from '@vis.gl/react-maplibre'
import { arrivalEtaUtc } from '../../shared/arrival'
import { formatClockTime } from '../../shared/time'
import type { Heatmap, Route } from '../../shared/types'
import { TruckBadge } from './TruckBadge'
import { truckAtHour } from './truckAtHour'
import type { TruckAtHour } from './truckAtHour'

const LIFT_ABOVE_ROUTE: [number, number] = [0, -14]

interface TruckMarkerProps {
  route: Route
  heatmap: Heatmap
  hourOffset: number
}

// After arrival the name gives the arrival time, not the slider time, so it never claims the truck is still driving.
function labelFor(route: Route, truck: TruckAtHour): string {
  const arrival = arrivalEtaUtc(route)
  if (truck.hasArrived && arrival) {
    return `Truck arrived at ${formatClockTime(arrival, truck.timeZone)}`
  }
  return `Truck at ${formatClockTime(truck.instant.toISOString(), truck.timeZone)}`
}

// Moves through the map's marker API on each tick; the route lines are not redrawn (FE-08).
export function TruckMarker({ route, heatmap, hourOffset }: TruckMarkerProps) {
  const truck = truckAtHour(route, heatmap, hourOffset)
  if (!truck) {
    return null
  }
  return (
    <Marker
      longitude={truck.position.lon}
      latitude={truck.position.lat}
      anchor="bottom"
      offset={LIFT_ABOVE_ROUTE}
    >
      <TruckBadge label={labelFor(route, truck)} hasArrived={truck.hasArrived} />
    </Marker>
  )
}
