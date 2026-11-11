import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import { styled, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import Typography from '@mui/material/Typography'
import { useId, useState } from 'react'
import { LEVEL_ORDER } from '../../shared/risk'
import { VISUALLY_HIDDEN_STYLE } from '../../shared/visuallyHidden'
import { LegendItem } from './LegendItem'

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

const Notes = styled('div', { shouldForwardProp: (name) => name !== 'isShown' })<{
  isShown: boolean
}>(({ isShown }) =>
  isShown
    ? {}
    : {
        ...VISUALLY_HIDDEN_STYLE,
      },
)

export function MapLegend() {
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
          Faint green on the map means low risk; grey means no weather data.
        </Typography>
      </Notes>
    </Panel>
  )
}
