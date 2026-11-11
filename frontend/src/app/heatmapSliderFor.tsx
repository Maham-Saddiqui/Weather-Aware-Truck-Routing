import Stack from '@mui/material/Stack'
import type { ReactNode } from 'react'
import { HeatmapSlider } from '../features/heatmap-slider'
import { HeatmapStatus } from '../features/map'
import { ArrivalNote } from './ArrivalNote'
import { ErrorBoundary } from './ErrorBoundary'
import { playUntilHour } from './playUntilHour'
import type { TripPlannerState } from './useTripPlanner'

export function heatmapSliderFor(
  planner: TripPlannerState,
  hourOffset: number,
  onChangeHourOffset: (hourOffset: number) => void,
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
      status={
        // A status line must never take the page down, for example while the server and the page
        // briefly disagree right after a deploy: it simply disappears.
        <ErrorBoundary area="the forecast status" fallback={<></>}>
          <Stack
            direction="row"
            useFlexGap
            sx={{ alignItems: 'center', flexWrap: 'wrap', columnGap: 1.5 }}
          >
            <HeatmapStatus heatmap={heatmap} hourOffset={hourOffset} />
            <ArrivalNote
              route={selectedRoute}
              heatmap={heatmap}
              hourOffset={hourOffset}
              timeZone={timeZone}
            />
          </Stack>
        </ErrorBoundary>
      }
    />
  )
}
