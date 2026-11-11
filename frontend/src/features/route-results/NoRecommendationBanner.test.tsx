import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeRoute } from '../../shared/testing/fixtures'
import type { Recommendation, WeatherStatus } from '../../shared/types'
import { NoRecommendationBanner } from './NoRecommendationBanner'

const NONE: Recommendation = {
  status: 'none_eligible',
  route_id: null,
  least_bad_route_id: null,
  deciding_criterion: null,
  sentence: 'No route is safe enough to recommend.',
}

function renderBanner(weather: WeatherStatus | null) {
  render(
    <NoRecommendationBanner
      recommendation={NONE}
      routes={[makeRoute('route-a')]}
      weather={weather}
    />,
  )
}

describe('advice when no route is recommended (RR-23)', () => {
  it.each(['ok', 'partial', null] as const)(
    'suggests leaving later when the weather status is %s',
    (weather) => {
      renderBanner(weather)

      expect(screen.getByText(/Leaving later may help/)).toBeInTheDocument()
    },
  )

  it.each(['busy', 'unavailable'] as const)(
    'says the routes are real and only the ratings are missing when the weather is %s, without repeating per route',
    (weather) => {
      renderBanner(weather)

      expect(
        screen.getByText(
          /The routes and travel times are real; only the weather ratings are missing\./,
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText(/Leaving later may help/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Why no route is recommended')).not.toBeInTheDocument()
    },
  )

  it('names the unavailable weather data', () => {
    renderBanner('unavailable')

    expect(screen.getByText(/Weather data is unavailable right now/)).toBeInTheDocument()
  })
})
