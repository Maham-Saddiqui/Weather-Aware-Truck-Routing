import useMediaQuery from '@mui/material/useMediaQuery'
import { useEffect, useState } from 'react'

const PLAYBACK_STEP_MS = 1000

interface PlaybackInput {
  hourOffset: number
  lastHour: number
  onChangeHourOffset: (hourOffset: number) => void
}

export interface Playback {
  isPlaying: boolean
  isUnavailable: boolean
  isFinished: boolean
  togglePlaying: () => void
  stopPlaying: () => void
}

// Plays only when the user presses play, one hour per step, and never when reduced motion is requested (FE-07).
export function usePlayback({ hourOffset, lastHour, onChangeHourOffset }: PlaybackInput): Playback {
  const isUnavailable = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [wantsToPlay, setWantsToPlay] = useState(false)
  const isPlaying = wantsToPlay && !isUnavailable && hourOffset < lastHour

  useEffect(() => {
    if (!isPlaying) {
      return undefined
    }
    const timer = setTimeout(() => {
      onChangeHourOffset(hourOffset + 1)
    }, PLAYBACK_STEP_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [isPlaying, hourOffset, onChangeHourOffset])

  const togglePlaying = () => {
    if (hourOffset >= lastHour) {
      onChangeHourOffset(0)
      setWantsToPlay(true)
      return
    }
    setWantsToPlay(!isPlaying)
  }

  return {
    isPlaying,
    isUnavailable,
    isFinished: hourOffset >= lastHour,
    togglePlaying,
    stopPlaying: () => {
      setWantsToPlay(false)
    },
  }
}
