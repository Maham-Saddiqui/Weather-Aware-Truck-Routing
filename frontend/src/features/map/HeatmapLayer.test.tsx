import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HeatmapLayer } from './HeatmapLayer'
import { heatmapFromCheckpoints, TWO_ROUTES } from './routeFixtures'

const sourceData = vi.fn()
const layerPaint = vi.fn()

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

describe('HeatmapLayer (REQ-09, RR-28, FE-08: the slider changes one paint property)', () => {
  const heatmap = heatmapFromCheckpoints(TWO_ROUTES)

  it('keeps the very same source data when only the hour changes', () => {
    const { rerender } = render(<HeatmapLayer heatmap={heatmap} hourOffset={0} />)
    rerender(<HeatmapLayer heatmap={heatmap} hourOffset={17} />)

    expect(sourceData).toHaveBeenCalledTimes(2)
    expect(sourceData.mock.calls[1]?.[0]).toBe(sourceData.mock.calls[0]?.[0])
  })

  it('changes only the circle colour, which reads character h of each risk string', () => {
    const { rerender } = render(<HeatmapLayer heatmap={heatmap} hourOffset={0} />)
    rerender(<HeatmapLayer heatmap={heatmap} hourOffset={17} />)

    const [first, second] = layerPaint.mock.calls.map(([paint]) => paint as Record<string, unknown>)

    expect(second?.['circle-radius']).toEqual(first?.['circle-radius'])
    expect(second?.['circle-blur']).toBe(first?.['circle-blur'])
    expect(second?.['circle-color']).not.toEqual(first?.['circle-color'])
    expect(JSON.stringify(second?.['circle-color'])).toContain('["slice",["get","risk"],17,18]')
  })
})
