import { styled } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { HeatmapSlider } from '../features/heatmap-slider'
import { WHEN_TABLET_MAP } from '../features/heatmap-slider/tabletMap'
import { HeatmapStatus } from '../features/map'
import { ArrivalNote } from './ArrivalNote'
import { ErrorBoundary } from './ErrorBoundary'
import { playUntilHour } from './playUntilHour'
import type { TripPlannerState } from './useTripPlanner'

const STATUS_TWO_LINES_PX = 46

// On narrow panels the status words ("worst No Travel" against "all clear") decide whether the status wraps to a second
// line, so the slot always keeps the two-line height and the panel does not bob while Play runs.
const StatusSlot = styled('div')(({ theme }) => ({
  display: 'flex',
  minHeight: STATUS_TWO_LINES_PX,
  [theme.breakpoints.up('lg')]: { minHeight: 'auto' },
  [WHEN_TABLET_MAP]: {
    flex: '1 1 0',
    minWidth: 0,
    minHeight: 'auto',
  },
}))

export function heatmapSliderFor(
  planner: TripPlannerState,
  hourOffset: number,
  onChangeHourOffset: (hourOffset: number) => void,
  onPlay: () => void,
): ReactNode | null {
  const { heatmap, routes } = planner.results
  const selectedRoute = routes.find((route) => route.id === planner.selectedRouteId)
  const timeZone = selectedRoute?.checkpoints[0]?.time_zone
  if (!heatmap || !selectedRoute || !timeZone) return null
  return (
    <HeatmapSlider
      startUtc={heatmap.start_utc}
      timeZone={timeZone}
      hours={heatmap.hours}
      hourOffset={hourOffset}
      playUntilHour={playUntilHour(selectedRoute, heatmap)}
      onChangeHourOffset={onChangeHourOffset}
      onPlay={onPlay}
      status={
        // A status line must never take the page down, for example while the server and the page
        // briefly disagree right after a deploy: it simply disappears.
        <ErrorBoundary area="the forecast status" fallback={<></>}>
          <StatusSlot>
            <HeatmapStatus heatmap={heatmap} hourOffset={hourOffset} timeZone={timeZone} />
          </StatusSlot>
          <ArrivalNote
            route={selectedRoute}
            heatmap={heatmap}
            hourOffset={hourOffset}
            timeZone={timeZone}
          />
        </ErrorBoundary>
      }
    />
  )
}
