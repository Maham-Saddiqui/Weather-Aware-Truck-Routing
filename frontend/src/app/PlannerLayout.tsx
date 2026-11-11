import { styled, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { ReactNode } from 'react'

const PANEL_WIDTH_TABLET_PX = 340
const PANEL_WIDTH_DESKTOP_PX = 460

const Workspace = styled('main')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  [theme.breakpoints.up('md')]: {
    display: 'grid',
    gridTemplateRows: 'minmax(0, 1fr)',
    gridTemplateColumns: `${String(PANEL_WIDTH_TABLET_PX)}px minmax(0, 1fr)`,
  },
  [theme.breakpoints.up('lg')]: {
    gridTemplateColumns: `${String(PANEL_WIDTH_DESKTOP_PX)}px minmax(0, 1fr)`,
  },
}))

const Panel = styled('div')(({ theme }) => ({
  display: 'contents',
  [theme.breakpoints.up('md')]: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    minHeight: 0,
    overflowY: 'auto',
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}))

const Slot = styled('section')(({ theme }) => ({
  padding: theme.spacing(2),
  [theme.breakpoints.up('md')]: { padding: 0 },
}))

interface PlannerLayoutProps {
  form: ReactNode
  results: ReactNode
  map: ReactNode
}

// On a phone the map sits between the form and the results; the page order follows what is on screen (WCAG 2.4.3).
export function PlannerLayout({ form, results, map }: PlannerLayoutProps) {
  const isPhone = useMediaQuery(useTheme().breakpoints.down('md'))
  const resultsSlot = <Slot aria-label="Route results">{results}</Slot>
  return (
    <Workspace>
      <Panel>
        <Slot aria-label="Trip details">{form}</Slot>
        {!isPhone && resultsSlot}
      </Panel>
      {map}
      {isPhone && resultsSlot}
    </Workspace>
  )
}
