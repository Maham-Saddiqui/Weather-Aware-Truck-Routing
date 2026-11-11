import { styled } from '@mui/material/styles'
import Skeleton from '@mui/material/Skeleton'
import { Suspense, useState } from 'react'
import { MAP_MIN_HEIGHT_PX, PHONE_MAP_HEIGHT_PX } from '../shared/constants'
import { EmptyMapCard } from './EmptyMapCard'
import { heatmapSliderFor } from './heatmapSliderFor'
import { MapPane } from './MapPane'
import type { TripPlannerState } from './useTripPlanner'

const SLIDER_HEIGHT_PX = 40
// On a phone the map takes this share of the visible height (never less than the fixed minimum) and stays pinned
// at the top of the screen while the slider and the results scroll underneath it.
const PHONE_MAP_VIEWPORT_SHARE_PERCENT = 45
const PHONE_MAP_LAYER = 2

// On a phone the area dissolves, so the pinned map belongs to the whole page column and not just to this wrapper.
const MapArea = styled('div')(({ theme }) => ({
  display: 'contents',
  [theme.breakpoints.up('md')]: {
    display: 'block',
    position: 'relative',
    minHeight: MAP_MIN_HEIGHT_PX,
  },
}))

const MapFrame = styled('div')(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: PHONE_MAP_LAYER,
  height: `max(${String(PHONE_MAP_VIEWPORT_SHARE_PERCENT)}svh, ${String(PHONE_MAP_HEIGHT_PX)}px)`,
  [theme.breakpoints.up('md')]: {
    position: 'absolute',
    inset: 0,
    zIndex: 'auto',
    height: 'auto',
  },
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
    boxShadow: theme.shadows[6],
  },
}))

// Owns the hour so a slider tick redraws only the heatmap, the legend line and the slider, not the form or the results (FE-08).
export function MapWithSlider({ planner }: { planner: TripPlannerState }) {
  const runId = planner.run?.runId
  const [hourOffset, setHourOffset] = useState(0)
  const [shownRunId, setShownRunId] = useState(runId)
  if (shownRunId !== runId) {
    setShownRunId(runId)
    setHourOffset(0)
  }
  const slider = heatmapSliderFor(planner, hourOffset, setHourOffset)
  return (
    <MapArea>
      <MapFrame>
        <MapPane planner={planner} hourOffset={hourOffset} />
        {planner.results.phase === 'idle' && <EmptyMapCard />}
      </MapFrame>
      {slider !== null && (
        <SliderDock>
          <Suspense fallback={<Skeleton variant="rounded" height={SLIDER_HEIGHT_PX} />}>
            {slider}
          </Suspense>
        </SliderDock>
      )}
    </MapArea>
  )
}
