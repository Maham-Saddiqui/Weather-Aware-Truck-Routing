import useMediaQuery from '@mui/material/useMediaQuery'
import { useEffect, useState } from 'react'

const PLAYBACK_STEP_MS = 1000

export const PLAYBACK_SPEEDS = [1, 2, 4] as const
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

interface PlaybackInput {
  hourOffset: number
  playUntilHour: number
  onChangeHourOffset: (hourOffset: number) => void
}

export interface Playback {
  isPlaying: boolean
  isUnavailable: boolean
  isFinished: boolean
  speed: PlaybackSpeed
  setSpeed: (speed: PlaybackSpeed) => void
  togglePlaying: () => void
  stopPlaying: () => void
}

interface SteppingInput extends PlaybackInput {
  isPlaying: boolean
  speed: PlaybackSpeed
}

function usePlayStepping(
  { isPlaying, speed, hourOffset, playUntilHour, onChangeHourOffset }: SteppingInput,
  setWantsToPlay: (wantsToPlay: boolean) => void,
) {
  useEffect(() => {
    if (!isPlaying) {
      return undefined
    }
    const timer = setTimeout(() => {
      onChangeHourOffset(hourOffset + 1)
      setWantsToPlay(hourOffset + 1 < playUntilHour)
    }, PLAYBACK_STEP_MS / speed)
    return () => {
      clearTimeout(timer)
    }
  }, [isPlaying, hourOffset, playUntilHour, speed, onChangeHourOffset, setWantsToPlay])
}

// Plays the trip, not the whole forecast: one hour per step (one second at normal speed, faster at 2x and 4x) from departure to just after arrival, only when the
// user presses play, and never when reduced motion is requested (FE-07). The slider itself still spans every hour.
export function usePlayback({
  hourOffset,
  playUntilHour,
  onChangeHourOffset,
}: PlaybackInput): Playback {
  const isUnavailable = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [wantsToPlay, setWantsToPlay] = useState(false)
  const [speed, setSpeed] = useState<PlaybackSpeed>(1)
  const isFinished = hourOffset >= playUntilHour
  const isPlaying = wantsToPlay && !isUnavailable && !isFinished

  usePlayStepping(
    { isPlaying, speed, hourOffset, playUntilHour, onChangeHourOffset },
    setWantsToPlay,
  )

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
    speed,
    setSpeed,
    togglePlaying,
    stopPlaying: () => {
      setWantsToPlay(false)
    },
  }
}
