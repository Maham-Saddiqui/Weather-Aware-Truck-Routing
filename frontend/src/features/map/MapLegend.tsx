import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import { styled, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import Typography from '@mui/material/Typography'
import { useId, useState } from 'react'
import { LEVEL_LABELS, LEVEL_ORDER } from '../../shared/risk'
import type { Heatmap } from '../../shared/types'
import { worstLevelAtHour } from './heatmapPaint'
import { LegendItem } from './LegendItem'

interface MapLegendProps {
  heatmap: Heatmap | null
  hourOffset: number
}

function heatmapSummary(heatmap: Heatmap, hourOffset: number): string {
  const worstLevel = worstLevelAtHour(heatmap, hourOffset)
  return worstLevel === null
    ? 'Heatmap: no data at this hour'
    : `Heatmap now: worst ${LEVEL_LABELS[worstLevel]}`
}

const Panel = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  left: theme.spacing(1),
  maxWidth: `calc(100% - ${theme.spacing(8)})`,
  padding: theme.spacing(0.5, 1),
  backgroundColor: theme.palette.background.paper,
}))

const Items = styled('ul')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  flex: 1,
  gap: theme.spacing(0, 1.5),
  margin: 0,
  padding: theme.spacing(0.5, 0),
  listStyle: 'none',
}))

// Kept in the page when folded away so the live status is still announced.
const Notes = styled('div', { shouldForwardProp: (name) => name !== 'isShown' })<{
  isShown: boolean
}>(({ isShown }) =>
  isShown
    ? {}
    : {
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clipPath: 'inset(50%)',
        whiteSpace: 'nowrap',
      },
)

export function MapLegend({ heatmap, hourOffset }: MapLegendProps) {
  const isPhone = useMediaQuery(useTheme().breakpoints.down('md'))
  const [isOpen, setIsOpen] = useState(false)
  const notesId = useId()
  return (
    <Panel role="region" aria-label="Risk legend" elevation={3}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Items>
          {LEVEL_ORDER.map((level) => (
            <LegendItem key={level} level={level} />
          ))}
        </Items>
        {isPhone && (
          <IconButton
            size="small"
            aria-label="Legend details"
            aria-expanded={isOpen}
            aria-controls={notesId}
            onClick={() => {
              setIsOpen((wasOpen) => !wasOpen)
            }}
          >
            {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        )}
      </Stack>
      <Notes id={notesId} isShown={!isPhone || isOpen}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Grey on the map means no weather data.
        </Typography>
        {heatmap && (
          <Typography variant="caption" role="status" sx={{ display: 'block' }}>
            {heatmapSummary(heatmap, hourOffset)}
          </Typography>
        )}
      </Notes>
    </Panel>
  )
}
