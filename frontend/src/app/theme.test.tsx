import { ThemeProvider } from '@mui/material/styles'
import ListItemButton from '@mui/material/ListItemButton'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RISK_COLOURS } from '../shared/colours'
import { theme } from './theme'

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

describe('risk palette (FE-09)', () => {
  it('takes the risk colours from the shared scale the map also uses', () => {
    expect(theme.palette.risk).toEqual(RISK_COLOURS)
  })
})
