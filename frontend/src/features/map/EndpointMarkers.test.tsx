import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EndpointMarkers } from './EndpointMarkers'
import { NORTH_ROUTE } from './routeFixtures'

vi.mock('@vis.gl/react-maplibre', () => ({
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

const LABELS = { origin: 'Chicago, Illinois', destination: 'Denver, Colorado' }

describe('start and destination markers (REQ-08)', () => {
  it('names the start and the destination after the places the driver chose', () => {
    render(<EndpointMarkers route={NORTH_ROUTE} labels={LABELS} />)

    expect(screen.getByRole('img', { name: 'Start: Chicago, Illinois' })).toHaveTextContent('A')
    expect(screen.getByRole('img', { name: 'Destination: Denver, Colorado' })).toHaveTextContent(
      'B',
    )
  })

  it('writes the city next to each pin and keeps the full name for the pin itself', () => {
    render(<EndpointMarkers route={NORTH_ROUTE} labels={LABELS} />)

    expect(screen.getByText('Chicago')).toBeVisible()
    expect(screen.getByText('Denver')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Start: Chicago, Illinois' })).toBeInTheDocument()
  })

  it('still marks both ends when the place names are not known', () => {
    render(<EndpointMarkers route={NORTH_ROUTE} />)

    expect(screen.getByRole('img', { name: 'Start' })).toBeVisible()
    expect(screen.getByRole('img', { name: 'Destination' })).toBeVisible()
  })

  it('draws nothing for a route without checkpoints', () => {
    render(<EndpointMarkers route={{ ...NORTH_ROUTE, checkpoints: [] }} labels={LABELS} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
