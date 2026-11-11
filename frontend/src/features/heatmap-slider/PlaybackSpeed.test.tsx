import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HeatmapSlider } from './HeatmapSlider'

const STEP_MS = 1000

function SliderWithState({ onChange }: { onChange: (hour: number) => void }) {
  const [hourOffset, setHourOffset] = useState(0)
  return (
    <HeatmapSlider
      startUtc="2026-11-12T23:00:00Z"
      timeZone="America/Denver"
      hours={49}
      hourOffset={hourOffset}
      playUntilHour={48}
      onChangeHourOffset={(hour) => {
        setHourOffset(hour)
        onChange(hour)
      }}
    />
  )
}

function press(name: string) {
  act(() => {
    screen.getByRole('button', { name }).click()
  })
}

function advanceSteps(steps: number, stepMs: number) {
  for (let step = 0; step < steps; step += 1) {
    act(() => {
      vi.advanceTimersByTime(stepMs)
    })
  }
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

describe('playback speed next to Play (REQ-09, FE-07)', () => {
  it('shows the speed in the button and says in its name what pressing does', () => {
    render(<SliderWithState onChange={vi.fn()} />)

    const button = screen.getByRole('button', { name: /^Playback speed 1x/ })

    expect(button).toHaveTextContent('1x speed')
    expect(button).toHaveAccessibleName('Playback speed 1x. Press to play at 2x.')
  })

  it('plays one hour per second at the default speed', () => {
    const onChange = vi.fn()
    render(<SliderWithState onChange={onChange} />)

    press('Play the trip')
    advanceSteps(2, STEP_MS)

    expect(onChange.mock.calls.map(([hour]) => hour as number)).toEqual([1, 2])
  })

  it('steps through 2x, 4x and back to 1x', () => {
    render(<SliderWithState onChange={vi.fn()} />)

    press('Playback speed 1x. Press to play at 2x.')
    expect(screen.getByRole('button', { name: /^Playback speed 2x/ })).toHaveTextContent('2x')
    press('Playback speed 2x. Press to play at 4x.')
    expect(screen.getByRole('button', { name: /^Playback speed 4x/ })).toHaveTextContent('4x')
    press('Playback speed 4x. Press to play at 1x.')

    expect(screen.getByRole('button', { name: /^Playback speed 1x/ })).toHaveTextContent('1x')
  })

  it.each([
    [0, 1],
    [1, 2],
    [2, 4],
  ])(
    'after %i presses of the speed button it plays %i hours per second',
    (presses, hoursPerSecond) => {
      const onChange = vi.fn()
      render(<SliderWithState onChange={onChange} />)

      for (let count = 0; count < presses; count += 1) {
        act(() => {
          screen.getByRole('button', { name: /^Playback speed/ }).click()
        })
      }
      press('Play the trip')
      advanceSteps(hoursPerSecond, STEP_MS / hoursPerSecond)

      expect(onChange).toHaveBeenCalledTimes(hoursPerSecond)
    },
  )

  it('can be pressed with the keyboard', async () => {
    vi.useRealTimers()
    render(<SliderWithState onChange={vi.fn()} />)

    screen.getByRole('button', { name: /^Playback speed 1x/ }).focus()
    await userEvent.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: /^Playback speed 2x/ })).toBeVisible()
  })
})
