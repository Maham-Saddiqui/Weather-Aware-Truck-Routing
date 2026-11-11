import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

function layout(arrival: string | null = '1-result') {
  return (
    <Providers>
      <PlannerLayout
        form={<p>form</p>}
        results={<p>results</p>}
        map={<p>map</p>}
        arrival={arrival}
      />
    </Providers>
  )
}

function renderLayout(arrival: string | null = '1-result') {
  return render(layout(arrival))
}

function isBefore(first: string, second: string): boolean {
  const position = screen.getByText(first).compareDocumentPosition(screen.getByText(second))
  return (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
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

describe('the results panel can be hidden beside the map (FE-07)', () => {
  beforeEach(() => {
    showOnPhone(false)
  })

  function panel() {
    return screen.getByRole('button', { name: /results panel/ })
  }

  it('offers a button that hides the panel and shows it again, saying which in its name', async () => {
    renderLayout()
    expect(panel()).toHaveAccessibleName('Hide results panel')
    expect(panel()).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(panel())
    expect(panel()).toHaveAccessibleName('Show results panel')
    expect(panel()).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(panel())
    expect(panel()).toHaveAccessibleName('Hide results panel')
  })

  it('points the button at the panel and takes a hidden panel out of reach of the keyboard', async () => {
    renderLayout()
    const controlled = document.getElementById(panel().getAttribute('aria-controls') ?? '')
    expect(controlled).toContainElement(screen.getByText('form'))
    expect(controlled).not.toHaveAttribute('inert')

    await userEvent.click(panel())
    expect(controlled).toHaveAttribute('inert')
  })

  it('works from the keyboard with Enter and Space and keeps the focus on the button', async () => {
    renderLayout()
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    expect(panel()).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(panel()).toHaveAttribute('aria-expanded', 'false')
    await userEvent.keyboard(' ')
    expect(panel()).toHaveAttribute('aria-expanded', 'true')
    expect(panel()).toHaveFocus()
  })

  it('remembers a hidden panel for the next visit that shows a trip', async () => {
    const first = renderLayout()
    await userEvent.click(panel())
    first.unmount()

    renderLayout()
    expect(panel()).toHaveAttribute('aria-expanded', 'false')
  })

  it('still works when the browser refuses to store anything', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    renderLayout()
    expect(panel()).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(panel())
    expect(panel()).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens again for each new trip result or error, without forgetting the saved choice', async () => {
    const view = renderLayout('0-result')
    await userEvent.click(panel())
    expect(panel()).toHaveAttribute('aria-expanded', 'false')

    view.rerender(layout('1-result'))
    expect(panel()).toHaveAttribute('aria-expanded', 'true')
    expect(window.localStorage.getItem('results-panel-collapsed')).toBe('true')

    await userEvent.click(panel())
    view.rerender(layout('1-result'))
    expect(panel()).toHaveAttribute('aria-expanded', 'false')

    view.rerender(layout('2-error'))
    expect(panel()).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('an empty page always shows the form, whatever panel choice was remembered (FE-07)', () => {
  beforeEach(() => {
    showOnPhone(false)
  })

  it('keeps the panel open and offers no hide button before a trip is planned', () => {
    window.localStorage.setItem('results-panel-collapsed', 'true')
    renderLayout(null)

    expect(screen.queryByRole('button', { name: /results panel/ })).toBeNull()
    expect(screen.getByText('form').closest('[inert]')).toBeNull()
  })

  it('opens for the first trip result and does not forget the remembered choice', () => {
    window.localStorage.setItem('results-panel-collapsed', 'true')
    const view = renderLayout(null)
    expect(screen.queryByRole('button', { name: /results panel/ })).toBeNull()

    view.rerender(layout('1-result'))
    expect(screen.getByRole('button', { name: /results panel/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(window.localStorage.getItem('results-panel-collapsed')).toBe('true')
  })

  it('opens an error on an empty page for the driver to read, and keeps the button afterwards', () => {
    const view = renderLayout(null)

    view.rerender(layout('1-error'))
    view.rerender(layout(null))

    expect(screen.getByRole('button', { name: /results panel/ })).toBeVisible()
  })

  it('stays open on an empty page when the browser refuses to read storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    renderLayout(null)

    expect(screen.getByText('form').closest('[inert]')).toBeNull()
  })
})

describe('the hide button is not offered on a phone (FE-07)', () => {
  it('shows no button and keeps the results even if the panel was hidden on a wider screen', () => {
    window.localStorage.setItem('results-panel-collapsed', 'true')
    showOnPhone(true)
    renderLayout()

    expect(screen.queryByRole('button', { name: /results panel/ })).toBeNull()
    expect(screen.getByText('results')).toBeVisible()
  })
})
