import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/Providers'
import { PHOTON_SEARCH_URL } from '../../shared/constants'
import { server } from '../../shared/testing/server'
import { TripForm } from './TripForm'

function photonFeature(
  properties: { name: string; state: string; countrycode: string },
  lon: number,
  lat: number,
) {
  return { geometry: { coordinates: [lon, lat] }, properties }
}

function answerWithPlaces(onRequest?: (url: URL) => void) {
  server.use(
    http.get(PHOTON_SEARCH_URL, ({ request }) => {
      onRequest?.(new URL(request.url))
      return HttpResponse.json({
        features: [
          photonFeature({ name: 'Chicago', state: 'Illinois', countrycode: 'US' }, -87.63, 41.88),
          photonFeature({ name: 'Chicoutimi', state: 'Quebec', countrycode: 'CA' }, -71.06, 48.43),
        ],
      })
    }),
  )
}

function renderForm(onSubmit = vi.fn()) {
  render(
    <Providers>
      <TripForm initialTrip={null} isBusy={false} onSubmit={onSubmit} />
    </Providers>,
  )
  return onSubmit
}

async function chooseFirstSuggestion(field: string, text: string) {
  await userEvent.type(screen.getByLabelText(field), text)
  await userEvent.click(await screen.findByRole('option', { name: /Chicago/ }))
}

