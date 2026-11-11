import Stack from '@mui/material/Stack'
import { zoneAbbreviation } from '../../shared/time'
import type { HeatmapSliderProps } from '../../shared/types'
import { ForecastCaption } from './ForecastCaption'
import { SliderRow } from './SliderRow'
import { WHEN_TABLET_MAP } from './tabletMap'

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
          [WHEN_TABLET_MAP]: {
            alignItems: 'flex-start',
            columnGap: 1,
            '& .MuiTypography-body2': { fontSize: '0.8125rem', lineHeight: 1.3 },
          },
        }}
      >
        <ForecastCaption zoneName={zoneAbbreviation(slider.startUtc, slider.timeZone)} />
        {status}
      </Stack>
      <SliderRow {...slider} />
    </Stack>
  )
}
