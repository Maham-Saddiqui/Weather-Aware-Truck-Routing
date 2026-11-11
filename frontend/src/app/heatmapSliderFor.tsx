import type { ReactNode } from 'react'
import { HeatmapSlider } from '../features/heatmap-slider'
import type { TripResults } from '../features/route-results'

export function heatmapSliderFor(
  results: TripResults,
  hourOffset: number,
  onChangeHourOffset: (hourOffset: number) => void,
): ReactNode | null {
  const timeZone = results.routes[0]?.checkpoints[0]?.time_zone
  if (!results.heatmap || !timeZone) return null
  return (
    <HeatmapSlider
      startUtc={results.heatmap.start_utc}
      timeZone={timeZone}
      hours={results.heatmap.hours}
      hourOffset={hourOffset}
      onChangeHourOffset={onChangeHourOffset}
    />
  )
}
