import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TruckMarker } from './TruckMarker'
import { NORTH_ROUTE, SOUTH_ROUTE, heatmapFromCheckpoints } from './routeFixtures'

const markerProps = vi.hoisted(() => ({ current: null as { longitude: number } | null }))

vi.mock('@vis.gl/react-maplibre', () => ({
  Marker: (props: { children: ReactNode; longitude: number }) => {
    markerProps.current = props
    return <div>{props.children}</div>
  },
}))

const HEATMAP = heatmapFromCheckpoints([NORTH_ROUTE])

function truckAt(hourOffset: number, selectedRouteId: string | null = NORTH_ROUTE.id) {
  return (
    <TruckMarker
      routes={[NORTH_ROUTE, SOUTH_ROUTE]}
      selectedRouteId={selectedRouteId}
      heatmap={HEATMAP}
      hourOffset={hourOffset}
    />
  )
}

describe('TruckMarker follows the forecast slider (REQ-09, RR-28, FE-07, FE-08)', () => {
  it('is named with the clock time of the slider, in the route time zone', () => {
    render(truckAt(0))

    expect(screen.getByRole('img', { name: 'Truck at Thu 07:00 CT' })).toBeVisible()
    expect(screen.queryByText('Arrived')).not.toBeInTheDocument()
  })

  it('moves along the route as the hour grows', () => {
    const { rerender } = render(truckAt(0))
    const departureLongitude = markerProps.current?.longitude

    rerender(truckAt(10))

    expect(markerProps.current?.longitude).toBeLessThan(departureLongitude ?? 0)
    expect(screen.getByRole('img', { name: 'Truck at Thu 17:00 CT' })).toBeVisible()
  })

  it('says Arrived at the destination once the last ETA has passed', () => {
    render(truckAt(48))

    expect(screen.getByText('Arrived')).toBeVisible()
    expect(screen.getByRole('img', { name: /^Truck arrived, / })).toBeVisible()
  })

  it('shows no truck when no route is selected', () => {
    render(truckAt(0, null))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
