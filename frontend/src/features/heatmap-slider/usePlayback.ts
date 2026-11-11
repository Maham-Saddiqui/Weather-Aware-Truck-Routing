import useMediaQuery from '@mui/material/useMediaQuery'
import { useEffect, useState } from 'react'

const PLAYBACK_STEP_MS = 1000

interface PlaybackInput {
  hourOffset: number
  playUntilHour: number
  onChangeHourOffset: (hourOffset: number) => void
}

export interface Playback {
  isPlaying: boolean
  isUnavailable: boolean
  isFinished: boolean
  togglePlaying: () => void
  stopPlaying: () => void
}

// Plays the trip, not the whole forecast: one hour per step from departure to just after arrival, only when the
// user presses play, and never when reduced motion is requested (FE-07). The slider itself still spans every hour.
export function usePlayback({
  hourOffset,
  playUntilHour,
  onChangeHourOffset,
}: PlaybackInput): Playback {
  const isUnavailable = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [wantsToPlay, setWantsToPlay] = useState(false)
  const isFinished = hourOffset >= playUntilHour
  const isPlaying = wantsToPlay && !isUnavailable && !isFinished

  useEffect(() => {
    if (!isPlaying) {
      return undefined
    }
    const timer = setTimeout(() => {
      onChangeHourOffset(hourOffset + 1)
      setWantsToPlay(hourOffset + 1 < playUntilHour)
    }, PLAYBACK_STEP_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [isPlaying, hourOffset, playUntilHour, onChangeHourOffset])

  const togglePlaying = () => {
    if (isFinished) {
      onChangeHourOffset(0)
      setWantsToPlay(true)
      return
    }
    setWantsToPlay(!isPlaying)
  }

  return {
    isPlaying,
    isUnavailable,
    isFinished,
    togglePlaying,
    stopPlaying: () => {
      setWantsToPlay(false)
    },
  }
}
