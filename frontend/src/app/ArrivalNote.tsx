import Typography from '@mui/material/Typography'
import { arrivalEtaUtc, arrivalTimeZone } from '../shared/arrival'
import { formatClockTime, hoursBetween } from '../shared/time'
import type { Heatmap, Route } from '../shared/types'

interface ArrivalNoteProps {
  route: Route
  heatmap: Heatmap
  hourOffset: number
  timeZone: string
}

function arrivalText(arrival: string, route: Route, sliderZone: string): string {
  const atDestination = formatClockTime(arrival, arrivalTimeZone(route) ?? sliderZone)
  const onSlider = formatClockTime(arrival, sliderZone)
  const sliderClock = onSlider === atDestination ? '' : ` (${onSlider} on the slider)`
  return `Arrived ${atDestination}${sliderClock}. Showing the corridor forecast after arrival.`
}

// Beyond arrival the truck stays parked at the destination, so say so instead of leaving it silently there.
// The arrival is in the destination's clock like the route card; when the slider's clock (the origin's) shows a
// different time, that is said once here. The region stays mounted and its words change only at arrival (FE-07).
export function ArrivalNote({ route, heatmap, hourOffset, timeZone }: ArrivalNoteProps) {
  const arrival = arrivalEtaUtc(route)
  const hasArrived = arrival !== null && hoursBetween(heatmap.start_utc, arrival) <= hourOffset
  return (
    <Typography role="status" variant="body2" color="text.secondary">
      {hasArrived && arrivalText(arrival, route, timeZone)}
    </Typography>
  )
}
