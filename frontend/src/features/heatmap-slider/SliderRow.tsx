import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { HeatmapSliderProps } from '../../shared/types'
import { formatHourLabel } from './formatHourLabel'
import { PlayButton } from './PlayButton'
import { SpeedControl } from './SpeedControl'
import { usePlayback } from './usePlayback'

const LABEL_MIN_WIDTH_PX = 150
const SLIDER_MIN_WIDTH_PX = 160

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
  const playback = usePlayback({ hourOffset, playUntilHour, onChangeHourOffset, onPlay })
  const labelFor = (hour: number) => formatHourLabel(startUtc, hour, timeZone)
  return (
    <Stack direction="row" useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', columnGap: 2 }}>
      <PlayButton playback={playback} />
      <SpeedControl playback={playback} />
      <Slider
        aria-label="Hours after departure"
        min={0}
        max={lastHour}
        step={1}
        value={hourOffset}
        getAriaValueText={labelFor}
        sx={{ flex: `1 1 ${String(SLIDER_MIN_WIDTH_PX)}px` }}
        onChange={(_event, value) => {
          playback.stopPlaying()
          onChangeHourOffset(value)
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
