import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import { RouteCardSkeleton } from './RouteCardSkeleton'

const WAKING_MESSAGE =
  'The server is waking up. This can take up to a minute the first time. Your routes will appear as soon as it is ready.'

const SPINNER_SIZE_PX = 20

export function LoadingResults({ isServerWaking }: { isServerWaking: boolean }) {
  return (
    <Stack spacing={2}>
      <Alert
        severity="info"
        role="status"
        icon={<CircularProgress size={SPINNER_SIZE_PX} aria-hidden />}
      >
        {isServerWaking ? WAKING_MESSAGE : 'Planning your trip…'}
      </Alert>
      <RouteCardSkeleton />
      <RouteCardSkeleton />
    </Stack>
  )
}
