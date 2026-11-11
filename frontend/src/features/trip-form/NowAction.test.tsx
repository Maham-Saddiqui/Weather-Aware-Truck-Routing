import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../shared/testing/server'
import { chooseOriginAndDestination, renderForm } from './tripFormTestKit'

async function openPickerWithOriginIn(timeZone: string, abbreviation: string, now: string) {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(now) })
  server.use(http.get('*/api/v1/timezone', () => HttpResponse.json({ time_zone: timeZone })))
  const onSubmit = renderForm()
  await chooseOriginAndDestination()
  expect(await screen.findByText(`Local time at the origin (${abbreviation})`)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /Choose date/ }))
  return onSubmit
}

function departureClock() {
  const part = (name: string) =>
    (screen.getByRole('spinbutton', { name }).getAttribute('aria-valuenow') ?? '').padStart(2, '0')
  return `${part('Month')}-${part('Day')} ${part('Hours')}:${part('Minutes')}`
}

describe('Now action in the departure picker (RR-18, RR-29)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets the current hour on the clock of a Honolulu origin', async () => {
    await openPickerWithOriginIn('Pacific/Honolulu', 'HST', '2026-11-10T20:40:30Z')

    await userEvent.click(screen.getByRole('button', { name: 'Now' }))

    expect(departureClock()).toBe('11-10 10:00')
  })

  it('sets the current hour on the clock of a Tokyo origin, a day ahead of the browser', async () => {
    await openPickerWithOriginIn('Asia/Tokyo', 'Japan Time', '2026-11-10T20:40:30Z')

    await userEvent.click(screen.getByRole('button', { name: 'Now' }))

    expect(departureClock()).toBe('11-11 05:00')
  })

  it('stays inside the departure window at the exact start of the hour', async () => {
    const onSubmit = await openPickerWithOriginIn('Pacific/Honolulu', 'HST', '2026-11-10T20:00:00Z')

    await userEvent.click(screen.getByRole('button', { name: 'Now' }))
    await userEvent.click(screen.getByRole('button', { name: 'Plan route' }))

    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ departure_utc: '2026-11-10T20:00:00.000Z' })
  })

  it('can be used with the keyboard', async () => {
    await openPickerWithOriginIn('Asia/Tokyo', 'Japan Time', '2026-11-10T20:40:30Z')

    screen.getByRole('button', { name: 'Now' }).focus()
    await userEvent.keyboard('{Enter}')

    expect(departureClock()).toBe('11-11 05:00')
  })
})
