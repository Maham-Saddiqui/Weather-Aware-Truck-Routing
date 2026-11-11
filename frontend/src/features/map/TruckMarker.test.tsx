import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TruckMarker } from './TruckMarker'
import { NORTH_ROUTE, heatmapFromCheckpoints } from './routeFixtures'

const markerProps = vi.hoisted(() => ({ current: null as { longitude: number } | null }))

vi.mock('@vis.gl/react-maplibre', () => ({
  Marker: (props: { children: ReactNode; longitude: number }) => {
    markerProps.current = props
    return <div>{props.children}</div>
  },
}))

const HEATMAP = heatmapFromCheckpoints([NORTH_ROUTE])

function truckAt(hourOffset: number) {
  return <TruckMarker route={NORTH_ROUTE} heatmap={HEATMAP} hourOffset={hourOffset} />
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

  it('pulses a soft ring while on the move, and not once arrived (NFR-03)', () => {
    const { rerender } = render(truckAt(0))
    expect(screen.getByTestId('truck-pulse')).toHaveAttribute('aria-hidden', 'true')

    rerender(truckAt(48))

    expect(screen.queryByTestId('truck-pulse')).not.toBeInTheDocument()
  })

  it('switches the pulse off when reduced motion is requested (FE-07)', () => {
    render(truckAt(0))

    const styles = Array.from(document.querySelectorAll('style'))
      .map((element) => element.textContent)
      .join('')

    expect(styles).toMatch(/prefers-reduced-motion: reduce\)\{[^}]*animation:none/)
  })
})
