import { ThemeProvider } from '@mui/material/styles'
import ListItemButton from '@mui/material/ListItemButton'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ACCENT_TURQUOISE, RISK_COLOURS, ROUTE_CASING_COLOUR } from '../shared/colours'
import { INPUT_BORDER, NAVY_BACKGROUND, NAVY_RAISED, NAVY_SURFACE, theme } from './theme'

describe('keyboard focus (NFR-03, FE-07)', () => {
  it('keeps the translucent default for the focused row background, not solid turquoise', () => {
    expect(theme.palette.action.focus).not.toBe(theme.palette.primary.main)
  })

  it('draws a turquoise outline around the keyboard-focused control', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ListItemButton>Mile 25</ListItemButton>
      </ThemeProvider>,
    )

    await userEvent.tab()

    const row = screen.getByRole('button', { name: 'Mile 25' })
    expect(row).toHaveFocus()
    const outline = getComputedStyle(row)
    expect(outline.outlineStyle).toBe('solid')
    expect(outline.outlineColor).toBe('rgb(45, 212, 191)')
  })
})

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0)
}

function contrast(first: string, second: string): number {
  const [lighter = 0, darker = 0] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

function hueDegrees(hex: string): number {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map(
    (start) => parseInt(hex.slice(start, start + 2), 16) / 255,
  )
  const degrees =
    (Math.atan2(Math.sqrt(3) * (green - blue), 2 * red - green - blue) * 180) / Math.PI
  return (degrees + 360) % 360
}

describe('text box outlines (NFR-03, WCAG 1.4.11)', () => {
  it.each([
    ['the page', NAVY_BACKGROUND],
    ['a panel', NAVY_SURFACE],
    ['a raised card', NAVY_RAISED],
  ])('has at least 3:1 against %s', (_name, surface) => {
    expect(contrast(INPUT_BORDER, surface)).toBeGreaterThanOrEqual(3)
  })

  it('has at least 3:1 for the focused outline on a panel', () => {
    expect(contrast(theme.palette.primary.main, NAVY_SURFACE)).toBeGreaterThanOrEqual(3)
  })

  it('is applied by the theme to ordinary text boxes and to the date picker box', () => {
    const textBox = theme.components?.MuiOutlinedInput?.styleOverrides?.notchedOutline
    const pickerBox = theme.components?.MuiPickersOutlinedInput?.styleOverrides?.notchedOutline

    expect(textBox).toEqual({ borderColor: INPUT_BORDER })
    expect(pickerBox).toEqual({ borderColor: INPUT_BORDER })
  })
})

describe('risk palette (FE-09)', () => {
  it('takes the risk colours from the shared scale the map also uses', () => {
    expect(theme.palette.risk).toEqual(RISK_COLOURS)
  })
})

describe('map zoom buttons (NFR-03)', () => {
  it('are at least 44 px wide and tall on touch screens and phone-width windows', () => {
    const rules = theme.components?.MuiCssBaseline?.styleOverrides as Record<string, unknown>
    const touch = rules['@media (pointer: coarse), (max-width: 719.95px)'] as Record<
      string,
      Record<string, number>
    >

    expect(touch['.maplibregl-map .maplibregl-ctrl-group button']).toEqual({
      width: 44,
      height: 44,
    })
  })
})

describe('route palette (FE-15)', () => {
  it('gives each of the three routes its own hue, none of them a risk colour', () => {
    const hues = theme.palette.route

    expect(new Set(hues).size).toBe(3)
    expect(hues.filter((hue) => Object.values(RISK_COLOURS).includes(hue))).toEqual([])
  })

  it('keeps every route hue at least 3:1 against the dark basemap', () => {
    const faint = theme.palette.route.filter((hue) => contrast(hue, ROUTE_CASING_COLOUR) < 3)

    expect(faint).toEqual([])
  })

  it('keeps every route hue out of the turquoise family of the interface accent', () => {
    const turquoiseHue = hueDegrees(ACCENT_TURQUOISE)

    const lookalikes = theme.palette.route.filter(
      (hue) => Math.abs(hueDegrees(hue) - turquoiseHue) < 30,
    )

    expect(lookalikes).toEqual([])
  })
})

describe('reduced motion (NFR-03)', () => {
  it('shortens animations and transitions when the visitor asks for less motion', () => {
    const rules = theme.components?.MuiCssBaseline?.styleOverrides as Record<string, unknown>
    const reduced = rules['@media (prefers-reduced-motion: reduce)'] as Record<
      string,
      Record<string, string>
    >

    expect(reduced['*, *::before, *::after']).toMatchObject({
      animationDuration: '0.01ms !important',
      transitionDuration: '0.01ms !important',
    })
  })
})
