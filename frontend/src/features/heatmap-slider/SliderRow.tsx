import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { HeatmapSliderProps } from '../../shared/types'
import { formatHourLabel } from './formatHourLabel'
import { HoursSlider } from './HoursSlider'
import { PlayButton } from './PlayButton'
import { SpeedControl } from './SpeedControl'
import { WHEN_NARROW_TABLET_MAP, WHEN_TABLET_MAP } from './tabletMap'
import { usePlayback } from './usePlayback'

const LABEL_MIN_WIDTH_PX = 150

const ROW_SX = {
  alignItems: 'center',
  flexWrap: 'wrap',
  columnGap: 2,
  [WHEN_TABLET_MAP]: { columnGap: 1.5 },
}

// The status pill beside it already shows the clock hour, so the narrowest maps leave this out to save a row.
const CLOCK_LABEL_SX = {
  minWidth: LABEL_MIN_WIDTH_PX,
  fontVariantNumeric: 'tabular-nums',
  [WHEN_NARROW_TABLET_MAP]: { display: 'none' },
}

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
    <Stack direction="row" useFlexGap sx={ROW_SX}>
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
      <Typography aria-hidden="true" sx={CLOCK_LABEL_SX}>
        {labelFor(hourOffset)}
      </Typography>
    </Stack>
  )
}
