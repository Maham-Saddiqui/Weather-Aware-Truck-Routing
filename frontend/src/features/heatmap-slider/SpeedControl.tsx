import SpeedIcon from '@mui/icons-material/Speed'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import { MIN_TOUCH_TARGET_PX } from '../../shared/constants'
import { TOOLTIP_ABOVE_DOCK } from './tooltipAboveDock'
import { PLAYBACK_SPEEDS } from './usePlayback'
import type { Playback, PlaybackSpeed } from './usePlayback'

interface SpeedControlProps {
  playback: Pick<Playback, 'speed' | 'setSpeed'>
}

function nextSpeed(speed: PlaybackSpeed): PlaybackSpeed {
  const index = PLAYBACK_SPEEDS.indexOf(speed)
  return PLAYBACK_SPEEDS[(index + 1) % PLAYBACK_SPEEDS.length] ?? 1
}

// One button that steps through 1x, 2x and 4x, so it adds a single stop to the keyboard order.
export function SpeedControl({ playback }: SpeedControlProps) {
  const label = `${String(playback.speed)}x speed. Press to change to ${String(nextSpeed(playback.speed))}x speed.`
  return (
    <Tooltip title={label} {...TOOLTIP_ABOVE_DOCK}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<SpeedIcon aria-hidden />}
        aria-label={label}
        sx={{ minWidth: MIN_TOUCH_TARGET_PX, minHeight: MIN_TOUCH_TARGET_PX, whiteSpace: 'nowrap' }}
        onClick={() => {
          playback.setSpeed(nextSpeed(playback.speed))
        }}
      >
        {`${String(playback.speed)}x speed`}
      </Button>
    </Tooltip>
  )
}
