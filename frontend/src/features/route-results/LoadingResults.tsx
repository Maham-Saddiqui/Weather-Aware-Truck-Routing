import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { RouteCardSkeleton } from './RouteCardSkeleton'

const WAKING_MESSAGE =
  'The server is waking up. This can take up to a minute the first time. Your routes will appear as soon as it is ready.'

export function LoadingResults({ isServerWaking }: { isServerWaking: boolean }) {
  return (
    <Stack spacing={2} aria-busy>
      <Typography aria-live="polite">
        {isServerWaking ? WAKING_MESSAGE : 'Planning your trip…'}
      </Typography>
      <RouteCardSkeleton />
      <RouteCardSkeleton />
    </Stack>
  )
}
