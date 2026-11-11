import Pause from '@mui/icons-material/Pause'
import PlayArrow from '@mui/icons-material/PlayArrow'
import IconButton from '@mui/material/IconButton'
import type { Playback } from './usePlayback'

function playLabel({ isUnavailable, isPlaying }: Playback): string {
  if (isUnavailable) {
    return 'Play is off because reduced motion is on'
  }
  return isPlaying ? 'Pause forecast' : 'Play forecast'
}

interface PlayButtonProps {
  playback: Playback
}

export function PlayButton({ playback }: PlayButtonProps) {
  return (
    <IconButton
      aria-label={playLabel(playback)}
      disabled={playback.isUnavailable}
      onClick={playback.togglePlaying}
    >
      {playback.isPlaying ? <Pause /> : <PlayArrow />}
    </IconButton>
  )
}
