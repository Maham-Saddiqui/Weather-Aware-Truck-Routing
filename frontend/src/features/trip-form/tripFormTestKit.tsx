import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { vi } from 'vitest'
import { Providers } from '../../app/Providers'
import { PHOTON_SEARCH_URL } from '../../shared/constants'
import { server } from '../../shared/testing/server'
import { TripForm } from './TripForm'

export function photonFeature(
  properties: { name: string; state: string; countrycode: string },
  lon: number,
  lat: number,
) {
  return { geometry: { coordinates: [lon, lat] }, properties }
}

export function answerWithPlaces(onRequest?: (url: URL) => void) {
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

export function renderForm(onSubmit = vi.fn()) {
  render(
    <Providers>
      <TripForm initialTrip={null} needsReview={false} isBusy={false} onSubmit={onSubmit} />
    </Providers>,
  )
  return onSubmit
}

export async function chooseFirstSuggestion(field: string, text: string) {
  await userEvent.type(screen.getByLabelText(field), text)
  await userEvent.click(await screen.findByRole('option', { name: /Chicago/ }))
}

export async function chooseOriginAndDestination() {
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
