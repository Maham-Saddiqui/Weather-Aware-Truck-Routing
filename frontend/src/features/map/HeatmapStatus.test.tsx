import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeHeatmapOfRisks } from '../../shared/testing/fixtures'
import { HeatmapStatus } from './HeatmapStatus'

const ZONE = 'America/Chicago'

describe('HeatmapStatus words what the heatmap shows at the chosen hour (REQ-09, RR-28, FE-09)', () => {
  it('says all clear when the worst digit is Low, because Low is only a faint tint', () => {
    render(<HeatmapStatus heatmap={makeHeatmapOfRisks('0', '0')} hourOffset={0} timeZone={ZONE} />)

    expect(screen.getByRole('status')).toHaveTextContent('Along the routes: all clear')
  })

  it.each([
    ['1', 'Moderate'],
    ['2', 'High'],
    ['3', 'Severe'],
    ['4', 'No Travel'],
  ])('names the worst level with its word for digit %s (FE-07)', (digit, word) => {
    render(
      <HeatmapStatus heatmap={makeHeatmapOfRisks('0', digit)} hourOffset={0} timeZone={ZONE} />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(`Along the routes: worst ${word}`)
  })

  it('says there is no weather data when every point is missing at that hour (RR-11)', () => {
    render(<HeatmapStatus heatmap={makeHeatmapOfRisks('x', 'x')} hourOffset={0} timeZone={ZONE} />)

    expect(screen.getByRole('status')).toHaveTextContent('Along the routes: no weather data')
  })

  it('reads the digit of the chosen hour, not the first one', () => {
    render(<HeatmapStatus heatmap={makeHeatmapOfRisks('02')} hourOffset={1} timeZone={ZONE} />)

    expect(screen.getByRole('status')).toHaveTextContent('Along the routes: worst High')
  })
})

describe('HeatmapStatus says it is about the corridor at a clock hour, not the truck (REQ-09, RR-28)', () => {
  it('shows the chosen clock hour with its zone beside the worst level', () => {
    render(<HeatmapStatus heatmap={makeHeatmapOfRisks('01')} hourOffset={1} timeZone={ZONE} />)

    expect(screen.getByText('Along the routes at Thu 09:00 CT: worst Moderate')).toBeVisible()
  })

  it('shows all clear with the clock hour', () => {
    render(<HeatmapStatus heatmap={makeHeatmapOfRisks('0')} hourOffset={0} timeZone={ZONE} />)

    expect(screen.getByText('Along the routes at Thu 08:00 CT: all clear')).toBeVisible()
  })
})

describe('HeatmapStatus shows the server aggregate (GEN-03)', () => {
  it('words the worst_level_by_hour character, never a level worked out from the points', () => {
    const heatmap = { ...makeHeatmapOfRisks('0'), worst_level_by_hour: '3'.repeat(49) }

    render(<HeatmapStatus heatmap={heatmap} hourOffset={0} timeZone={ZONE} />)

    expect(screen.getByRole('status')).toHaveTextContent('Along the routes: worst Severe')
  })
})

describe('HeatmapStatus live region (FE-07: announce changes, never spam)', () => {
  it('is a status region that does not change while the words stay the same', () => {
    const heatmap = makeHeatmapOfRisks('0012')
    const { rerender } = render(<HeatmapStatus heatmap={heatmap} hourOffset={0} timeZone={ZONE} />)
    const observer = new MutationObserver(() => undefined)
    observer.observe(screen.getByRole('status'), {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    })

    rerender(<HeatmapStatus heatmap={heatmap} hourOffset={1} timeZone={ZONE} />)
    expect(observer.takeRecords()).toHaveLength(0)

    rerender(<HeatmapStatus heatmap={heatmap} hourOffset={2} timeZone={ZONE} />)
    expect(observer.takeRecords().length).toBeGreaterThan(0)
    expect(screen.getByRole('status')).toHaveTextContent('Along the routes: worst Moderate')
    observer.disconnect()
  })
})
