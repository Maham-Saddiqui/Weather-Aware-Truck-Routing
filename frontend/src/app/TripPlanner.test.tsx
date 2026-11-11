import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Providers } from './Providers'
import { TripPlanner } from './TripPlanner'

const renders = vi.hoisted(() => ({ form: 0, results: 0 }))

vi.mock('../features/trip-form', async (importOriginal) => ({
  ...(await importOriginal<{ departureError: unknown }>()),
  TripForm: () => {
    renders.form += 1
    return null
  },
}))

vi.mock('./ResultsPane', () => ({
  ResultsPane: () => {
    renders.results += 1
    return null
  },
}))

vi.mock('./MapPane', () => ({
  MapPane: ({ hourOffset }: { hourOffset: number }) => (
    <div data-testid="map" data-hour={hourOffset} />
  ),
}))

afterEach(() => {
  vi.useRealTimers()
  window.history.replaceState(null, '', '/')
})

describe('forecast slider (FE-08, PERF-07)', () => {
  it('redraws the map for a new hour without re-rendering the form or the results', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-11T12:00:00Z') })
    window.history.replaceState(
      null,
      '',
      '/?o=Chicago&olat=41.88&olon=-87.63&d=Denver&dlat=39.74&dlon=-104.99&dep=2026-11-12T14:00:00.000Z&load=42000&spacing=25',
    )
    render(
      <Providers>
        <TripPlanner />
      </Providers>,
    )
    const slider = await screen.findByRole('slider', { name: 'Hours after departure' })
    const formRenders = renders.form
    const resultsRenders = renders.results

    slider.focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')

    expect(screen.getByTestId('map')).toHaveAttribute('data-hour', '3')
    expect(renders.form).toBe(formRenders)
    expect(renders.results).toBe(resultsRenders)
  })
})
