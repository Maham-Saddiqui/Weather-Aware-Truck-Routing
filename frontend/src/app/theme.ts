import { createTheme } from '@mui/material/styles'
import type {} from '@mui/x-date-pickers/themeAugmentation'
import { ACCENT_TURQUOISE, RISK_COLOURS, ROUTE_HUES } from '../shared/colours'
import { MIN_TOUCH_TARGET_PX } from '../shared/constants'
import type { CheckpointLevel } from '../shared/types'

declare module '@mui/material/styles' {
  interface Palette {
    risk: Record<CheckpointLevel, string>
    route: readonly string[]
  }
  interface PaletteOptions {
    risk?: Record<CheckpointLevel, string>
    route?: readonly string[]
  }
}

export const NAVY_BACKGROUND = '#0a1524'
export const NAVY_SURFACE = '#101f33'
export const NAVY_RAISED = '#172b45'
const TEXT_PRIMARY = '#e9eff7'
const TEXT_SECONDARY = '#a3b4c8'
// WCAG 1.4.11: the edge that identifies a text box needs 3:1 against every surface a field can sit on.
export const INPUT_BORDER = '#6b7f99'
const BORDER = 'rgba(163, 180, 200, 0.2)'
const ACCENT_LIGHT = '#5eead4'
const ACCENT_DARK = '#14b8a6'
const SURFACE_SHADOW = '0 1px 2px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(0, 0, 0, 0.18)'
const TRANSITION = 'background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease'

const MAP = '.maplibregl-map'
const MAP_CONTROLS = {
  [`${MAP} .maplibregl-ctrl-group`]: {
    backgroundColor: NAVY_SURFACE,
    border: `1px solid ${BORDER}`,
    boxShadow: SURFACE_SHADOW,
  },
  [`${MAP} .maplibregl-ctrl-group button + button`]: { borderTopColor: BORDER },
  [`${MAP} .maplibregl-ctrl-group button:hover`]: { backgroundColor: NAVY_RAISED },
  [`${MAP} .maplibregl-ctrl-group .maplibregl-ctrl-icon`]: { filter: 'invert(1)' },
  [`${MAP} .maplibregl-ctrl-attrib`]: {
    backgroundColor: 'rgba(10, 21, 36, 0.8)',
    color: TEXT_SECONDARY,
    fontSize: '0.6875rem',
  },
  [`${MAP} .maplibregl-ctrl-attrib a`]: { color: TEXT_SECONDARY },
  '@media (pointer: coarse)': {
    [`${MAP} .maplibregl-ctrl-group button`]: {
      width: MIN_TOUCH_TARGET_PX,
      height: MIN_TOUCH_TARGET_PX,
    },
  },
}

const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)'

export const theme = createTheme({
  breakpoints: { values: { xs: 0, sm: 600, md: 720, lg: 1100, xl: 1536 } },
  palette: {
    mode: 'dark',
    background: { default: NAVY_BACKGROUND, paper: NAVY_SURFACE },
    primary: {
      main: ACCENT_TURQUOISE,
      light: ACCENT_LIGHT,
      dark: ACCENT_DARK,
      contrastText: NAVY_BACKGROUND,
    },
    text: { primary: TEXT_PRIMARY, secondary: TEXT_SECONDARY },
    divider: BORDER,
    risk: RISK_COLOURS,
    route: ROUTE_HUES,
  },
  focusVisible: true,
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
        ...MAP_CONTROLS,
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
      styleOverrides: {
        root: { backgroundColor: NAVY_RAISED, boxShadow: SURFACE_SHADOW, transition: TRANSITION },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: MIN_TOUCH_TARGET_PX,
          transition: TRANSITION,
          '&.MuiButton-containedPrimary': {
            fontWeight: 700,
            '&:hover': { backgroundColor: ACCENT_LIGHT },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { minWidth: MIN_TOUCH_TARGET_PX, minHeight: MIN_TOUCH_TARGET_PX } },
    },
    MuiToggleButton: {
      styleOverrides: { root: { minWidth: MIN_TOUCH_TARGET_PX, minHeight: MIN_TOUCH_TARGET_PX } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          [theme.breakpoints.down('sm')]: {
            margin: 16,
            width: 'calc(100% - 32px)',
            maxWidth: 'calc(100% - 32px)',
          },
        }),
      },
    },
    MuiTableCell: { styleOverrides: { sizeSmall: { padding: '6px 8px' } } },
    MuiOutlinedInput: { styleOverrides: { notchedOutline: { borderColor: INPUT_BORDER } } },
    MuiPickersOutlinedInput: { styleOverrides: { notchedOutline: { borderColor: INPUT_BORDER } } },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
})
