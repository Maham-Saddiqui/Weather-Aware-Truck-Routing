import Stack from '@mui/material/Stack'
import type { HeatmapSliderProps } from '../../shared/types'
import { SliderRow } from './SliderRow'

export function HeatmapSlider({ status, ...slider }: HeatmapSliderProps) {
  return (
    <Stack>
      {status}
      <SliderRow {...slider} />
    </Stack>
  )
}
