import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App shell', () => {
  it('shows the product name and a Credits button from the first screen (REQ-13)', async () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Weather-Aware Truck Routing',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Credits' }))

    expect(await screen.findByText('Weather data by Open-Meteo.com')).toBeInTheDocument()
    expect(await screen.findByText('©TomTom (test)')).toBeInTheDocument()
  })

  it('plans an example trip with one click and lists the route (REQ-11)', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Chicago to Denver' }))

    expect(await screen.findAllByText('60.0 mi')).not.toHaveLength(0)
  })
})
