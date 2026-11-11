import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWhenIdle } from './useWhenIdle'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('waiting for the page to be idle (PERF-06)', () => {
  it('is false at first paint and true a moment later when the browser has no idle callback', () => {
    vi.useFakeTimers()
    const { result } = renderHook(useWhenIdle)
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current).toBe(true)
  })

  it('waits for the browser idle callback when it has one', () => {
    let runIdle: () => void = () => undefined
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      runIdle = callback
      return 1
    })
    vi.stubGlobal('cancelIdleCallback', vi.fn())
    const { result } = renderHook(useWhenIdle)
    expect(result.current).toBe(false)

    act(() => {
      runIdle()
    })

    expect(result.current).toBe(true)
  })
})
