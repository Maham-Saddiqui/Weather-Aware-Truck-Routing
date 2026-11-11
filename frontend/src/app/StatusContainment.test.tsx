import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HeatmapStatus } from '../features/map'
import { HEATMAP } from '../shared/testing/fixtures'
import { ErrorBoundary } from './ErrorBoundary'

describe('a broken forecast status stays contained (NFR-04, FE-12)', () => {
  it('disappears instead of replacing the page with an error when the server field is missing', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const heatmapWithoutField = { ...HEATMAP, worst_level_by_hour: undefined as unknown as string }

    render(
      <div>
        <p>The rest of the page</p>
        <ErrorBoundary area="the forecast status" fallback={<></>}>
          <HeatmapStatus heatmap={heatmapWithoutField} hourOffset={0} timeZone="America/Chicago" />
        </ErrorBoundary>
      </div>,
    )

    expect(screen.getByText('The rest of the page')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    consoleError.mockRestore()
  })
})
