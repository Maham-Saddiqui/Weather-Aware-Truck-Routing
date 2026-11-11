import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { safeAreaCentreOffset, safeMargins } from './safeArea'
import { useFollowTruck } from './useFollowTruck'

const MIDDLE = { x: 500, y: 250 }
const FAR_RIGHT = { x: 990, y: 250 }
const TRUCK_A = { lat: 41, lon: -90 }
const TRUCK_B = { lat: 41, lon: -91 }
const ROUTE: object = {}
const ANOTHER_ROUTE: object = {}

let playPresses = 0
let hoursPlayed = 0

interface EaseOptions {
  center: [number, number]
  duration: number
}

const stub = vi.hoisted(() => {
  const handlers = new Map<string, Set<(event: object) => void>>()
  return {
    handlers,
    point: { x: 0, y: 0 },
    width: 1000,
    isZooming: false,
    easeTo: vi.fn<(options: EaseOptions) => void>(),
    map: {
      project: () => stub.point,
      getContainer: () => ({ clientWidth: stub.width, clientHeight: 600 }),
      isZooming: () => stub.isZooming,
      easeTo: (options: EaseOptions) => {
        stub.easeTo(options)
      },
      on: (name: string, handler: (event: object) => void) => {
        handlers.set(name, (handlers.get(name) ?? new Set()).add(handler))
      },
      off: (name: string, handler: (event: object) => void) => {
        handlers.get(name)?.delete(handler)
      },
    },
  }
})

vi.mock('@vis.gl/react-maplibre', () => ({ useMap: () => ({ current: stub.map }) }))

function emit(name: string, event: object = {}) {
  act(() => {
    stub.handlers.get(name)?.forEach((handler) => {
      handler(event)
    })
  })
}

function mockScreen({ isWide, isReducedMotion }: { isWide: boolean; isReducedMotion: boolean }) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduced') ? isReducedMotion : isWide,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function renderFollowing(point = MIDDLE) {
  stub.point = point
  return renderHook(
    ({ truck, route, showTruckRequest }) => useFollowTruck(truck, route, showTruckRequest),
    { initialProps: { truck: TRUCK_A, route: ROUTE, showTruckRequest: 0 } },
  )
}

function truckAfterHours() {
  return { lat: TRUCK_B.lat, lon: TRUCK_B.lon - hoursPlayed + 1 }
}

function moveTruckTo(
  hook: ReturnType<typeof renderFollowing>,
  point: { x: number; y: number },
  route: object = ROUTE,
) {
  stub.point = point
  hoursPlayed += 1
  hook.rerender({ truck: truckAfterHours(), route, showTruckRequest: playPresses })
}

function pressPlay(hook: ReturnType<typeof renderFollowing>) {
  playPresses += 1
  hook.rerender({ truck: truckAfterHours(), route: ROUTE, showTruckRequest: playPresses })
}

beforeEach(() => {
  playPresses = 0
  hoursPlayed = 0
  mockScreen({ isWide: true, isReducedMotion: false })
  stub.handlers.clear()
  stub.easeTo.mockClear()
  stub.isZooming = false
  stub.width = 1000
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useFollowTruck keeps the truck in view without changing the zoom (REQ-08, REQ-09, FE-08)', () => {
  it('eases to the truck when the results panel reopens and the narrower map leaves it under the zoom buttons', () => {
    renderFollowing({ x: 900, y: 250 })

    stub.width = 800
    emit('move')

    expect(stub.easeTo).toHaveBeenCalledTimes(1)
  })

  it('does nothing while the truck stays inside the visible area', () => {
    const hook = renderFollowing()

    moveTruckTo(hook, MIDDLE)

    expect(stub.easeTo).not.toHaveBeenCalled()
    expect(hook.result.current.isTruckHidden).toBe(false)
  })

  it('eases the map to the truck when an hour takes it outside, with no zoom in the options', () => {
    const hook = renderFollowing()

    moveTruckTo(hook, FAR_RIGHT)

    expect(stub.easeTo).toHaveBeenCalledTimes(1)
    const options = stub.easeTo.mock.calls[0]?.[0]
    expect(options).toMatchObject({ center: [TRUCK_B.lon, TRUCK_B.lat], duration: 600 })
    expect(options).not.toHaveProperty('zoom')
  })

  it('leaves the map alone while it is zooming to fit the routes, or the fit would be cut short', () => {
    const hook = renderFollowing()
    stub.isZooming = true

    moveTruckTo(hook, FAR_RIGHT)

    expect(stub.easeTo).not.toHaveBeenCalled()
  })

  it('eases when the truck is near the edge but inside the margin, not when it is just inside it', () => {
    const hook = renderFollowing()

    moveTruckTo(hook, { x: 960, y: 250 })
    expect(stub.easeTo).toHaveBeenCalledTimes(1)

    moveTruckTo(hook, { x: 940, y: 250 })
    expect(stub.easeTo).toHaveBeenCalledTimes(1)
  })

  it('eases when the truck is behind the forecast panel on a wide screen', () => {
    const hook = renderFollowing()

    moveTruckTo(hook, { x: 500, y: 560 })

    expect(stub.easeTo).toHaveBeenCalledTimes(1)
  })

  it('counts a truck behind the taller panel of a medium map as hidden and eases it out from behind', () => {
    stub.width = 600
    const hook = renderFollowing()

    moveTruckTo(hook, { x: 300, y: 600 - 150 })

    expect(stub.easeTo).toHaveBeenCalledTimes(1)
    const offset = (stub.easeTo.mock.calls[0]?.[0] as EaseOptions & { offset: [number, number] })
      .offset
    expect(offset[1]).toBeLessThan(safeAreaCentreOffset(safeMargins(1000, true))[1])
  })

  it('leaves a truck at the same height alone on a wide map, where the panel is shorter', () => {
    const hook = renderFollowing()

    moveTruckTo(hook, { x: 500, y: 600 - 150 })

    expect(stub.easeTo).not.toHaveBeenCalled()
  })

  it('eases when the map is resized so the taller panel now covers the truck', () => {
    renderFollowing({ x: 300, y: 450 })

    stub.width = 600
    emit('resize')

    expect(stub.easeTo).toHaveBeenCalledTimes(1)
  })

  it('leaves the same spot alone on a phone, where the panel is below the map', () => {
    mockScreen({ isWide: false, isReducedMotion: false })
    const hook = renderFollowing()

    moveTruckTo(hook, { x: 500, y: 560 })

    expect(stub.easeTo).not.toHaveBeenCalled()
  })

  it('does not ease on the render that brings a new route, because fitting the routes owns that move', () => {
    const hook = renderFollowing()

    moveTruckTo(hook, FAR_RIGHT, ANOTHER_ROUTE)

    expect(stub.easeTo).not.toHaveBeenCalled()
  })

  it('eases instantly when reduced motion is requested (FE-07, NFR-03)', () => {
    mockScreen({ isWide: true, isReducedMotion: true })
    const hook = renderFollowing()

    moveTruckTo(hook, FAR_RIGHT)

    expect(stub.easeTo.mock.calls[0]?.[0]).toMatchObject({ duration: 0 })
  })
})

