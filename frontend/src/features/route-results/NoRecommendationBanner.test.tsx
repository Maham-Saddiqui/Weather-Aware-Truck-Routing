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

  it('says plainly that the weather service is busy, and does not suggest leaving later', () => {
    renderBanner('busy')

    expect(
      screen.getByText(
        /The weather service is busy, so no route could be rated\. Try again in a few minutes, or later if it stays busy\./,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Leaving later may help/)).not.toBeInTheDocument()
  })

  it('says weather data is unavailable, and does not suggest leaving later', () => {
    renderBanner('unavailable')

    expect(
      screen.getByText(/Weather data is unavailable, so no route could be rated/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Leaving later may help/)).not.toBeInTheDocument()
  })
})
