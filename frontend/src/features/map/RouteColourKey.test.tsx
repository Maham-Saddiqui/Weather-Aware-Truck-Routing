import { ThemeProvider } from '@mui/material/styles'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { theme } from '../../app/theme'
import { MapOverlayTopLeft } from './MapOverlayTopLeft'
import { NAMES_HIDDEN_BELOW_MAP_WIDTH_PX } from './mapConstants'
import { RouteColourKey } from './RouteColourKey'

function rgb(hex: string): string {
  const [red, green, blue] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
  return `rgb(${String(red)}, ${String(green)}, ${String(blue)})`
}

function inTheme(element: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{element}</ThemeProvider>)
}

describe('the phone colour key links each line colour to its route card (REQ-08, NFR-04)', () => {
  it('names each route that exists, in order', () => {
    inTheme(<RouteColourKey routeCount={3} />)

    const key = screen.getByLabelText('Route colours')

    expect(
      within(key)
        .getAllByRole('listitem', { hidden: true })
        .map((item) => item.textContent),
    ).toEqual(['Route 1', 'Route 2', 'Route 3'])
  })

  it('names only two routes when the trip has two', () => {
    inTheme(<RouteColourKey routeCount={2} />)

    expect(screen.queryByText('Route 3')).not.toBeInTheDocument()
  })

  it('draws each swatch in the hue the line and the card use', () => {
    inTheme(<RouteColourKey routeCount={3} />)

    const swatches = screen
      .getAllByRole('listitem', { hidden: true })
      .map((item) => getComputedStyle(item.firstElementChild ?? item).backgroundColor)

    expect(swatches).toEqual(theme.palette.route.map(rgb))
  })

  it('is shown only when the map is no wider than the pill breakpoint, where the pills are gone', () => {
    inTheme(<RouteColourKey routeCount={3} />)

    const rules = Array.from(document.querySelectorAll('style'), (style) => style.textContent).join(
      '',
    )

    expect(rules).toContain(`@container (max-width: ${String(NAMES_HIDDEN_BELOW_MAP_WIDTH_PX)}px)`)
    expect(getComputedStyle(screen.getByLabelText('Route colours')).display).toBe('none')
  })
})

describe('the top-left map overlay keeps the key clear of the legend (NFR-04)', () => {
  it('stacks the key under the legend in one column', () => {
    inTheme(<MapOverlayTopLeft routeCount={3} />)

    const legend = screen.getByRole('region', { name: 'Risk legend' })
    const key = screen.getByLabelText('Route colours')

    expect(legend.parentElement).toBe(key.parentElement)
    expect(legend.nextElementSibling).toBe(key)
  })

  it('has no key when there is only one route to tell apart', () => {
    inTheme(<MapOverlayTopLeft routeCount={1} />)

    expect(screen.queryByLabelText('Route colours')).not.toBeInTheDocument()
  })
})
