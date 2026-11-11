import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TRUCK_TWEEN_MAX_MS } from './mapConstants'
import { useTweenedMarker } from './useTweenedMarker'

const reducedMotion = vi.hoisted(() => ({ isOn: false }))

vi.mock('@mui/material/useMediaQuery', () => ({ default: () => reducedMotion.isOn }))

const START = { lat: 40, lon: -90 }
const ONE_HOUR_ON = { lat: 40, lon: -89 }

function fakeMarker() {
  const positions: [number, number][] = []
  return {
    positions,
    marker: {
      getLngLat: () => ({ lng: 0, lat: 0 }),
      setLngLat: (p: [number, number]) => positions.push(p),
    },
  }
}

function lastPosition(positions: [number, number][]) {
  return positions.at(-1)
}

beforeEach(() => {
  reducedMotion.isOn = false
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
})

afterEach(() => {
  vi.useRealTimers()
})

function mountAt(position: typeof START) {
  const { marker, positions } = fakeMarker()
  const markerRef = { current: marker }
  const hook = renderHook(
    ({ target }) => {
      useTweenedMarker(markerRef, target)
    },
    {
      initialProps: { target: position },
    },
  )
  return { hook, positions }
}

describe('the truck glides between forecast hours (NFR-03, FE-07, FE-08)', () => {
  it('starts at its first position without gliding', () => {
    const { positions } = mountAt(START)

    expect(lastPosition(positions)).toEqual([START.lon, START.lat])
  })

  it('moves part of the way after a frame and reaches the new position within one playback step', () => {
    const { hook, positions } = mountAt(START)
    vi.advanceTimersByTime(TRUCK_TWEEN_MAX_MS)

    hook.rerender({ target: ONE_HOUR_ON })
    vi.advanceTimersByTime(TRUCK_TWEEN_MAX_MS / 2)
    const halfway = lastPosition(positions)?.[0] ?? 0

    expect(halfway).toBeGreaterThan(START.lon)
    expect(halfway).toBeLessThan(ONE_HOUR_ON.lon)

    vi.advanceTimersByTime(TRUCK_TWEEN_MAX_MS)

    expect(lastPosition(positions)).toEqual([ONE_HOUR_ON.lon, ONE_HOUR_ON.lat])
  })

  it('follows a dragged slider at once instead of lagging behind it', () => {
    const { hook, positions } = mountAt(START)
    vi.advanceTimersByTime(30)

    hook.rerender({ target: ONE_HOUR_ON })
    vi.advanceTimersByTime(40)

    expect(lastPosition(positions)).toEqual([ONE_HOUR_ON.lon, ONE_HOUR_ON.lat])
  })

  it('jumps straight to the new position when reduced motion is on', () => {
    reducedMotion.isOn = true
    const { hook, positions } = mountAt(START)
    vi.advanceTimersByTime(TRUCK_TWEEN_MAX_MS)

    hook.rerender({ target: ONE_HOUR_ON })

    expect(lastPosition(positions)).toEqual([ONE_HOUR_ON.lon, ONE_HOUR_ON.lat])
  })
})
