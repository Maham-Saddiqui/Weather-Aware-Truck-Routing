import Typography from '@mui/material/Typography'
import { arrivalEtaUtc, arrivalTimeZone } from '../shared/arrival'
import { formatClockTime, hoursBetween } from '../shared/time'
import type { Heatmap, Route } from '../shared/types'
import { playUntilHour } from './playUntilHour'

interface ArrivalNoteProps {
  route: Route
  heatmap: Heatmap
  hourOffset: number
  timeZone: string
}

const RESERVED_ROW_SX = {
  flexBasis: '100%',
  minHeight: { xs: '2lh', lg: '1lh' },
}

function whatToDoNext(isAtArrivalHour: boolean, lastHour: number): string {
  return isAtArrivalHour
    ? `Paused at arrival: Play goes on to +${String(lastHour)} h.`
    : 'Showing the corridor forecast after arrival.'
}

function arrivalText(arrival: string, route: Route, sliderZone: string, next: string): string {
  const atDestination = formatClockTime(arrival, arrivalTimeZone(route) ?? sliderZone)
  const onSlider = formatClockTime(arrival, sliderZone)
  const sliderClock = onSlider === atDestination ? '' : ` (${onSlider} on the slider)`
  return `Arrived ${atDestination}${sliderClock}. ${next}`
}

// Beyond arrival the truck stays parked at the destination, so say so instead of leaving it silently there.
// The arrival is in the destination's clock like the route card; when the slider's clock (the origin's) shows a
// different time, that is said once here. Where Play stops, at the arrival hour, it says it is paused on purpose and Play goes on, unless
// the arrival is already at the end of the slider. The region stays mounted and its words change only at arrival (FE-07). It always takes its own full row of two lines on narrow screens and one on wide ones, so the words
// appearing never move the panel under a finger that is about to press Play again.
export function ArrivalNote({ route, heatmap, hourOffset, timeZone }: ArrivalNoteProps) {
  const arrival = arrivalEtaUtc(route)
  const hasArrived = arrival !== null && hoursBetween(heatmap.start_utc, arrival) <= hourOffset
  const lastHour = heatmap.hours - 1
  const arrivalHour = playUntilHour(route, heatmap)
  const next = whatToDoNext(hourOffset === arrivalHour && arrivalHour < lastHour, lastHour)
  return (
    <Typography role="status" variant="body2" color="text.secondary" sx={RESERVED_ROW_SX}>
      {hasArrived && arrivalText(arrival, route, timeZone, next)}
    </Typography>
  )
}
