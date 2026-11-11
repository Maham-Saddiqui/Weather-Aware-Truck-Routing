import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { dayjs } from '../../shared/time'
import type { TripRequest } from '../../shared/types'
import { EXAMPLE_TRIPS, exampleTripRequest } from './examples'

interface ExampleTripsProps {
  isBusy: boolean
  onChoose: (trip: TripRequest) => void
}

export function ExampleTrips({ isBusy, onChoose }: ExampleTripsProps) {
  return (
    <Stack spacing={1} component="section" aria-labelledby="example-trips-title">
      <Typography id="example-trips-title" variant="h3" component="h2">
        Try an example
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
        {EXAMPLE_TRIPS.map((example) => (
          <Button
            key={example.name}
            variant="outlined"
            size="small"
            disabled={isBusy}
            onClick={() => {
              onChoose(exampleTripRequest(example, dayjs()))
            }}
          >
            {example.name}
          </Button>
        ))}
      </Box>
    </Stack>
  )
}
