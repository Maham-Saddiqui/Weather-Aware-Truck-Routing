import Typography from '@mui/material/Typography'
import { arrivalEtaUtc } from '../shared/arrival'
import { formatClockTime, hoursBetween } from '../shared/time'
import type { Heatmap, Route } from '../shared/types'

interface ArrivalNoteProps {
  route: Route
  heatmap: Heatmap
  hourOffset: number
  timeZone: string
}

// Beyond arrival the truck stays parked at the destination, so say so instead of leaving it silently there.
// The region stays mounted and its words change only at arrival, so playback does not spam screen readers (FE-07).
export function ArrivalNote({ route, heatmap, hourOffset, timeZone }: ArrivalNoteProps) {
  const arrival = arrivalEtaUtc(route)
  const hasArrived = arrival !== null && hoursBetween(heatmap.start_utc, arrival) <= hourOffset
  return (
    <Typography role="status" variant="body2" color="text.secondary">
      {hasArrived &&
        `Truck arrived at ${formatClockTime(arrival, timeZone)}. Showing the forecast along the route after arrival.`}
    </Typography>
  )
}
