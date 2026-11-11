import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import App from './App'
import { server } from './shared/testing/server'

describe('App shell', () => {
  it('pings the server once when the app opens so a sleeping server wakes (REQ-12)', async () => {
    let healthPings = 0
    server.use(
      http.get('*/api/v1/health', () => {
        healthPings += 1
        return HttpResponse.json({ status: 'ok' })
      }),
    )

    render(<App />)

    await screen.findByRole('heading', { level: 1 })
    expect(healthPings).toBe(1)
  })

  it('shows the product name and a Credits button from the first screen (REQ-13)', async () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Weather-Aware Truck Routing',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Credits' }))

    expect(await screen.findByText('Weather data by Open-Meteo.com')).toBeInTheDocument()
    expect(screen.getByText('© OpenStreetMap contributors, © OpenMapTiles')).toBeInTheDocument()
    expect(await screen.findByText('©TomTom (test)')).toBeInTheDocument()
  })

  it('explains how risk is calculated and that arrival times are driving time only (REQ-15, RR-16)', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'How risk works' }))

    expect(
      await screen.findByRole('dialog', { name: 'How risk is calculated' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Arrival times are driving time only/)).toBeInTheDocument()
  })

  it('plans an example trip with one click and lists both routes (REQ-11, REQ-06)', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Chicago to Denver' }))

    expect(await screen.findByRole('button', { name: 'Route 2' })).toBeInTheDocument()
    expect(screen.getByText('Route 1 has the fewest Severe miles.')).toBeInTheDocument()
  })
})
