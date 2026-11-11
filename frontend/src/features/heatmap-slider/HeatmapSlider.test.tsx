import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HeatmapSlider } from './HeatmapSlider'

const START_UTC = '2026-11-12T23:00:00Z'
const PLAYBACK_STEP_MS = 1000
const PLAY = 'Play the trip'
const REPLAY = 'Replay the trip'

interface SliderWithStateProps {
  initialHour?: number
  playUntilHour?: number
  onChange?: (hour: number) => void
  onPlay?: () => void
}

function SliderWithState({
  initialHour = 0,
  playUntilHour = 48,
  onChange,
  onPlay,
}: SliderWithStateProps) {
  const [hourOffset, setHourOffset] = useState(initialHour)
  return (
    <HeatmapSlider
      startUtc={START_UTC}
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

function mockReducedMotion(isReduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: isReduced && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function pressButton(name: string) {
  act(() => {
    screen.getByRole('button', { name }).click()
  })
}

function advanceTime(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds)
  })
}

function advanceSteps(steps: number) {
  for (let step = 0; step < steps; step += 1) {
    advanceTime(PLAYBACK_STEP_MS)
  }
}

function hoursReported(onChange: ReturnType<typeof vi.fn>): number[] {
  return onChange.mock.calls.map(([hour]) => hour as number)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('HeatmapSlider labels (REQ-09, RR-28, FE-07)', () => {
  it('spans 0 to 48 hours in steps of one', () => {
    render(<SliderWithState />)

    const slider = screen.getByRole('slider', { name: 'Hours after departure' })

    expect(slider).toHaveAttribute('min', '0')
    expect(slider).toHaveAttribute('max', '48')
    expect(slider).toHaveAttribute('step', '1')
  })

  it('tells assistive technology the real clock time with its zone', () => {
    render(<SliderWithState initialHour={6} />)

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Thu 22:00 MT, +6 h')
  })

  it('shows the same text as a visible label', () => {
    render(<SliderWithState initialHour={6} />)

    expect(screen.getByText('Thu 22:00 MT, +6 h')).toBeVisible()
  })
})

describe('HeatmapSlider keyboard (NFR-03: keyboard operable)', () => {
  it('moves one hour with the arrow keys', async () => {
    const onChange = vi.fn()
    render(<SliderWithState onChange={onChange} />)

    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    expect(screen.getByRole('slider')).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowLeft}')

    expect(hoursReported(onChange)).toEqual([1, 2, 1])
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Thu 17:00 MT, +1 h')
  })

  it('jumps to the first and the last hour with Home and End', async () => {
    render(<SliderWithState initialHour={10} />)

    screen.getByRole('slider').focus()
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '48')
    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0')
  })
})

