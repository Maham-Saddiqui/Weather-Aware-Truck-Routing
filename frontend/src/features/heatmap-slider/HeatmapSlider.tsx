import type { HeatmapSliderProps } from '../../shared/types'

export function HeatmapSlider({ hours, hourOffset, onChangeHourOffset }: HeatmapSliderProps) {
  return (
    <input
      type="range"
      min={0}
      max={hours - 1}
      value={hourOffset}
      aria-label="Hours after departure"
      onChange={(event) => {
        onChangeHourOffset(Number(event.target.value))
      }}
    />
  )
}
