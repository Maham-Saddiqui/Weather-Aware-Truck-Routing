import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HeatmapSlider } from './HeatmapSlider'

const START_UTC = '2026-11-12T23:00:00Z'
const PLAYBACK_STEP_MS = 1000

interface SliderWithStateProps {
  initialHour?: number
  onChange?: (hour: number) => void
}

function SliderWithState({ initialHour = 0, onChange }: SliderWithStateProps) {
  const [hourOffset, setHourOffset] = useState(initialHour)
  return (
    <HeatmapSlider
      startUtc={START_UTC}
      timeZone="America/Denver"
      hours={49}
      hourOffset={hourOffset}
      onChangeHourOffset={(hour) => {
        setHourOffset(hour)
        onChange?.(hour)
      }}
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

    pressButton('Play forecast')
    advanceTime(PLAYBACK_STEP_MS)
    advanceTime(PLAYBACK_STEP_MS)
    expect(hoursReported(onChange)).toEqual([1, 2])

    pressButton('Pause forecast')
    advanceTime(3 * PLAYBACK_STEP_MS)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('stops by itself at the last hour', () => {
    const onChange = vi.fn()
    render(<SliderWithState initialHour={47} onChange={onChange} />)

    pressButton('Play forecast')
    advanceTime(5 * PLAYBACK_STEP_MS)

    expect(hoursReported(onChange)).toEqual([48])
    expect(screen.getByRole('button', { name: 'Play forecast' })).toBeVisible()
  })

  it('starts again from hour 0 when play is pressed at the last hour', () => {
    const onChange = vi.fn()
    render(<SliderWithState initialHour={48} onChange={onChange} />)

    pressButton('Play forecast')

    expect(onChange).toHaveBeenCalledWith(0)
    expect(screen.getByRole('button', { name: 'Pause forecast' })).toBeVisible()
  })

  it('stops playing when the user takes the slider', async () => {
    vi.useRealTimers()
    render(<SliderWithState />)

    await userEvent.click(screen.getByRole('button', { name: 'Play forecast' }))
    screen.getByRole('slider').focus()
    await userEvent.keyboard('{ArrowRight}')

    expect(screen.getByRole('button', { name: 'Play forecast' })).toBeVisible()
  })
})

describe('HeatmapSlider with reduced motion (FE-07)', () => {
  it('turns play off and says why', () => {
    mockReducedMotion(true)
    render(<SliderWithState />)

    expect(screen.getByRole('button', { name: /reduced motion is on/ })).toBeDisabled()
  })
})
