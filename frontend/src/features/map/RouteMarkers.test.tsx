import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { RouteMarkers } from './RouteMarkers'
import { NORTH_ROUTE, TWO_ROUTES, heatmapFromCheckpoints } from './routeFixtures'

vi.mock('@vis.gl/react-maplibre', () => ({
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

const HEATMAP = heatmapFromCheckpoints(TWO_ROUTES)

function markersAt(hourOffset: number, selectedRouteId: string | null = NORTH_ROUTE.id) {
  return (
    <RouteMarkers
      routes={TWO_ROUTES}
      selectedRouteId={selectedRouteId}
      selectedCheckpointIndex={null}
      onSelectCheckpoint={vi.fn()}
      heatmap={HEATMAP}
      hourOffset={hourOffset}
    />
  )
}

function mutedDotCount(): number {
  return screen
    .getAllByRole('button')
    .filter((button) => getComputedStyle(button.firstElementChild ?? button).opacity === '0.8')
    .length
}

describe('RouteMarkers tell one story with the slider (REQ-09, RR-28, FE-08)', () => {
  it('shows the truck and the checkpoint dots of the selected route only', () => {
    render(markersAt(0))

    expect(screen.getByRole('img', { name: /^Truck at / })).toBeVisible()
    expect(screen.getAllByRole('button')).toHaveLength(NORTH_ROUTE.checkpoints.length)
  })

  it('mutes more dots as the truck drives on', () => {
    const { rerender } = render(markersAt(0))
    const mutedAtDeparture = mutedDotCount()

    rerender(markersAt(5))

    expect(mutedDotCount()).toBeGreaterThan(mutedAtDeparture)
  })

  it('shows nothing when no route is selected', () => {
    render(markersAt(0, null))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
