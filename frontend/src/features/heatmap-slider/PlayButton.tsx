import Pause from '@mui/icons-material/Pause'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Replay from '@mui/icons-material/Replay'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { TOOLTIP_ABOVE_DOCK } from './tooltipAboveDock'
import type { Playback } from './usePlayback'

const IDLE_LABELS: Record<Playback['nextAction'], string> = {
  play: 'Play the trip',
  'keep-playing': 'Keep playing the forecast',
  replay: 'Replay the trip',
}

function playLabel({ isUnavailable, isPlaying, nextAction }: Playback): string {
  if (isUnavailable) {
    return 'Play is off because reduced motion is on. Use the slider instead.'
  }
  if (isPlaying) {
    return 'Pause'
  }
  return IDLE_LABELS[nextAction]
}

function PlayIcon({ isPlaying, nextAction }: Playback) {
  if (isPlaying) {
    return <Pause />
  }
  return nextAction === 'replay' ? <Replay /> : <PlayArrow />
}

interface PlayButtonProps {
  playback: Playback
}

// aria-disabled instead of disabled keeps the button focusable, so the reason it is off can be read (FE-07).
export function PlayButton({ playback }: PlayButtonProps) {
  const label = playLabel(playback)
  return (
    <Tooltip title={label} {...TOOLTIP_ABOVE_DOCK}>
      <IconButton
        aria-label={label}
        aria-disabled={playback.isUnavailable}
        sx={{ color: playback.isUnavailable ? 'action.disabled' : undefined }}
        onClick={playback.isUnavailable ? undefined : playback.togglePlaying}
      >
        <PlayIcon {...playback} />
      </IconButton>
    </Tooltip>
  )
}
