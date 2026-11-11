import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../shared/testing/server'
import { chooseOriginAndDestination, renderForm } from './tripFormTestKit'

describe('focus after a rejected submit (FE-07, NFR-03)', () => {
  it('moves focus to the first field with an error', async () => {
    renderForm()

    await userEvent.click(screen.getByRole('button', { name: 'Plan route' }))

    expect(screen.getByLabelText('Origin')).toHaveFocus()
  })

  it('skips fields that are fine and lands on the cargo weight', async () => {
    server.use(
      http.get('*/api/v1/timezone', () => HttpResponse.json({ time_zone: 'America/Chicago' })),
    )
    renderForm()
    await chooseOriginAndDestination()
    await userEvent.clear(screen.getByLabelText('Cargo weight (lb)'))
    expect(await screen.findByText(/Local time at the origin/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Plan route' }))

    expect(screen.getByLabelText('Cargo weight (lb)')).toHaveFocus()
  })

  it('lands on the departure when only the origin time zone is missing', async () => {
    server.use(http.get('*/api/v1/timezone', () => HttpResponse.error()))
    renderForm()
    await chooseOriginAndDestination()
    expect(await screen.findByText('We could not find the origin’s time zone.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Plan route' }))

    expect(screen.getByRole('group', { name: 'Departure' }).contains(document.activeElement)).toBe(
      true,
    )
  })
})

function showOnScreen(width: 'phone' | 'desktop') {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: width === 'phone' && query.includes('max-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

describe.each(['phone', 'desktop'] as const)(
  'focus when the form folds into a summary on a %s (FE-07, NFR-03, REQ-10)',
  (width) => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('moves focus to Edit trip when planning folds the form away, and back to Origin when edited', async () => {
      showOnScreen(width)
      renderForm()

      await userEvent.click(screen.getByRole('button', { name: /Chicago to Denver/ }))
      expect(screen.getByRole('button', { name: 'Edit trip' })).toHaveFocus()
      expect(screen.getByRole('button', { name: 'Edit trip' })).not.toHaveAttribute('aria-expanded')
      expect(screen.queryByLabelText('Origin')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Chicago to Denver/ })).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Edit trip' }))
      expect(screen.getByLabelText('Origin')).toHaveFocus()
    })

    it('shows the departure in the origin time zone once it is known', async () => {
      server.use(
        http.get('*/api/v1/timezone', () => HttpResponse.json({ time_zone: 'America/Chicago' })),
      )
      showOnScreen(width)
      renderForm()

      await userEvent.click(screen.getByRole('button', { name: /Chicago to Denver/ }))

      expect(await screen.findByText(/Departs .* CT/)).toBeInTheDocument()
    })
  },
)
