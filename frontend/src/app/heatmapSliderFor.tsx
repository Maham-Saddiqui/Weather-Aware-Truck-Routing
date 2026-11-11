import type { ReactNode } from 'react'
import { HeatmapSlider } from '../features/heatmap-slider'
import type { TripPlannerState } from './useTripPlanner'

export function heatmapSliderFor(planner: TripPlannerState): ReactNode | null {
  const { heatmap, routes } = planner.results
  const selectedRoute = routes.find((route) => route.id === planner.selectedRouteId)
  const timeZone = selectedRoute?.checkpoints[0]?.time_zone
  if (!heatmap || !timeZone) return null
  return (
    <HeatmapSlider
      startUtc={heatmap.start_utc}
      timeZone={timeZone}
      hours={heatmap.hours}
      hourOffset={planner.hourOffset}
      onChangeHourOffset={planner.setHourOffset}
    />
  )
}
