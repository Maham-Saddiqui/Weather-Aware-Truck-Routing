import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Providers } from '../../app/Providers'
import { makeRoute } from '../../shared/testing/fixtures'
import type { Route } from '../../shared/types'
import { RouteStats } from './RouteStats'

function renderStats(route: Route) {
  render(
    <Providers>
      <RouteStats route={route} />
    </Providers>,
  )
}

function comparedWith(text: string | null): Route {
  const route = makeRoute('route-b', { rank: 2 })
  return { ...route, summary: { ...route.summary, travel_time_difference_text: text } }
}

describe('route card travel time comparison (REQ-06, RR-25, GEN-03)', () => {
  it('shows the server comparison with Route 1 unchanged under the travel time', () => {
    renderStats(comparedWith('2 h 28 min slower than Route 1'))

    expect(screen.getByText('1 h 10 min')).toBeInTheDocument()
    expect(screen.getByText('2 h 28 min slower than Route 1')).toBeInTheDocument()
  })

  it('shows no comparison line when the server sent null, as for Route 1', () => {
    renderStats(comparedWith(null))

    expect(screen.queryByText(/than Route 1|Same travel time/)).not.toBeInTheDocument()
  })
})
