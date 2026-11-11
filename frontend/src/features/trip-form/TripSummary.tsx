import EditIcon from '@mui/icons-material/EditOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { TripFormValues } from './validation'

interface TripSummaryProps {
  values: TripFormValues
  onEdit: () => void
}

export function TripSummary({ values, onEdit }: TripSummaryProps) {
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
        </Typography>
      </Box>
      <Button
        startIcon={<EditIcon />}
        aria-expanded={false}
        onClick={onEdit}
        sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
      >
        Edit trip
      </Button>
    </Stack>
  )
}
