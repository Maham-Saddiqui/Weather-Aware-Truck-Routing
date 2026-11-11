import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/Providers'
import { makeRoute } from '../../shared/testing/fixtures'
import { CheckpointSection } from './CheckpointSection'

function showOnScreen(width: 'phone' | 'desktop', prefersReducedMotion = false) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce') ? prefersReducedMotion : width === 'phone',
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

// The map is outside this component: its button picks a checkpoint the way a click on a map dot does.
function SectionWithMap() {
  const [selected, setSelected] = useState<number | null>(null)
  return (
    <Providers>
      <button
        type="button"
        onClick={() => {
          setSelected(2)
        }}
      >
        Pick on the map
      </button>
      <CheckpointSection
        route={makeRoute('route-a')}
        routeNumber={1}
        selectedCheckpointIndex={selected}
        onSelectCheckpoint={(_routeId, index) => {
          setSelected(index)
        }}
      />
    </Providers>
  )
}

const toggle = () => screen.getByRole('button', { name: /Checkpoints on Route 1/ })

const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')

beforeEach(() => {
  scrollIntoView.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('the checkpoint section folds away (REQ-08, REQ-12, NFR-04)', () => {
  it('is closed on a phone and says how many checkpoints are inside', () => {
    showOnScreen('phone')
    render(<SectionWithMap />)

    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(toggle()).toHaveTextContent('3 checkpoints')
    expect(screen.queryByRole('list', { name: 'Checkpoints' })).not.toBeInTheDocument()
  })

  it('is open on a wide screen', () => {
    showOnScreen('desktop')
    render(<SectionWithMap />)

    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('list', { name: 'Checkpoints' })).toBeInTheDocument()
  })

  it('opens and closes with the heading button and keeps aria-expanded true to what is shown', async () => {
    showOnScreen('phone')
    render(<SectionWithMap />)

    await userEvent.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('list', { name: 'Checkpoints' })).toBeInTheDocument()

    await userEvent.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list', { name: 'Checkpoints' })).not.toBeInTheDocument()
  })
})

describe('a checkpoint picked on the map leads the eye to its detail (REQ-08, REQ-12, NFR-03)', () => {
  it('opens a closed section, shows the detail, scrolls to it and says so politely', async () => {
    showOnScreen('phone')
    render(<SectionWithMap />)

    await userEvent.click(screen.getByRole('button', { name: 'Pick on the map' }))

    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('heading', { name: /^Mile 60/ })).toBeInTheDocument()
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
    expect(screen.getByText('Checkpoint at mile 60 selected')).toBeInTheDocument()
  })

  it('highlights the row for a moment and then lets it go', () => {
    showOnScreen('desktop')
    vi.useFakeTimers()
    render(<SectionWithMap />)
    const row = () => screen.getByRole('button', { name: /Mile 60/ })

    act(() => {
      screen.getByRole('button', { name: 'Pick on the map' }).click()
    })
    expect(row()).toHaveStyle({ outlineStyle: 'solid' })

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(row()).not.toHaveStyle({ outlineStyle: 'solid' })
    expect(screen.queryByText('Checkpoint at mile 60 selected')).not.toBeInTheDocument()
  })

  it('scrolls without animation when the driver asks for reduced motion', async () => {
    showOnScreen('desktop', true)
    render(<SectionWithMap />)

    await userEvent.click(screen.getByRole('button', { name: 'Pick on the map' }))

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' })
  })

  it('does not jump the page when the driver picks a checkpoint in the list itself', async () => {
    showOnScreen('desktop')
    render(<SectionWithMap />)

    await userEvent.click(screen.getByRole('button', { name: /Mile 25/ }))

    expect(screen.getByRole('button', { name: /Mile 25/ })).toHaveAttribute('aria-current', 'true')
    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(screen.queryByText('Checkpoint at mile 25 selected')).not.toBeInTheDocument()
  })
})
