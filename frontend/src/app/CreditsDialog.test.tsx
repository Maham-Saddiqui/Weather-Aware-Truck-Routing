import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../shared/testing/server'
import { CreditsDialog } from './CreditsDialog'
import { Providers } from './Providers'

function renderDialog() {
  render(
    <Providers>
      <CreditsDialog open onClose={vi.fn()} />
    </Providers>,
  )
}

describe('credits dialog (REQ-13)', () => {
  it('names TomTom from the server, OpenStreetMap, OpenMapTiles and Open-Meteo with its link', async () => {
    renderDialog()

    expect(await screen.findByText('©TomTom (test)')).toBeInTheDocument()
    expect(screen.getByText('© OpenStreetMap contributors, © OpenMapTiles')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Weather data by Open-Meteo.com' })).toHaveAttribute(
      'href',
      'https://open-meteo.com/',
    )
  })

  it('says the routing credit is unavailable instead of leaving it blank when the server fails', async () => {
    server.use(http.get('*/api/v1/attribution', () => HttpResponse.error()))
    renderDialog()

    expect(
      await screen.findByText('Routing copyright text is unavailable right now.'),
    ).toBeInTheDocument()
  })
})
