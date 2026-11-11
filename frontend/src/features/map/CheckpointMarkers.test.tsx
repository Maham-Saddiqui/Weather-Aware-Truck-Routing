import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CheckpointMarkers } from './CheckpointMarkers'
import { NORTH_ROUTE } from './routeFixtures'

const map = vi.hoisted(() => ({ spacingPx: 100 }))

vi.mock('@vis.gl/react-maplibre', () => ({
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useMap: () => ({
    current: {
      on: vi.fn(),
      off: vi.fn(),
      project: ([longitude]: [number, number]) => ({ x: longitude * map.spacingPx, y: 0 }),
    },
  }),
}))

function renderMarkers(
  selectedCheckpointIndex: number | null,
  onSelectCheckpoint = vi.fn(),
  forecastMs: number | null = null,
) {
  render(
    <CheckpointMarkers
      route={NORTH_ROUTE}
      selectedCheckpointIndex={selectedCheckpointIndex}
      onSelectCheckpoint={onSelectCheckpoint}
      forecastMs={forecastMs}
    />,
  )
  return onSelectCheckpoint
}

function opacityOf(button: HTMLElement): string {
  return getComputedStyle(button.firstElementChild ?? button).opacity
}

describe('CheckpointMarkers (REQ-08, NFR-03: risk is never shown by colour alone)', () => {
  beforeEach(() => {
    map.spacingPx = 100
  })

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

  it('keeps the markers out of the tab order, since the checkpoint list is the keyboard route (FE-07)', async () => {
    renderMarkers(null)

    await userEvent.tab()

    expect(document.body).toHaveFocus()
  })

  it('still selects a focused checkpoint with the keyboard', async () => {
    const onSelectCheckpoint = renderMarkers(null)

    screen.getAllByRole('button')[0]?.focus()
    await userEvent.keyboard('{Enter}')

    expect(onSelectCheckpoint).toHaveBeenCalledWith('route-north', 0)
  })

  it('marks only the selected checkpoint as pressed', () => {
    renderMarkers(2)

    const pressed = screen.getAllByRole('button', { pressed: true })

    expect(pressed).toHaveLength(1)
    expect(pressed[0]).toHaveAccessibleName(/^Moderate risk at mile 60\.0/)
  })

  it('mutes the checkpoints whose ETA is at or before the slider time, keeping their words (REQ-09)', () => {
    const etaOfThird = Date.parse(NORTH_ROUTE.checkpoints[2]?.eta_utc ?? '')
    renderMarkers(null, vi.fn(), etaOfThird)

    const buttons = screen.getAllByRole('button')

    expect(buttons.map(opacityOf).slice(0, 4)).toEqual(['0.8', '0.8', '0.8', '1'])
    expect(buttons[2]).toHaveAccessibleName(/^Moderate risk at mile 60\.0/)
  })

  it('mutes nothing when there is no forecast time', () => {
    renderMarkers(null)

    expect(new Set(screen.getAllByRole('button').map(opacityOf))).toEqual(new Set(['1']))
  })

  it('shows a card with the risk word, mile and ETA when a marker gets focus', async () => {
    renderMarkers(null)

    screen.getAllByRole('button')[0]?.focus()

    const card = await screen.findByRole('tooltip')
    expect(card).toHaveTextContent('Low')
    expect(card).toHaveTextContent('Mile 0.0, Thu 07:00 CT')
  })
})

describe('CheckpointMarkers thin out while zoomed far out (REQ-08, NFR-03)', () => {
  const LAST = NORTH_ROUTE.checkpoints.length - 1

  beforeEach(() => {
    map.spacingPx = 10
  })

  it('draws every 4th checkpoint and the destination instead of a smear of all of them', () => {
    renderMarkers(null)

    const drawn = screen.getAllByRole('button')
    const expected = NORTH_ROUTE.checkpoints.filter((_, i) => i % 4 === 0 || i === LAST)

    expect(drawn).toHaveLength(expected.length)
    expect(drawn.length).toBeLessThan(NORTH_ROUTE.checkpoints.length)
  })

  it('keeps the icon on every dot that is drawn, so risk is still not colour alone (FE-07)', () => {
    renderMarkers(null)

    for (const button of screen.getAllByRole('button')) {
      expect(button.querySelector('svg')).not.toBeNull()
    }
  })

  it('always draws the selected checkpoint', () => {
    renderMarkers(5)

    expect(screen.getByRole('button', { pressed: true })).toBeVisible()
  })
})
