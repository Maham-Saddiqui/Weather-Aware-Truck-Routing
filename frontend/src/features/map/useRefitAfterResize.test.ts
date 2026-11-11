import type { MapRef } from '@vis.gl/react-maplibre'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRefitAfterResize } from './useRefitAfterResize'

const SETTLE_MS = 150

type Handler = () => void
const handlers = new Map<string, Set<Handler>>()
let mapWidth = 1000
const map = {
  getContainer: () => ({ clientWidth: mapWidth }),
  on: (name: string, handler: Handler) => {
    handlers.set(name, (handlers.get(name) ?? new Set()).add(handler))
  },
  off: (name: string, handler: Handler) => {
    handlers.get(name)?.delete(handler)
  },
} as unknown as MapRef

let isVisible = true
let isFramed = false
const refit = vi.fn()

function emit(name: string) {
  act(() => {
    handlers.get(name)?.forEach((handler) => {
      handler()
    })
  })
}

function resizeThenWait(visibleAfterwards: boolean) {
  isVisible = visibleAfterwards
  emit('resize')
  act(() => {
    vi.advanceTimersByTime(SETTLE_MS)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  handlers.clear()
  refit.mockClear()
  isVisible = true
  isFramed = false
  mapWidth = 1000
  renderHook(() => {
    useRefitAfterResize(
      map,
      () => isVisible,
      () => isFramed,
      refit,
    )
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useRefitAfterResize fits the route again when a resize hides it (REQ-08, FE-08)', () => {
  it('fits again once the resize settles when a route that was in view is now under an overlay', () => {
    resizeThenWait(false)

    expect(refit).toHaveBeenCalledTimes(1)
  })

  it('waits for the last step of a sliding panel instead of fitting at every step', () => {
    isVisible = false
    emit('resize')
    act(() => {
      vi.advanceTimersByTime(SETTLE_MS - 1)
    })
    emit('resize')
    act(() => {
      vi.advanceTimersByTime(SETTLE_MS - 1)
    })

    expect(refit).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(refit).toHaveBeenCalledTimes(1)
  })

  it('leaves the map alone when the route is still clear of the overlays', () => {
    resizeThenWait(true)

    expect(refit).not.toHaveBeenCalled()
  })

  it('leaves a map alone that the driver had moved so the route was not fully in view', () => {
    isVisible = false
    emit('moveend')

    resizeThenWait(false)

    expect(refit).not.toHaveBeenCalled()
  })

  it('fits again after a hand move that kept the route in view and a later resize hid it', () => {
    isVisible = true
    emit('moveend')

    resizeThenWait(false)

    expect(refit).toHaveBeenCalledTimes(1)
  })
})

describe('useRefitAfterResize frames the route again when the map width changes (REQ-08, FE-08)', () => {
  function widenThenWait(width: number) {
    mapWidth = width
    resizeThenWait(true)
  }

  it('fits again after a hidden panel made the map wider when a fit chose the view', () => {
    isFramed = true

    widenThenWait(1460)

    expect(refit).toHaveBeenCalledTimes(1)
  })

  it('fits again after the panel came back and made the map narrower', () => {
    isFramed = true

    widenThenWait(540)

    expect(refit).toHaveBeenCalledTimes(1)
  })

  it('leaves a view the driver chose alone when the map gets wider', () => {
    isFramed = false

    widenThenWait(1460)

    expect(refit).not.toHaveBeenCalled()
  })

  it('does not fit again for a resize that left the width as it was, such as a phone address bar', () => {
    isFramed = true

    widenThenWait(1000)

    expect(refit).not.toHaveBeenCalled()
  })
})
