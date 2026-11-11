import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CheckpointMarkers } from './CheckpointMarkers'
import { NORTH_ROUTE } from './routeFixtures'

vi.mock('@vis.gl/react-maplibre', () => ({
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

function renderMarkers(selectedCheckpointIndex: number | null, onSelectCheckpoint = vi.fn()) {
  render(
    <CheckpointMarkers
      route={NORTH_ROUTE}
      selectedCheckpointIndex={selectedCheckpointIndex}
      onSelectCheckpoint={onSelectCheckpoint}
    />,
  )
  return onSelectCheckpoint
}

describe('CheckpointMarkers (REQ-08, NFR-03: risk is never shown by colour alone)', () => {
  it('gives every checkpoint of the selected route a button named with its risk word, mile and ETA', () => {
    renderMarkers(null)

    expect(screen.getAllByRole('button')).toHaveLength(NORTH_ROUTE.checkpoints.length)
    expect(
      screen.getByRole('button', { name: 'Low risk at mile 0.0, arriving Thu 07:00 CT' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: /^Moderate risk at mile 60\.0/ })).toBeVisible()
  })

  it('selects a checkpoint when it is clicked, telling the route and the checkpoint', async () => {
    const onSelectCheckpoint = renderMarkers(null)

    await userEvent.click(screen.getByRole('button', { name: /^High risk at mile 90\.0/ }))

    expect(onSelectCheckpoint).toHaveBeenCalledWith('route-north', 3)
  })

  it('selects a checkpoint from the keyboard', async () => {
    const onSelectCheckpoint = renderMarkers(null)

    await userEvent.tab()
    await userEvent.keyboard('{Enter}')

    expect(onSelectCheckpoint).toHaveBeenCalledWith('route-north', 0)
  })

  it('marks only the selected checkpoint as pressed', () => {
    renderMarkers(2)

    const pressed = screen.getAllByRole('button', { pressed: true })

    expect(pressed).toHaveLength(1)
    expect(pressed[0]).toHaveAccessibleName(/^Moderate risk at mile 60\.0/)
  })

  it('shows a card with the risk word, mile and ETA when a marker gets focus', async () => {
    renderMarkers(null)

    await userEvent.tab()

    const card = await screen.findByRole('tooltip')
    expect(card).toHaveTextContent('Low')
    expect(card).toHaveTextContent('Mile 0.0, Thu 07:00 CT')
  })
})
