import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Providers } from './Providers'
import { PlannerLayout } from './PlannerLayout'

function showOnPhone(isPhone: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: isPhone && query.includes('max-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

function renderLayout() {
  render(
    <Providers>
      <PlannerLayout form={<p>form</p>} results={<p>results</p>} map={<p>map</p>} />
    </Providers>,
  )
}

function isBefore(first: string, second: string): boolean {
  const position = screen.getByText(first).compareDocumentPosition(screen.getByText(second))
  return (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('reading and tab order follows the screen (WCAG 2.4.3)', () => {
  it('on a phone goes form, map, results, the way they are stacked on screen', () => {
    showOnPhone(true)
    renderLayout()

    expect(isBefore('form', 'map')).toBe(true)
    expect(isBefore('map', 'results')).toBe(true)
  })

  it('on a wide screen goes form, results, map, the way they sit left to right', () => {
    showOnPhone(false)
    renderLayout()

    expect(isBefore('form', 'results')).toBe(true)
    expect(isBefore('results', 'map')).toBe(true)
  })
})
