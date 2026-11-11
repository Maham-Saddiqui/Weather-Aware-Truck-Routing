import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HeatmapLayer } from './HeatmapLayer'
import { HEATMAP_FADE_MS } from './mapConstants'
import { heatmapFromCheckpoints, TWO_ROUTES } from './routeFixtures'

const sourceData = vi.fn()
const layerPaint = vi.fn()

function latestPaints() {
  return layerPaint.mock.calls.slice(-2).map(([paint]) => paint as Record<string, unknown>)
}

vi.mock('@vis.gl/react-maplibre', () => ({
  Source: ({ data, children }: { data: unknown; children: ReactNode }) => {
    sourceData(data)
    return <>{children}</>
  },
  Layer: ({ paint }: { paint: unknown }) => {
    layerPaint(paint)
    return null
  },
}))

beforeEach(() => {
  sourceData.mockClear()
  layerPaint.mockClear()
})

describe('HeatmapLayer (REQ-09, RR-28, FE-08: the slider changes paint properties only)', () => {
  const heatmap = heatmapFromCheckpoints(TWO_ROUTES)

  it('keeps the very same source data when only the hour changes', () => {
    const { rerender } = render(<HeatmapLayer heatmap={heatmap} hourOffset={0} />)
    rerender(<HeatmapLayer heatmap={heatmap} hourOffset={17} />)

    expect(sourceData.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(sourceData.mock.calls.at(-1)?.[0]).toBe(sourceData.mock.calls[0]?.[0])
  })

  it('shows the new hour on the layer that was hidden and hides the one that showed the old hour', () => {
    const { rerender } = render(<HeatmapLayer heatmap={heatmap} hourOffset={0} />)
    rerender(<HeatmapLayer heatmap={heatmap} hourOffset={17} />)

    const [firstLayer, secondLayer] = latestPaints()

    expect(firstLayer?.['circle-opacity']).toBe(0)
    expect(secondLayer?.['circle-opacity']).toBe(1)
    expect(JSON.stringify(secondLayer?.['circle-color'])).toContain(
      '["slice",["get","risk"],17,18]',
    )
    expect(JSON.stringify(firstLayer?.['circle-color'])).toContain('["slice",["get","risk"],0,1]')
  })

  it('fades the glow over a fraction of a second so an hour change is not a jump', () => {
    render(<HeatmapLayer heatmap={heatmap} hourOffset={0} />)

    expect(latestPaints()[0]?.['circle-opacity-transition']).toEqual({ duration: HEATMAP_FADE_MS })
  })

  it('draws the radius and blur identically on both layers', () => {
    render(<HeatmapLayer heatmap={heatmap} hourOffset={3} />)

    const [first, second] = latestPaints()

    expect(second?.['circle-radius']).toEqual(first?.['circle-radius'])
    expect(second?.['circle-blur']).toBe(first?.['circle-blur'])
  })
})
