import EditIcon from '@mui/icons-material/EditOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { formatLocalTime } from '../../shared/time'
import type { TripFormValues } from './validation'

interface TripSummaryProps {
  values: TripFormValues
  departureZone: string | null
  onEdit: () => void
}

// The departure waits for the origin's zone: showing it in the browser's zone would be a different clock.
function departureText({ departure }: TripFormValues, zone: string | null): string {
  if (!departure || zone === null) return ''
  return `, departs ${formatLocalTime(departure.toISOString(), zone)}`
}

export function TripSummary({ values, departureZone, onEdit }: TripSummaryProps) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h3" component="h2" sx={{ overflowWrap: 'anywhere' }}>
          {values.origin?.label} to {values.destination?.label}
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
  )
}
