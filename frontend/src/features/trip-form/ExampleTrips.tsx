import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { dayjs } from '../../shared/time'
import type { TripRequest } from '../../shared/types'
import { EXAMPLE_TRIPS, exampleTripRequest } from './examples'

interface ExampleTripsProps {
  onChoose: (trip: TripRequest) => void
}

export function ExampleTrips({ onChoose }: ExampleTripsProps) {
  return (
    <Stack spacing={1} component="section" aria-labelledby="example-trips-title">
      <Typography id="example-trips-title" variant="h3" component="h2">
        Try an example
      </Typography>
      <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
        {EXAMPLE_TRIPS.map((example) => (
          <Button
            key={example.name}
            variant="outlined"
            size="small"
            onClick={() => {
              onChoose(exampleTripRequest(example, dayjs()))
            }}
          >
            {example.name}
          </Button>
        ))}
      </Stack>
    </Stack>
  )
}
