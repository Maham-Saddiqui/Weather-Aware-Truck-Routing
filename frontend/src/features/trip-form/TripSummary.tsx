import EditIcon from '@mui/icons-material/EditOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { EndpointLetter, type EndpointLetterName } from '../../shared/EndpointLetter'
import { formatLocalTime } from '../../shared/time'
import type { TripFormValues } from './validation'

interface TripSummaryProps {
  values: TripFormValues
  departureZone: string | null
  onEdit: () => void
  actions?: ReactNode
}

// The departure waits for the origin's zone: showing it in the browser's zone would be a different clock.
function departureText({ departure }: TripFormValues, zone: string | null): string {
  if (!departure || zone === null) return ''
  return `, departs ${formatLocalTime(departure.toISOString(), zone)}`
}

function LetteredPlace({ letter, label }: { letter: EndpointLetterName; label?: string }) {
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}
    >
      <EndpointLetter letter={letter} /> <span>{label}</span>
    </Box>
  )
}

export function TripSummary({ values, departureZone, onEdit, actions }: TripSummaryProps) {
  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h3"
            component="h2"
            sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 0.75 }}
          >
            <LetteredPlace letter="A" label={values.origin?.label} /> <span>to</span>{' '}
            <LetteredPlace letter="B" label={values.destination?.label} />
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {values.loadLb} lb, checkpoint every {values.spacingMiles} miles
            {departureText(values, departureZone)}
          </Typography>
        </Box>
        <Button
          startIcon={<EditIcon />}
          onClick={onEdit}
          sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          Edit trip
        </Button>
      </Stack>
      {actions}
    </Stack>
  )
}
