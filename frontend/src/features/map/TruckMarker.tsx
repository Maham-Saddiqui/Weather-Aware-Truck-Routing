import { Marker } from '@vis.gl/react-maplibre'
import type { Marker as MapLibreMarker } from 'maplibre-gl'
import { useRef } from 'react'
import { arrivalEtaUtc, arrivalTimeZone } from '../../shared/arrival'
import { formatClockTime } from '../../shared/time'
import type { Heatmap, Route } from '../../shared/types'
import { TruckBadge } from './TruckBadge'
import { truckAtHour } from './truckAtHour'
import type { TruckAtHour } from './truckAtHour'
import { useTweenedMarker } from './useTweenedMarker'

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
    return `Truck arrived at ${formatClockTime(arrival, arrivalTimeZone(route) ?? truck.timeZone)}`
  }
  return `Truck at ${formatClockTime(truck.instant.toISOString(), truck.timeZone)}`
}

interface TruckPinProps {
  label: string
  truck: TruckAtHour
}

function TruckPin({ label, truck }: TruckPinProps) {
  const markerRef = useRef<MapLibreMarker>(null)
  useTweenedMarker(markerRef, truck.position)
  return (
    <Marker
      ref={markerRef}
      longitude={truck.position.lon}
      latitude={truck.position.lat}
      anchor="bottom"
      offset={LIFT_ABOVE_ROUTE}
    >
      <TruckBadge label={label} hasArrived={truck.hasArrived} />
    </Marker>
  )
}

// Moves through the map's marker API on each tick; the route lines are not redrawn (FE-08).
// Keyed by route in RouteMarkers, so choosing another route puts the truck there at once instead of gliding.
export function TruckMarker({ route, heatmap, hourOffset }: TruckMarkerProps) {
  const truck = truckAtHour(route, heatmap, hourOffset)
  return truck && <TruckPin label={labelFor(route, truck)} truck={truck} />
}
