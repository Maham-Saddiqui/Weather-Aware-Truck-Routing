import { act, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HeatmapSlider } from './HeatmapSlider'

const PLAYBACK_STEP_MS = 1000
const PLAY = 'Play the trip'
const REPLAY = 'Replay the trip'
const KEEP_PLAYING = 'Keep playing the forecast'

interface SliderWithStateProps {
  initialHour?: number
  playUntilHour: number
  onChange?: (hour: number) => void
  onPlay?: () => void
}

function SliderWithState({
  initialHour = 0,
  playUntilHour,
  onChange,
  onPlay,
}: SliderWithStateProps) {
  const [hourOffset, setHourOffset] = useState(initialHour)
  return (
    <HeatmapSlider
      startUtc="2026-11-12T23:00:00Z"
      timeZone="America/Denver"
      hours={49}
      hourOffset={hourOffset}
      playUntilHour={playUntilHour}
      onChangeHourOffset={(hour) => {
        setHourOffset(hour)
        onChange?.(hour)
      }}
      onPlay={onPlay}
    />
  )
}

function pressButton(name: string) {
  act(() => {
    screen.getByRole('button', { name }).click()
  })
}

function advanceSteps(steps: number) {
  for (let step = 0; step < steps; step += 1) {
    act(() => {
      vi.advanceTimersByTime(PLAYBACK_STEP_MS)
    })
  }
}

function hoursReported(onChange: ReturnType<typeof vi.fn>): number[] {
  return onChange.mock.calls.map(([hour]) => hour as number)
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  vi.useFakeTimers()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('HeatmapSlider arrival mark (REQ-09, RR-28: the forecast goes on after arrival)', () => {
  it('shows the word Arrival on the track when the trip arrives before the last hour', () => {
    render(<SliderWithState playUntilHour={14} />)

    expect(screen.getByText('Arrival')).toBeVisible()
  })

  it('puts the arrival in the slider description for screen readers', () => {
    render(<SliderWithState playUntilHour={14} />)

    expect(screen.getByRole('slider')).toHaveAccessibleDescription(
      'Arrival at +14 h; the forecast continues to +48 h',
    )
  })

  it('follows the selected route', () => {
    const { rerender } = render(<SliderWithState playUntilHour={14} />)
    rerender(<SliderWithState playUntilHour={30} />)

    expect(screen.getByRole('slider')).toHaveAccessibleDescription(/Arrival at \+30 h/)
  })

  it('has no mark when the trip arrives at the end of the forecast', () => {
    render(<SliderWithState playUntilHour={48} />)

    expect(screen.queryByText('Arrival')).not.toBeInTheDocument()
    expect(screen.getByRole('slider')).not.toHaveAccessibleDescription()
  })
})

describe('HeatmapSlider keeps playing after arrival instead of restarting (REQ-09, RR-28)', () => {
  it('offers Play before arrival, Keep playing at arrival and Replay at the last hour', () => {
    render(<SliderWithState playUntilHour={3} />)
    expect(screen.getByRole('button', { name: PLAY })).toBeVisible()

    pressButton(PLAY)
    advanceSteps(3)
    expect(screen.getByRole('button', { name: KEEP_PLAYING })).toBeVisible()

    pressButton(KEEP_PLAYING)
    advanceSteps(60)
    expect(screen.getByRole('button', { name: REPLAY })).toBeVisible()
  })

  it('continues from the arrival hour to +48 h without going back to hour 0', () => {
    const onChange = vi.fn()
    render(<SliderWithState playUntilHour={3} onChange={onChange} />)
    pressButton(PLAY)
    advanceSteps(3)
    onChange.mockClear()

    pressButton(KEEP_PLAYING)
    advanceSteps(60)

    const hours = hoursReported(onChange)
    expect(hours[0]).toBe(4)
    expect(hours.at(-1)).toBe(48)
    expect(hours).not.toContain(0)
  })

  it('restarts from +0 h when pressed at +48 h and stops at arrival again', () => {
    const onChange = vi.fn()
    render(<SliderWithState playUntilHour={3} initialHour={48} onChange={onChange} />)

    pressButton(REPLAY)
    advanceSteps(60)

    expect(hoursReported(onChange)).toEqual([0, 1, 2, 3])
  })

  it('tells the page each time keep playing starts', () => {
    const onPlay = vi.fn()
    render(<SliderWithState playUntilHour={3} initialHour={3} onPlay={onPlay} />)

    pressButton(KEEP_PLAYING)

    expect(onPlay).toHaveBeenCalledTimes(1)
  })

  it('can be paused while it continues after arrival', () => {
    const onChange = vi.fn()
    render(<SliderWithState playUntilHour={3} initialHour={3} onChange={onChange} />)

    pressButton(KEEP_PLAYING)
    advanceSteps(2)
    pressButton('Pause')
    advanceSteps(5)

    expect(hoursReported(onChange)).toEqual([4, 5])
    expect(screen.getByRole('button', { name: KEEP_PLAYING })).toBeVisible()
  })
})