describe('address suggestions (REQ-02, FE-10)', () => {
  it('waits for three characters before asking Photon', async () => {
    const requests: URL[] = []
    answerWithPlaces((url) => requests.push(url))
    renderForm()

    await userEvent.type(screen.getByLabelText('Origin'), 'Ch')
    await new Promise((resolve) => setTimeout(resolve, 450))

    expect(requests).toHaveLength(0)
  })

  it('asks once after a typing pause, limited to the lower 48, and lists only US places', async () => {
    const requests: URL[] = []
    answerWithPlaces((url) => requests.push(url))
    renderForm()

    await userEvent.type(screen.getByLabelText('Origin'), 'Chicago')

    expect(await screen.findByRole('option', { name: 'Chicago, Illinois' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Chicoutimi/ })).not.toBeInTheDocument()
    expect(requests).toHaveLength(1)
    expect(requests[0]?.searchParams.get('bbox')).toBe('-124.85,24.4,-66.9,49.4')
  })

  it('says suggestions are unavailable when Photon fails', async () => {
    server.use(http.get(PHOTON_SEARCH_URL, () => HttpResponse.error()))
    renderForm()

    await userEvent.type(screen.getByLabelText('Origin'), 'Chicago')

    expect(await screen.findAllByText(/Address suggestions are unavailable/)).not.toHaveLength(0)
  })

  it('does not accept free text that was never chosen from the list', async () => {
    answerWithPlaces()
    const onSubmit = renderForm()

    await userEvent.type(screen.getByLabelText('Origin'), 'Somewhere')
    await userEvent.click(screen.getByRole('button', { name: 'Plan route' }))

    expect(screen.getByText('Choose an origin from the suggestions.')).toBeInTheDocument()
    expect(screen.getByText('Choose a destination from the suggestions.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

async function chooseOriginAndDestination() {
  answerWithPlaces()
  await chooseFirstSuggestion('Origin', 'Chicago')
  server.use(
    http.get(PHOTON_SEARCH_URL, () =>
      HttpResponse.json({
        features: [
          photonFeature({ name: 'Denver', state: 'Colorado', countrycode: 'US' }, -104.99, 39.74),
        ],
      }),
    ),
  )
  await userEvent.type(screen.getByLabelText('Destination'), 'Denver')
  await userEvent.click(await screen.findByRole('option', { name: /Denver/ }))
  await userEvent.type(screen.getByLabelText('Cargo weight (lb)'), '42000')
}

describe('departure time zone (RR-18, RR-29)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends the typed wall-clock time as the instant in the origin zone, not the browser zone', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T12:00:00Z') })
    server.use(
      http.get('*/api/v1/timezone', () => HttpResponse.json({ time_zone: 'Pacific/Honolulu' })),
    )
    const onSubmit = renderForm()
    await chooseOriginAndDestination()
    expect(await screen.findByText('Local time at the origin (HST)')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('group', { name: 'Departure' }), '{Control>}a{/Control}')
    await userEvent.keyboard('{Backspace}111220260900')
    await userEvent.click(screen.getByRole('button', { name: 'Plan route' }))

    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ departure_utc: '2026-11-12T19:00:00.000Z' })
  })

  it('says it is finding the origin time zone and blocks planning until it arrives', async () => {
    let answer: () => void = () => undefined
    server.use(
      http.get('*/api/v1/timezone', async () => {
        await new Promise<void>((resolve) => {
          answer = resolve
        })
        return HttpResponse.json({ time_zone: 'America/Chicago' })
      }),
    )
    const onSubmit = renderForm()
    await chooseOriginAndDestination()

    expect(await screen.findByText('Finding the origin’s time zone…')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Plan route' }))
    expect(screen.getByText(/still finding the origin’s time zone/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    answer()
    expect(await screen.findByText(/Local time at the origin/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Plan route' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('says the lookup failed, blocks planning and lets the driver look it up again', async () => {
    server.use(http.get('*/api/v1/timezone', () => HttpResponse.error()))
    const onSubmit = renderForm()
    await chooseOriginAndDestination()
    expect(await screen.findByText('We could not find the origin’s time zone.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Plan route' }))
    expect(screen.getByText(/cannot read the departure time/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Look up the time zone again' }))
    expect(await screen.findByText(/Local time at the origin/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Plan route' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('trip details (REQ-01, RR-29)', () => {
  it('sends a valid trip with the departure as an exact UTC instant (RR-18)', async () => {
    answerWithPlaces()
    const onSubmit = renderForm()
    await chooseFirstSuggestion('Origin', 'Chicago')
    server.use(
      http.get(PHOTON_SEARCH_URL, () =>
        HttpResponse.json({
          features: [
            photonFeature({ name: 'Denver', state: 'Colorado', countrycode: 'US' }, -104.99, 39.74),
          ],
        }),
      ),
    )
    await userEvent.type(screen.getByLabelText('Destination'), 'Denver')
    await userEvent.click(await screen.findByRole('option', { name: /Denver/ }))
    await userEvent.type(screen.getByLabelText('Cargo weight (lb)'), '42000')
    await userEvent.click(screen.getByRole('button', { name: '50 miles' }))
    await userEvent.click(screen.getByRole('button', { name: 'Plan route' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      origin: { label: 'Chicago, Illinois' },
      destination: { label: 'Denver, Colorado' },
      load_lb: 42_000,
      spacing_miles: 50,
      departure_utc: expect.stringMatching(/Z$/) as string,
    })
  })

  it('checkpoint spacing starts at 25 miles (RR-12)', () => {
    renderForm()

    expect(screen.getByRole('button', { name: '25 miles' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows a gentle note above 45,000 lb without blocking (RR-29)', async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText('Cargo weight (lb)'), '46000')

    expect(screen.getByText(/Above typical legal cargo/)).toBeInTheDocument()
  })

  it('explains a weight above 80,000 lb in plain English (RR-29)', async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText('Cargo weight (lb)'), '90000')
    await userEvent.click(screen.getByRole('button', { name: 'Plan route' }))

    expect(screen.getByText('Cargo weight can be at most 80,000 lb.')).toBeInTheDocument()
  })

  it('swaps origin and destination', async () => {
    answerWithPlaces()
    renderForm()
    await chooseFirstSuggestion('Origin', 'Chicago')

    await userEvent.click(screen.getByRole('button', { name: 'Swap origin and destination' }))

    expect(screen.getByLabelText('Destination')).toHaveValue('Chicago, Illinois')
    expect(screen.getByLabelText('Origin')).toHaveValue('')
  })
})
