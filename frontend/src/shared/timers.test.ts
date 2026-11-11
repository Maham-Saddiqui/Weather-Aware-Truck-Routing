import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useElapsedFlag } from './timers'

describe('slow request flag (REQ-12)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('turns on only after the delay has passed while loading', () => {
    const { result } = renderHook(() => useElapsedFlag(true, 3000))

    expect(result.current).toBe(false)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current).toBe(true)
  })

  it('stays off when loading finishes before the delay', () => {
    const { result, rerender } = renderHook(({ active }) => useElapsedFlag(active, 3000), {
      initialProps: { active: true },
    })

    rerender({ active: false })
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(result.current).toBe(false)
  })
})
