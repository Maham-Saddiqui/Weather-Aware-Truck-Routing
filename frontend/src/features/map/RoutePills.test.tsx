import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { RoutePills } from './RoutePills'
import { TWO_ROUTES } from './routeFixtures'
import { routeLines } from './routeGeoJson'

const markerClicks = vi.hoisted(() => ({ handlers: [] as (() => void)[] }))

vi.mock('@vis.gl/react-maplibre', () => ({
  Marker: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => {
    markerClicks.handlers.push(onClick)
    return <div>{children}</div>
  },
}))

const LINES = routeLines(TWO_ROUTES)

function pills(selectedRouteId: string | null, onSelectRoute = vi.fn()) {
  markerClicks.handlers = []
  render(
    <RoutePills
      routes={TWO_ROUTES}
      lines={LINES}
      selectedRouteId={selectedRouteId}
      onSelectRoute={onSelectRoute}
    />,
  )
  return onSelectRoute
}

describe('route name pills on the map (REQ-08)', () => {
  it('names each route that is not selected with its position and the server travel time', () => {
    pills('route-north')

    expect(screen.getByText('Route 2 · 18 h 0 min')).toBeVisible()
    expect(screen.queryByText(/^Route 1 ·/)).not.toBeInTheDocument()
  })

  it('names the selected route too, with a short pill that has no travel time', () => {
    pills('route-north')

    expect(screen.getByText('Route 1')).toBeVisible()
  })

  it('moves the short pill and the long pill when the selection moves', () => {
    pills('route-south')

    expect(screen.getByText('Route 1 · 18 h 0 min')).toBeVisible()
    expect(screen.getByText('Route 2')).toBeVisible()
  })

  it('selects the route when its pill is clicked', () => {
    const onSelectRoute = pills('route-north')

    act(() => {
      markerClicks.handlers[1]?.()
    })

    expect(onSelectRoute).toHaveBeenCalledWith('route-south')
  })

  it('adds no keyboard stop, because the route cards are the keyboard way in', () => {
    pills('route-north')

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
