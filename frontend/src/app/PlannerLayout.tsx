import { styled, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useId } from 'react'
import type { ReactNode } from 'react'
import { PanelToggle } from './PanelToggle'
import {
  PANEL_SLIDE_MS,
  PANEL_WIDTH_DESKTOP_PX,
  PANEL_WIDTH_TABLET_PX,
  PANEL_WIDTH_VARIABLE,
} from './panelWidth'
import { usePanelCollapse } from './usePanelCollapse'

const Workspace = styled('main', { shouldForwardProp: (name) => name !== 'isCollapsed' })<{
  isCollapsed: boolean
}>(({ theme, isCollapsed }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  [theme.breakpoints.up('md')]: {
    [PANEL_WIDTH_VARIABLE]: `${String(PANEL_WIDTH_TABLET_PX)}px`,
    display: 'grid',
    gridTemplateRows: 'minmax(0, 1fr)',
    gridTemplateColumns: `${isCollapsed ? '0px' : `var(${PANEL_WIDTH_VARIABLE})`} minmax(0, 1fr)`,
    transition: `grid-template-columns ${String(PANEL_SLIDE_MS)}ms ease`,
  },
  [theme.breakpoints.up('lg')]: {
    [PANEL_WIDTH_VARIABLE]: `${String(PANEL_WIDTH_DESKTOP_PX)}px`,
  },
}))

const Panel = styled('div')(({ theme }) => ({
  display: 'contents',
  [theme.breakpoints.up('md')]: {
    display: 'block',
    minWidth: 0,
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
  },
}))

// Keeps its full width while the panel slides, so the contents are clipped instead of squeezed.
const PanelBody = styled('div')(({ theme }) => ({
  display: 'contents',
  [theme.breakpoints.up('md')]: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    boxSizing: 'border-box',
    width: `var(${PANEL_WIDTH_VARIABLE})`,
    height: '100%',
    overflowY: 'auto',
    padding: theme.spacing(2),
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
  arrival: string | null
}

// On a phone the map sits between the form and the results; the page order follows what is on screen (WCAG 2.4.3).
// Only beside the map can the panel be hidden: on a phone the map is already pinned above the results.
export function PlannerLayout({ form, results, map, arrival }: PlannerLayoutProps) {
  const isPhone = useMediaQuery(useTheme().breakpoints.down('md'))
  const panelId = useId()
  const panel = usePanelCollapse(arrival)
  const isHidden = panel.isCollapsed && !isPhone
  const resultsSlot = <Slot aria-label="Route results">{results}</Slot>
  return (
    <Workspace isCollapsed={isHidden}>
      <Panel id={panelId} inert={isHidden}>
        <PanelBody>
          <Slot aria-label="Trip details">{form}</Slot>
          {!isPhone && resultsSlot}
        </PanelBody>
      </Panel>
      {!isPhone && <PanelToggle isCollapsed={isHidden} panelId={panelId} onToggle={panel.toggle} />}
      {map}
      {isPhone && resultsSlot}
    </Workspace>
  )
}
