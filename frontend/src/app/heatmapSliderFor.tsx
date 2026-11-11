import type { ReactNode } from 'react'
import { HeatmapSlider } from '../features/heatmap-slider'
import { HeatmapStatus } from '../features/map'
import { ErrorBoundary } from './ErrorBoundary'
import type { TripPlannerState } from './useTripPlanner'

export function heatmapSliderFor(
  planner: TripPlannerState,
  hourOffset: number,
  onChangeHourOffset: (hourOffset: number) => void,
): ReactNode | null {
  const { heatmap, routes } = planner.results
  const selectedRoute = routes.find((route) => route.id === planner.selectedRouteId)
  const timeZone = selectedRoute?.checkpoints[0]?.time_zone
  if (!heatmap || !timeZone) return null
  return (
    <HeatmapSlider
      startUtc={heatmap.start_utc}
      timeZone={timeZone}
      hours={heatmap.hours}
      hourOffset={hourOffset}
      onChangeHourOffset={onChangeHourOffset}
      status={
        // A status line must never take the page down, for example while the server and the page
        // briefly disagree right after a deploy: it simply disappears.
        <ErrorBoundary area="the forecast status" fallback={<></>}>
          <HeatmapStatus heatmap={heatmap} hourOffset={hourOffset} />
        </ErrorBoundary>
      }
    />
  )
}
