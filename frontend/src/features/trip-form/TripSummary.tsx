import EditIcon from '@mui/icons-material/EditOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { EndpointLetter, type EndpointLetterName } from '../../shared/EndpointLetter'
import { formatLocalTime } from '../../shared/time'
import { VISUALLY_HIDDEN_STYLE } from '../../shared/visuallyHidden'
import { parseLoad } from './validation'
import type { TripFormValues } from './validation'

interface TripSummaryProps {
  values: TripFormValues
  departureZone: string | null
  onEdit: () => void
  actions?: ReactNode
}

// The departure waits for the origin's zone: showing it in the browser's zone would be a different clock.
function departureText({ departure }: TripFormValues, zone: string | null): string | null {
  if (!departure || zone === null) return null
  return `Departs ${formatLocalTime(departure.toISOString(), zone)}`
}

// Display only: the box keeps plain digits and the link keeps the number as typed.
function loadText(loadLb: string): string {
  const load = parseLoad(loadLb)
  return load === null ? loadLb : load.toLocaleString('en-US')
}

const TWO_LINES = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  overflowWrap: 'anywhere',
} as const

interface LetteredPlaceProps {
  letter: EndpointLetterName
  label?: string
  spokenPrefix: string
}

// Two grid cells (badge, name) so both names start on the same left edge. The prefix replaces the
// old visible "to": screen readers still hear "from A to B".
function LetteredPlace({ letter, label, spokenPrefix }: LetteredPlaceProps) {
  return (
    <>
      <Box component="span" sx={{ lineHeight: (theme) => theme.spacing(2.75), display: 'flex' }}>
        <EndpointLetter letter={letter} />
      </Box>
      <Box
        component="span"
        sx={{ position: 'relative', minWidth: 0, lineHeight: (theme) => theme.spacing(2.75) }}
      >
        <Box component="span" sx={VISUALLY_HIDDEN_STYLE}>
          {spokenPrefix}
        </Box>
        <Box component="span" sx={TWO_LINES}>
          {label}
        </Box>
      </Box>
    </>
  )
}

function TripPlaces({ values }: { values: TripFormValues }) {
  return (
    <Typography
      variant="h3"
      component="h2"
      sx={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr)',
        columnGap: 1,
        rowGap: 1.5,
        marginBottom: 1,
      }}
    >
      <LetteredPlace letter="A" label={values.origin?.label} spokenPrefix="from " />
      <LetteredPlace letter="B" label={values.destination?.label} spokenPrefix=" to " />
    </Typography>
  )
}

function TripDetails({
  values,
  departureZone,
}: Pick<TripSummaryProps, 'values' | 'departureZone'>) {
  const departure = departureText(values, departureZone)
  return (
    <>
      <Typography variant="caption" color="text.secondary" component="p">
        {loadText(values.loadLb)} lb, checkpoint every {values.spacingMiles} miles
      </Typography>
      {departure && (
        <Typography
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{ whiteSpace: 'nowrap' }}
        >
          {departure}
        </Typography>
      )}
    </>
  )
}

export function TripSummary({ values, departureZone, onEdit, actions }: TripSummaryProps) {
  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <TripPlaces values={values} />
          <TripDetails values={values} departureZone={departureZone} />
        </Box>
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            height: (theme) => theme.spacing(2.75),
          }}
        >
          <Button startIcon={<EditIcon />} onClick={onEdit} sx={{ whiteSpace: 'nowrap' }}>
            Edit trip
          </Button>
        </Box>
      </Stack>
      {actions}
    </Stack>
  )
}
