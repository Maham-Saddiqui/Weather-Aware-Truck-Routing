import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Header } from './Header'
import { Providers } from './Providers'

const TAGLINE =
  'Compare up to three truck routes by the weather you will actually meet, hour by hour.'

function showOnPhone(isPhone: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: isPhone && query.includes('max-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

function renderHeader() {
  render(
    <Providers>
      <Header onOpenRiskInfo={() => undefined} onOpenCredits={() => undefined} />
    </Providers>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('header on a phone keeps credits and the risk explanation reachable (REQ-13, REQ-15)', () => {
  it('keeps the tagline for screen readers but takes it out of the picture', () => {
    showOnPhone(true)
    renderHeader()

    expect(screen.getByText(TAGLINE)).toBeInTheDocument()
    expect(getComputedStyle(screen.getByText(TAGLINE)).position).toBe('absolute')
  })

  it('shows "How risk works" as an icon with the same name and a tooltip', () => {
    showOnPhone(true)
    renderHeader()

    const link = screen.getByRole('button', { name: 'How risk works' })
    expect(link).toHaveTextContent('')
    expect(link).toHaveAttribute('title', 'How risk works')
  })

  it('still offers Credits by name', () => {
    showOnPhone(true)
    renderHeader()

    expect(screen.getByRole('button', { name: 'Credits' })).toBeVisible()
  })
})

describe('header on a tablet or desktop (REQ-13, REQ-15)', () => {
  it('shows the tagline in the page', () => {
    showOnPhone(false)
    renderHeader()

    expect(getComputedStyle(screen.getByText(TAGLINE)).position).not.toBe('absolute')
  })

  it('writes "How risk works" out in full', () => {
    showOnPhone(false)
    renderHeader()

    expect(screen.getByRole('button', { name: 'How risk works' })).toHaveTextContent(
      'How risk works',
    )
  })
})
