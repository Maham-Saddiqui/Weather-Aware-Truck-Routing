import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { HeatmapSliderProps } from '../../shared/types'
import { formatHourLabel } from './formatHourLabel'
import { HoursSlider } from './HoursSlider'
import { PlayButton } from './PlayButton'
import { SpeedControl } from './SpeedControl'
import { usePlayback } from './usePlayback'

const LABEL_MIN_WIDTH_PX = 150

export function SliderRow({
  startUtc,
  timeZone,
  hours,
  hourOffset,
  playUntilHour,
  onChangeHourOffset,
  onPlay,
}: Omit<HeatmapSliderProps, 'status'>) {
  const lastHour = hours - 1
  const playback = usePlayback({ hourOffset, lastHour, playUntilHour, onChangeHourOffset, onPlay })
  const labelFor = (hour: number) => formatHourLabel(startUtc, hour, timeZone)
  return (
    <Stack direction="row" useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', columnGap: 2 }}>
      <PlayButton playback={playback} />
      <SpeedControl playback={playback} />
      <HoursSlider
        hourOffset={hourOffset}
        lastHour={lastHour}
        arrivalHour={playUntilHour}
        labelFor={labelFor}
        onChange={(hour) => {
          playback.stopPlaying()
          onChangeHourOffset(hour)
        }}
      />
      <Typography
        aria-hidden="true"
        sx={{ minWidth: LABEL_MIN_WIDTH_PX, fontVariantNumeric: 'tabular-nums' }}
      >
        {labelFor(hourOffset)}
      </Typography>
    </Stack>
  )
}
