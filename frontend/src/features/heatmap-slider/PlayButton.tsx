import Pause from '@mui/icons-material/Pause'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Replay from '@mui/icons-material/Replay'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import type { Playback } from './usePlayback'

function playLabel({ isUnavailable, isPlaying, isFinished }: Playback): string {
  if (isUnavailable) {
    return 'Play is off because reduced motion is on. Use the slider instead.'
  }
  if (isPlaying) {
    return 'Pause'
  }
  return isFinished ? 'Replay the trip' : 'Play the trip'
}

function PlayIcon({ isPlaying, isFinished }: Playback) {
  if (isPlaying) {
    return <Pause />
  }
  return isFinished ? <Replay /> : <PlayArrow />
}

interface PlayButtonProps {
  playback: Playback
}

// aria-disabled instead of disabled keeps the button focusable, so the reason it is off can be read (FE-07).
export function PlayButton({ playback }: PlayButtonProps) {
  const label = playLabel(playback)
  return (
    <Tooltip title={label}>
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
