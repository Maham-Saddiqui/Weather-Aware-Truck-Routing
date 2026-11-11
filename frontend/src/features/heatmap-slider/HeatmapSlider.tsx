import Stack from '@mui/material/Stack'
import type { HeatmapSliderProps } from '../../shared/types'
import { ForecastCaption } from './ForecastCaption'
import { SliderRow } from './SliderRow'

export function HeatmapSlider({ status, ...slider }: HeatmapSliderProps) {
  return (
    <Stack>
      <Stack
        direction="row"
        useFlexGap
        sx={{
          alignItems: 'center',
          flexWrap: 'wrap',
          columnGap: 2,
          justifyContent: 'space-between',
        }}
      >
        <ForecastCaption />
        {status}
      </Stack>
      <SliderRow {...slider} />
    </Stack>
  )
}
