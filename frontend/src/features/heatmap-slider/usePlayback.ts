import useMediaQuery from '@mui/material/useMediaQuery'
import { useEffect, useState } from 'react'

const PLAYBACK_STEP_MS = 1000

export const PLAYBACK_SPEEDS = [1, 2, 4] as const
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

interface PlaybackInput {
  hourOffset: number
  lastHour: number
  playUntilHour: number
  onChangeHourOffset: (hourOffset: number) => void
  onPlay?: () => void
}

export type PlayAction = 'play' | 'keep-playing' | 'replay'

export interface Playback {
  isPlaying: boolean
  isUnavailable: boolean
  nextAction: PlayAction
  speed: PlaybackSpeed
  setSpeed: (speed: PlaybackSpeed) => void
  togglePlaying: () => void
  stopPlaying: () => void
}

interface SteppingInput {
  isPlaying: boolean
  stopAtHour: number | null
  speed: PlaybackSpeed
  hourOffset: number
  onChangeHourOffset: (hourOffset: number) => void
}

function usePlayStepping(
  { isPlaying, stopAtHour, speed, hourOffset, onChangeHourOffset }: SteppingInput,
  setStopAtHour: (stopAtHour: number | null) => void,
) {
  useEffect(() => {
    if (!isPlaying) {
      return undefined
    }
    const timer = setTimeout(() => {
      onChangeHourOffset(hourOffset + 1)
      if (hourOffset + 1 >= (stopAtHour ?? 0)) {
        setStopAtHour(null)
      }
    }, PLAYBACK_STEP_MS / speed)
    return () => {
      clearTimeout(timer)
    }
  }, [isPlaying, stopAtHour, hourOffset, speed, onChangeHourOffset, setStopAtHour])
}

function nextActionFor({ hourOffset, lastHour, playUntilHour }: PlaybackInput): PlayAction {
  if (hourOffset >= lastHour) {
    return 'replay'
  }
  return hourOffset >= playUntilHour ? 'keep-playing' : 'play'
}

// Plays one hour per step (one second at normal speed, faster at 2x and 4x), only when the user presses play, and never
// when reduced motion is requested (FE-07). From departure it stops at arrival; pressed again there it keeps going to
// the last hour, and pressed at the last hour it starts over (REQ-09). The slider itself spans every hour.
export function usePlayback(input: PlaybackInput): Playback {
  const { hourOffset, lastHour, playUntilHour, onChangeHourOffset, onPlay } = input
  const isUnavailable = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [stopAtHour, setStopAtHour] = useState<number | null>(null)
  const [speed, setSpeed] = useState<PlaybackSpeed>(1)
  const nextAction = nextActionFor(input)
  const isPlaying = stopAtHour !== null && !isUnavailable && hourOffset < stopAtHour

  usePlayStepping({ isPlaying, stopAtHour, speed, hourOffset, onChangeHourOffset }, setStopAtHour)

  const togglePlaying = () => {
    if (isPlaying) {
      setStopAtHour(null)
      return
    }
    if (nextAction === 'replay') {
      onChangeHourOffset(0)
    }
    onPlay?.()
    setStopAtHour(nextAction === 'keep-playing' ? lastHour : playUntilHour)
  }

  return {
    isPlaying,
    isUnavailable,
    nextAction,
    speed,
    setSpeed,
    togglePlaying,
    stopPlaying: () => {
      setStopAtHour(null)
    },
  }
}
