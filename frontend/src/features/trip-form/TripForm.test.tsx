import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PHOTON_SEARCH_URL, SUGGESTION_PAUSE_MS } from '../../shared/constants'
import { browserTimeZone, dayjs } from '../../shared/time'
import { server } from '../../shared/testing/server'
import {
  answerWithPlaces,
  chooseFirstSuggestion,
  chooseOriginAndDestination,
  photonFeature,
  renderForm,
} from './tripFormTestKit'

// Testing Library only advances fake timers for you when it finds a `jest` global.
function useFakeClock() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.stubGlobal('jest', { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) })
  return userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
}

function passTime(milliseconds: number) {
  return act(() => vi.advanceTimersByTimeAsync(milliseconds))
}

describe('address suggestions (REQ-02, FE-10)', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('asks Photon for exactly three characters but not for two (REQ-02)', async () => {
    const typing = useFakeClock()
    const requests: URL[] = []
    answerWithPlaces((url) => requests.push(url))
    renderForm()

    await typing.type(screen.getByLabelText('Origin'), 'Ch')
    await passTime(SUGGESTION_PAUSE_MS)
    expect(requests).toHaveLength(0)

    await typing.type(screen.getByLabelText('Origin'), 'i')
    await passTime(SUGGESTION_PAUSE_MS)
    await vi.waitFor(() => {
      expect(requests).toHaveLength(1)
    })
    expect(requests[0]?.searchParams.get('q')).toBe('Chi')
  })

  it('waits for the 300 ms typing pause before asking (FE-10)', async () => {
    const typing = useFakeClock()
    const requests: URL[] = []
    answerWithPlaces((url) => requests.push(url))
    renderForm()

    await typing.type(screen.getByLabelText('Origin'), 'Chicago')
    await passTime(SUGGESTION_PAUSE_MS - 1)
    expect(requests).toHaveLength(0)

    await passTime(1)
    await vi.waitFor(() => {
      expect(requests).toHaveLength(1)
    })
  })

  it('cancels the previous suggestion request when the driver keeps typing (FE-10)', async () => {
    const typing = useFakeClock()
    const signals: AbortSignal[] = []
    server.use(
      http.get(PHOTON_SEARCH_URL, async ({ request }) => {
        signals.push(request.signal)
        await delay('infinite')
        return HttpResponse.json({ features: [] })
      }),
    )
    renderForm()

    await typing.type(screen.getByLabelText('Origin'), 'Chi')
    await passTime(SUGGESTION_PAUSE_MS)
    await vi.waitFor(() => {
      expect(signals).toHaveLength(1)
    })
    await typing.type(screen.getByLabelText('Origin'), 'c')
    await passTime(SUGGESTION_PAUSE_MS)
    await vi.waitFor(() => {
      expect(signals).toHaveLength(2)
    })

    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)
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

  it('keeps the untouched default at 08:00 on the clock of the origin zone (RR-18)', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T12:00:00Z') })
    server.use(
      http.get('*/api/v1/timezone', () => HttpResponse.json({ time_zone: 'Pacific/Honolulu' })),
    )
    const onSubmit = renderForm()
    await chooseOriginAndDestination()
    expect(await screen.findByText('Local time at the origin (HST)')).toBeInTheDocument()

    expect(screen.getByRole('spinbutton', { name: 'Hours' })).toHaveAttribute('aria-valuenow', '8')
    await userEvent.click(screen.getByRole('button', { name: 'Plan route' }))
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ departure_utc: '2026-11-11T18:00:00.000Z' })
  })

  it('keeps the instant the driver typed when the origin zone arrives later (RR-18)', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T12:00:00Z') })
    server.use(
      http.get('*/api/v1/timezone', () => HttpResponse.json({ time_zone: 'Pacific/Honolulu' })),
    )
    const onSubmit = renderForm()
    const departure = await screen.findByRole('group', { name: 'Departure' }, { timeout: 5000 })
    await userEvent.type(departure, '{Control>}a{/Control}')
    await userEvent.keyboard('{Backspace}111220260900')
    await chooseOriginAndDestination()
    expect(await screen.findByText('Local time at the origin (HST)')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Plan route' }))

    const typedInBrowserZone = dayjs.tz('2026-11-12 09:00', browserTimeZone()).toISOString()
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ departure_utc: typedInBrowserZone })
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
