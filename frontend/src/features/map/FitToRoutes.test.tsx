import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fitPadding } from './fitPadding'
import { FitToRoutes } from './FitToRoutes'
import { NORTH_ROUTE, TWO_ROUTES, heatmapFromCheckpoints } from './routeFixtures'
import { boundsOfLines, routeLines } from './routeGeoJson'
import { TruckFollower } from './TruckFollower'

const SHOW_WHOLE_TRIP = { name: 'Show whole trip' }
const HEATMAP = heatmapFromCheckpoints([NORTH_ROUTE])

interface FitOptions {
  padding: unknown
  duration: number
}

const stub = vi.hoisted(() => {
  const handlers = new Map<string, Set<(event: object) => void>>()
  return {
    handlers,
    point: { x: 500, y: 250 },
    fitBounds: vi.fn<(bounds: unknown, options: FitOptions) => void>(),
    map: {
      project: () => stub.point,
      getContainer: () => ({ clientWidth: 1000, clientHeight: 600 }),
      isZooming: () => false,
      easeTo: vi.fn(),
      fitBounds: (bounds: unknown, options: FitOptions, eventData?: object) => {
        stub.fitBounds(bounds, options)
        handlers.get('movestart')?.forEach((handler) => {
          handler({ ...eventData })
        })
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

vi.mock('@vis.gl/react-maplibre', () => {
  let slot: { element: HTMLElement } | undefined
  return {
    useMap: () => ({ current: stub.map }),
    useControl: (create: () => { element: HTMLElement }) => {
      slot ??= create()
      document.body.append(slot.element)
      return slot
    },
  }
})

function mockScreen({ isWide, isReducedMotion }: { isWide: boolean; isReducedMotion: boolean }) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduced') ? isReducedMotion : isWide,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function planned(routes = TWO_ROUTES) {
  return <FitToRoutes lines={routeLines(routes)} />
}

beforeEach(() => {
  stub.handlers.clear()
  stub.fitBounds.mockClear()
  stub.point = { x: 500, y: 250 }
  mockScreen({ isWide: true, isReducedMotion: false })
})

describe('Show whole trip button (REQ-08, FE-07, FE-08, NFR-03)', () => {
  it('is there once there are routes and has its name for screen readers', () => {
    render(planned())

    expect(screen.getByRole('button', SHOW_WHOLE_TRIP)).toBeVisible()
  })

  it('is not there when there are no routes', () => {
    render(planned([]))

    expect(screen.queryByRole('button', SHOW_WHOLE_TRIP)).not.toBeInTheDocument()
  })

  it('fits the current routes again with the same padding and easing as after planning', async () => {
    render(planned())
    stub.fitBounds.mockClear()

    await userEvent.click(screen.getByRole('button', SHOW_WHOLE_TRIP))

    expect(stub.fitBounds).toHaveBeenCalledTimes(1)
    expect(stub.fitBounds).toHaveBeenCalledWith(boundsOfLines(routeLines(TWO_ROUTES)), {
      padding: fitPadding(true),
      duration: 700,
    })
  })

  it('fits the new routes, not the old ones, after the routes change', async () => {
    const { rerender } = render(planned())
    rerender(planned([NORTH_ROUTE]))
    stub.fitBounds.mockClear()

    await userEvent.click(screen.getByRole('button', SHOW_WHOLE_TRIP))

    expect(stub.fitBounds.mock.calls[0]?.[0]).toEqual(boundsOfLines(routeLines([NORTH_ROUTE])))
  })

  it('fits without animation when reduced motion is requested', async () => {
    mockScreen({ isWide: true, isReducedMotion: true })
    render(planned())
    stub.fitBounds.mockClear()

    await userEvent.click(screen.getByRole('button', SHOW_WHOLE_TRIP))

    expect(stub.fitBounds.mock.calls[0]?.[1]).toMatchObject({ duration: 0 })
  })

  it('is reached with the Tab key and fits with Enter or Space', async () => {
    render(planned())
    stub.fitBounds.mockClear()

    await userEvent.tab()
    expect(screen.getByRole('button', SHOW_WHOLE_TRIP)).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')

    expect(stub.fitBounds).toHaveBeenCalledTimes(2)
  })
})

describe('Show whole trip counts as a hand move for the truck follow (REQ-09, NFR-04)', () => {
  function routesWithTruck() {
    return (
      <>
        {planned([NORTH_ROUTE])}
        <TruckFollower route={NORTH_ROUTE} heatmap={HEATMAP} hourOffset={0} />
      </>
    )
  }

  it('offers Show truck when the truck is out of view afterwards, and does not ease back to it', async () => {
    render(routesWithTruck())
    stub.point = { x: 990, y: 250 }

    await userEvent.click(screen.getByRole('button', SHOW_WHOLE_TRIP))
    act(() => {
      stub.handlers.get('move')?.forEach((handler) => {
        handler({})
      })
    })

    expect(screen.getByRole('button', { name: 'Show truck' })).toBeVisible()
    expect(stub.map.easeTo).not.toHaveBeenCalled()
  })

  it('does not count the first fit after planning as a hand move', () => {
    render(routesWithTruck())
    stub.point = { x: 990, y: 250 }
    act(() => {
      stub.handlers.get('move')?.forEach((handler) => {
        handler({})
      })
    })

    expect(screen.queryByRole('button', { name: 'Show truck' })).not.toBeInTheDocument()
  })
})
