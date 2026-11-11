import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/Providers'
import { makeRoute } from '../../shared/testing/fixtures'
import { CheckpointSection } from './CheckpointSection'

function showOnScreen(width: 'phone' | 'desktop') {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: width === 'phone' && query.includes('max-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

function renderSection(selectedCheckpointIndex: number | null = null) {
  const route = makeRoute('route-a')
  const view = (index: number | null) => (
    <Providers>
      <CheckpointSection
        route={route}
        routeNumber={1}
        selectedCheckpointIndex={index}
        onSelectCheckpoint={vi.fn()}
      />
    </Providers>
  )
  const { rerender } = render(view(selectedCheckpointIndex))
  const selectCheckpoint = (index: number) => {
    rerender(view(index))
  }
  return { selectCheckpoint, route }
}

const toggle = () => screen.getByRole('button', { name: /Checkpoints on Route 1/ })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the checkpoint section folds away (REQ-08, REQ-12, NFR-04)', () => {
  it('is closed on a phone and says how many checkpoints are inside', () => {
    showOnScreen('phone')
    const { route } = renderSection()

    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(toggle()).toHaveTextContent(`${String(route.checkpoints.length)} checkpoints`)
    expect(screen.queryByRole('list', { name: 'Checkpoints' })).not.toBeInTheDocument()
  })

  it('is open on a wide screen', () => {
    showOnScreen('desktop')
    renderSection()

    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('list', { name: 'Checkpoints' })).toBeInTheDocument()
  })

  it('opens and closes with the heading button and keeps aria-expanded true to what is shown', async () => {
    showOnScreen('phone')
    renderSection()

    await userEvent.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('list', { name: 'Checkpoints' })).toBeInTheDocument()

    await userEvent.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list', { name: 'Checkpoints' })).not.toBeInTheDocument()
  })
})
