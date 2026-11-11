import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NORTH_ROUTE, heatmapFromCheckpoints } from './routeFixtures'
import { TruckFollower } from './TruckFollower'

const HEATMAP = heatmapFromCheckpoints([NORTH_ROUTE])

const stub = vi.hoisted(() => {
  const handlers = new Map<string, Set<(event: object) => void>>()
  return {
    handlers,
    point: { x: 500, y: 250 },
    easeTo: vi.fn<(options: { duration: number }) => void>(),
    map: {
      project: () => stub.point,
      getContainer: () => ({ clientWidth: 1000, clientHeight: 600 }),
      isZooming: () => false,
      easeTo: (options: { duration: number }) => {
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

function followerAt(hourOffset: number, showTruckRequest = 0) {
  return (
    <TruckFollower
      route={NORTH_ROUTE}
      heatmap={HEATMAP}
      hourOffset={hourOffset}
      showTruckRequest={showTruckRequest}
    />
  )
}

function panByHand() {
  act(() => {
    stub.handlers.get('movestart')?.forEach((handler) => {
      handler({ originalEvent: new Event('mousedown') })
    })
  })
}

beforeEach(() => {
  stub.handlers.clear()
  stub.easeTo.mockClear()
  stub.point = { x: 500, y: 250 }
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe('Show truck button (REQ-08, REQ-09, FE-07, NFR-03, NFR-04)', () => {
  it('is not there while the map follows the truck', () => {
    const { rerender } = render(followerAt(0))
    stub.point = { x: 990, y: 250 }

    rerender(followerAt(1))

    expect(screen.queryByRole('button', { name: 'Show truck' })).not.toBeInTheDocument()
    expect(stub.easeTo).toHaveBeenCalledTimes(1)
  })

  it('appears, with a polite announcement, when the driver moved away and the truck left the view', () => {
    const { rerender } = render(followerAt(0))
    panByHand()
    stub.point = { x: 990, y: 250 }

    rerender(followerAt(1))

    expect(screen.getByRole('button', { name: 'Show truck' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('The truck is outside the map view')
  })

  it('is reachable with the keyboard', async () => {
    const { rerender } = render(followerAt(0))
    panByHand()
    stub.point = { x: 990, y: 250 }
    rerender(followerAt(1))

    await userEvent.tab()

    expect(screen.getByRole('button', { name: 'Show truck' })).toHaveFocus()
  })

  it('does not announce again on later hours while it stays', () => {
    const { rerender } = render(followerAt(0))
    panByHand()
    stub.point = { x: 990, y: 250 }
    rerender(followerAt(1))
    const announcement = screen.getByRole('status')
    const observer = vi.fn()
    new MutationObserver(observer).observe(announcement, {
      childList: true,
      characterData: true,
      subtree: true,
    })

    rerender(followerAt(2))

    expect(observer).not.toHaveBeenCalled()
  })

  it('eases to the truck, resumes following and goes away when pressed', async () => {
    const { rerender } = render(followerAt(0))
    panByHand()
    stub.point = { x: 990, y: 250 }
    rerender(followerAt(1))

    await userEvent.click(screen.getByRole('button', { name: 'Show truck' }))

    expect(stub.easeTo).toHaveBeenCalledTimes(1)
    stub.point = { x: 500, y: 250 }
    act(() => {
      stub.handlers.get('move')?.forEach((handler) => {
        handler({})
      })
    })
    expect(screen.queryByRole('button', { name: 'Show truck' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('goes away and brings the truck back into view when Play is pressed', () => {
    const { rerender } = render(followerAt(0))
    panByHand()
    stub.point = { x: 990, y: 250 }
    rerender(followerAt(1))

    rerender(followerAt(1, 1))

    expect(stub.easeTo).toHaveBeenCalledTimes(1)
    stub.point = { x: 500, y: 250 }
    act(() => {
      stub.handlers.get('move')?.forEach((handler) => {
        handler({})
      })
    })
    expect(screen.queryByRole('button', { name: 'Show truck' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('eases instantly when reduced motion is requested', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduced'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const { rerender } = render(followerAt(0))
    panByHand()
    stub.point = { x: 990, y: 250 }
    rerender(followerAt(1))

    await userEvent.click(screen.getByRole('button', { name: 'Show truck' }))

    expect(stub.easeTo).toHaveBeenCalledWith(expect.objectContaining({ duration: 0 }))
  })
})
