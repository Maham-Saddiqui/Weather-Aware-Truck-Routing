import { createTheme } from '@mui/material/styles'
import { MIN_TOUCH_TARGET_PX } from '../shared/constants'
import type { CheckpointLevel } from '../shared/types'

declare module '@mui/material/styles' {
  interface Palette {
    risk: Record<CheckpointLevel, string>
  }
  interface PaletteOptions {
    risk?: Record<CheckpointLevel, string>
  }
}

const NAVY_BACKGROUND = '#0a1524'
const NAVY_SURFACE = '#101f33'
const NAVY_RAISED = '#172b45'
const TURQUOISE = '#2dd4bf'
const TEXT_PRIMARY = '#e9eff7'
const TEXT_SECONDARY = '#a3b4c8'
const BORDER = 'rgba(163, 180, 200, 0.2)'

const RISK_PALETTE: Record<CheckpointLevel, string> = {
  low: '#4ade80',
  moderate: '#facc15',
  high: '#fb923c',
  severe: '#f87171',
  no_travel: '#c084fc',
  no_data: '#94a3b8',
}

const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)'

export const theme = createTheme({
  breakpoints: { values: { xs: 0, sm: 600, md: 720, lg: 1100, xl: 1536 } },
  palette: {
    mode: 'dark',
    background: { default: NAVY_BACKGROUND, paper: NAVY_SURFACE },
    primary: { main: TURQUOISE, contrastText: NAVY_BACKGROUND },
    text: { primary: TEXT_PRIMARY, secondary: TEXT_SECONDARY },
    divider: BORDER,
    risk: RISK_PALETTE,
    action: { focus: TURQUOISE },
  },
  shape: { borderRadius: 10 },
  spacing: 8,
  typography: {
    fontFamily: '"DM Sans", system-ui, sans-serif',
    h1: { fontSize: '1.25rem', fontWeight: 700 },
    h2: { fontSize: '1.125rem', fontWeight: 700 },
    h3: { fontSize: '1rem', fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
    caption: { fontSize: '0.8125rem' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' },
        [REDUCED_MOTION]: {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { backgroundColor: NAVY_RAISED } },
    },
    MuiButton: { styleOverrides: { root: { minHeight: MIN_TOUCH_TARGET_PX } } },
    MuiIconButton: {
      styleOverrides: { root: { minWidth: MIN_TOUCH_TARGET_PX, minHeight: MIN_TOUCH_TARGET_PX } },
    },
    MuiToggleButton: {
      styleOverrides: { root: { minWidth: MIN_TOUCH_TARGET_PX, minHeight: MIN_TOUCH_TARGET_PX } },
    },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
})
