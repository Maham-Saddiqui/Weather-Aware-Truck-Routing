import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { LEVEL_ICONS, LEVEL_LABELS, LEVEL_ORDER } from '../../shared/risk'
import type { CheckpointLevel, Route } from '../../shared/types'

type MilesByLevel = Route['summary']['miles_by_level']

const Bar = styled('div')(({ theme }) => ({
  display: 'flex',
  height: theme.spacing(1.5),
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.divider,
}))

const Segment = styled('span', {
  shouldForwardProp: (name) => name !== 'level' && name !== 'miles',
})<{ level: CheckpointLevel; miles: string }>(({ theme, level, miles }) => ({
  flex: `${miles} 1 0%`,
  minWidth: 0,
  backgroundColor: theme.palette.risk[level],
}))

const Legend = styled('ul')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: theme.spacing(0.5, 1),
  margin: theme.spacing(1, 0, 0),
  padding: 0,
  listStyle: 'none',
}))

const LegendItem = styled('li', { shouldForwardProp: (name) => name !== 'level' })<{
  level: CheckpointLevel
}>(({ theme, level }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  color: theme.palette.risk[level],
}))

// The server writes zero miles as "0", "0.0" and so on; such levels are left out unless the driver asks for all of them.
const ZERO_MILES = /^0(\.0*)?$/

function levelsToShow(milesByLevel: MilesByLevel, showsAll: boolean) {
  const withMiles = LEVEL_ORDER.filter((level) => !ZERO_MILES.test(milesByLevel[level]))
  return showsAll || withMiles.length === 0 ? LEVEL_ORDER : withMiles
}

export function MilesBar({ milesByLevel }: { milesByLevel: MilesByLevel }) {
  const [showsAll, setShowsAll] = useState(false)
  return (
    <Box>
      <Bar aria-hidden>
        {LEVEL_ORDER.map((level) => (
          <Segment key={level} level={level} miles={milesByLevel[level]} />
        ))}
      </Bar>
      <Legend aria-label="Miles at each risk level">
        {levelsToShow(milesByLevel, showsAll).map((level) => {
          const Icon = LEVEL_ICONS[level]
          return (
            <LegendItem key={level} level={level}>
              <Icon fontSize="inherit" aria-hidden />
              <Typography variant="caption" color="text.primary">
                {LEVEL_LABELS[level]} {milesByLevel[level]} mi
              </Typography>
            </LegendItem>
          )
        })}
      </Legend>
      <Button
        size="small"
        aria-expanded={showsAll}
        onClick={() => {
          setShowsAll((wasShown) => !wasShown)
        }}
        sx={{ mt: 0.5, px: 0.5, minHeight: 0 }}
      >
        All levels
      </Button>
    </Box>
  )
}