describe('HeatmapSlider play button (FE-07: reduced motion respected, no autoplay)', () => {
  beforeEach(() => {
    mockReducedMotion(false)
    vi.useFakeTimers()
  })

  it('does not move by itself', () => {
    const onChange = vi.fn()
    render(<SliderWithState onChange={onChange} />)

    advanceTime(5 * PLAYBACK_STEP_MS)

    expect(onChange).not.toHaveBeenCalled()
  })

  it('advances one hour per step after play is pressed and stops on pause', () => {
    const onChange = vi.fn()
    render(<SliderWithState onChange={onChange} />)

    pressButton(PLAY)
    advanceTime(PLAYBACK_STEP_MS)
    advanceTime(PLAYBACK_STEP_MS)
    expect(hoursReported(onChange)).toEqual([1, 2])

    pressButton('Pause')
    advanceTime(3 * PLAYBACK_STEP_MS)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('stops by itself at the last hour and offers to replay', () => {
    const onChange = vi.fn()
    render(<SliderWithState initialHour={47} onChange={onChange} />)

    pressButton(PLAY)
    advanceTime(5 * PLAYBACK_STEP_MS)

    expect(hoursReported(onChange)).toEqual([48])
    expect(screen.getByRole('button', { name: REPLAY })).toBeVisible()
    expect(screen.queryByRole('button', { name: PLAY })).not.toBeInTheDocument()
  })

  it('starts again from hour 0 when replay is pressed at the last hour', () => {
    const onChange = vi.fn()
    render(<SliderWithState initialHour={48} onChange={onChange} />)

    pressButton(REPLAY)

    expect(onChange).toHaveBeenCalledWith(0)
    expect(screen.getByRole('button', { name: 'Pause' })).toBeVisible()
  })

  it('tells the page each time playing starts, resumes or restarts, but not when it pauses', () => {
    const onPlay = vi.fn()
    render(<SliderWithState initialHour={46} playUntilHour={47} onPlay={onPlay} />)

    pressButton(PLAY)
    expect(onPlay).toHaveBeenCalledTimes(1)
    pressButton('Pause')
    expect(onPlay).toHaveBeenCalledTimes(1)
    pressButton(PLAY)
    expect(onPlay).toHaveBeenCalledTimes(2)
    advanceTime(5 * PLAYBACK_STEP_MS)
    pressButton(REPLAY)
    expect(onPlay).toHaveBeenCalledTimes(3)
  })

  it('stops playing when the user takes the slider', async () => {
    vi.useRealTimers()
    render(<SliderWithState />)

    await userEvent.click(screen.getByRole('button', { name: PLAY }))
    screen.getByRole('slider').focus()
    await userEvent.keyboard('{ArrowRight}')

    expect(screen.getByRole('button', { name: PLAY })).toBeVisible()
  })

  it('shows the play tooltip when the button gets keyboard focus', async () => {
    vi.useRealTimers()
    render(<SliderWithState />)

    await userEvent.tab()
    await userEvent.tab()

    expect(await screen.findByRole('tooltip')).toHaveTextContent(PLAY)
  })
})

describe('HeatmapSlider plays the trip, not the whole forecast (REQ-09, RR-19, RR-28)', () => {
  beforeEach(() => {
    mockReducedMotion(false)
    vi.useFakeTimers()
  })

  function playToTheEnd(playUntilHour: number, initialHour = 0) {
    const onChange = vi.fn()
    render(
      <SliderWithState
        playUntilHour={playUntilHour}
        initialHour={initialHour}
        onChange={onChange}
      />,
    )
    pressButton(PLAY)
    advanceSteps(60)
    return hoursReported(onChange)
  }

  it('stops one hour after a 2 hour trip arrives and offers a replay', () => {
    expect(playToTheEnd(3)).toEqual([1, 2, 3])
    expect(screen.getByRole('button', { name: REPLAY })).toBeVisible()
  })

  it('stops after a 20 hour trip at its own end', () => {
    expect(playToTheEnd(21).at(-1)).toBe(21)
  })

  it('stops at the last slider hour when the trip is longer than the forecast', () => {
    expect(playToTheEnd(48).at(-1)).toBe(48)
  })

  it('still lets the driver scrub the whole 48 hours by hand', async () => {
    vi.useRealTimers()
    render(<SliderWithState playUntilHour={3} />)

    screen.getByRole('slider').focus()
    await userEvent.keyboard('{End}')

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '48')
  })

  it('restarts at hour 0 when play is pressed after scrubbing beyond the end', () => {
    const onChange = vi.fn()
    render(<SliderWithState playUntilHour={3} initialHour={30} onChange={onChange} />)

    pressButton(REPLAY)

    expect(onChange).toHaveBeenCalledWith(0)
    expect(screen.getByRole('button', { name: 'Pause' })).toBeVisible()
  })

  it('does not start playing again by itself when the next route is longer', () => {
    const onChange = vi.fn()
    const { rerender } = render(<SliderWithState playUntilHour={2} onChange={onChange} />)
    pressButton(PLAY)
    advanceSteps(5)
    onChange.mockClear()

    rerender(<SliderWithState playUntilHour={10} onChange={onChange} />)
    advanceSteps(5)

    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('HeatmapSlider with reduced motion (FE-07)', () => {
  it('turns play off but keeps it focusable, with the reason in its tooltip', async () => {
    mockReducedMotion(true)
    render(<SliderWithState />)
    const button = screen.getByRole('button', { name: /reduced motion is on/ })

    button.focus()

    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Play is off because reduced motion is on',
    )
  })

  it('does not play when the button is pressed', async () => {
    mockReducedMotion(true)
    const onChange = vi.fn()
    render(<SliderWithState onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: /reduced motion is on/ }))

    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('HeatmapSlider caption (REQ-09, FE-07: self-explanatory controls)', () => {
  it('says which time zone the slider times are shown in', () => {
    render(<SliderWithState />)

    expect(screen.getByText("Times shown in the origin's time zone (MT)")).toBeVisible()
  })

  it('names the slider "Forecast time" in visible text', () => {
    render(<SliderWithState />)

    expect(screen.getByText('Forecast time')).toBeVisible()
  })

  it('explains map, truck and dots in a tooltip reachable by keyboard', async () => {
    render(<SliderWithState />)

    await userEvent.tab()

    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).toHaveTextContent(
      'The status shows the weather along all the routes at this clock hour, wherever the truck is.',
    )
    expect(tooltip).toHaveTextContent('The truck marker shows where the truck would be.')
    expect(tooltip).toHaveTextContent('Checkpoint dots show conditions when the truck arrives.')
  })
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
