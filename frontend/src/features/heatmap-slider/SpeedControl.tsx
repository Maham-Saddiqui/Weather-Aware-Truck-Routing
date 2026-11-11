import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import { MIN_TOUCH_TARGET_PX } from '../../shared/constants'
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
  const label = `Playback speed ${String(playback.speed)}x. Press to play at ${String(nextSpeed(playback.speed))}x.`
  return (
    <Tooltip title={label}>
      <Button
        variant="outlined"
        size="small"
        aria-label={label}
        sx={{ minWidth: MIN_TOUCH_TARGET_PX, minHeight: MIN_TOUCH_TARGET_PX }}
        onClick={() => {
          playback.setSpeed(nextSpeed(playback.speed))
        }}
      >
        {`${String(playback.speed)}x`}
      </Button>
    </Tooltip>
  )
}
