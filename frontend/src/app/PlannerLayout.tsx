import { styled } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { PHONE_MAP_HEIGHT_PX } from '../shared/constants'

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

const FormSlot = styled('section')(({ theme }) => ({
  order: 1,
  padding: theme.spacing(2),
  [theme.breakpoints.up('md')]: { order: 0, padding: 0 },
}))

const ResultsSlot = styled('section')(({ theme }) => ({
  order: 3,
  padding: theme.spacing(2),
  [theme.breakpoints.up('md')]: { order: 0, padding: 0 },
}))

const MapArea = styled('div')(({ theme }) => ({
  order: 2,
  position: 'relative',
  [theme.breakpoints.up('md')]: { order: 0, minHeight: 0 },
}))

const MapFrame = styled('div')(({ theme }) => ({
  height: PHONE_MAP_HEIGHT_PX,
  [theme.breakpoints.up('md')]: { position: 'absolute', inset: 0, height: 'auto' },
}))

const SliderDock = styled('div')(({ theme }) => ({
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.background.paper,
  [theme.breakpoints.up('md')]: {
    position: 'absolute',
    left: theme.spacing(2),
    right: theme.spacing(2),
    bottom: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
  },
}))

interface PlannerLayoutProps {
  form: ReactNode
  results: ReactNode
  map: ReactNode
  slider: ReactNode | null
}

export function PlannerLayout({ form, results, map, slider }: PlannerLayoutProps) {
  return (
    <Workspace>
      <Panel>
        <FormSlot aria-label="Trip details">{form}</FormSlot>
        <ResultsSlot aria-label="Route results">{results}</ResultsSlot>
      </Panel>
      <MapArea>
        <MapFrame>{map}</MapFrame>
        {slider !== null && <SliderDock>{slider}</SliderDock>}
      </MapArea>
    </Workspace>
  )
}