describe('useFollowTruck stops when the driver moves the map by hand (REQ-09, NFR-04)', () => {
  it('pauses on a hand move and reports the truck as hidden once it leaves the view', () => {
    const hook = renderFollowing()

    emit('movestart', { originalEvent: new Event('mousedown') })
    moveTruckTo(hook, FAR_RIGHT)

    expect(stub.easeTo).not.toHaveBeenCalled()
    expect(hook.result.current.isTruckHidden).toBe(true)
  })

  it('does not count its own easing as a hand move', () => {
    const hook = renderFollowing()

    emit('movestart', {})
    moveTruckTo(hook, FAR_RIGHT)

    expect(stub.easeTo).toHaveBeenCalledTimes(1)
  })

  it('is not hidden while paused if the truck is still in view', () => {
    const hook = renderFollowing()

    emit('movestart', { originalEvent: new Event('wheel') })
    moveTruckTo(hook, MIDDLE)

    expect(hook.result.current.isTruckHidden).toBe(false)
  })

  it('resumes following and eases to the truck when showTruck is called', () => {
    const hook = renderFollowing()
    emit('movestart', { originalEvent: new Event('mousedown') })
    moveTruckTo(hook, FAR_RIGHT)

    act(() => {
      hook.result.current.showTruck()
    })

    expect(stub.easeTo).toHaveBeenCalledTimes(1)
    expect(hook.result.current.isTruckHidden).toBe(false)
  })

  it('stays paused on every later hour of playback, however far the truck gets', () => {
    const hook = renderFollowing()
    emit('movestart', { originalEvent: new Event('mousedown') })

    moveTruckTo(hook, FAR_RIGHT)
    moveTruckTo(hook, { x: 20, y: 250 })
    moveTruckTo(hook, FAR_RIGHT)

    expect(stub.easeTo).not.toHaveBeenCalled()
    expect(hook.result.current.isTruckHidden).toBe(true)
  })

  it('resumes following and eases to the truck when Play is pressed', () => {
    const hook = renderFollowing()
    emit('movestart', { originalEvent: new Event('mousedown') })
    moveTruckTo(hook, FAR_RIGHT)

    pressPlay(hook)

    expect(stub.easeTo).toHaveBeenCalledTimes(1)
    expect(stub.easeTo.mock.calls[0]?.[0]).toMatchObject({ center: [TRUCK_B.lon, TRUCK_B.lat] })
    expect(hook.result.current.isTruckHidden).toBe(false)
  })

  it('pauses again when the driver moves the map by hand after pressing Play', () => {
    const hook = renderFollowing()
    emit('movestart', { originalEvent: new Event('mousedown') })
    pressPlay(hook)

    emit('movestart', { originalEvent: new Event('wheel') })
    moveTruckTo(hook, FAR_RIGHT)

    expect(stub.easeTo).not.toHaveBeenCalled()
    expect(hook.result.current.isTruckHidden).toBe(true)
  })

  it('does nothing when Play is pressed while the map already follows and the truck is in view', () => {
    const hook = renderFollowing()

    pressPlay(hook)

    expect(stub.easeTo).not.toHaveBeenCalled()
  })

  it('follows again after the route changes', () => {
    const hook = renderFollowing()
    emit('movestart', { originalEvent: new Event('mousedown') })

    moveTruckTo(hook, MIDDLE, ANOTHER_ROUTE)
    moveTruckTo(hook, FAR_RIGHT, ANOTHER_ROUTE)

    expect(stub.easeTo).toHaveBeenCalledTimes(1)
  })

  it('tells the screen again when the view moves by hand and the truck drops out of it', () => {
    const hook = renderFollowing()
    emit('movestart', { originalEvent: new Event('touchstart') })

    stub.point = FAR_RIGHT
    emit('move')

    expect(hook.result.current.isTruckHidden).toBe(true)
  })
})
