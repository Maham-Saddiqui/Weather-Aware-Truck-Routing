import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { RouteCardSkeleton } from './RouteCardSkeleton'

export function PendingAlternatives() {
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary" aria-live="polite">
        Looking for alternative routes and a recommendation…
      </Typography>
      <RouteCardSkeleton />
    </Stack>
  )
}
