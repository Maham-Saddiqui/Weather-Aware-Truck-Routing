import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import { Suspense } from 'react'
import { RouteResults } from '../features/route-results'
import { ShareTrip } from '../features/share-trip'
import { ErrorBoundary } from './ErrorBoundary'
import type { TripPlannerState } from './useTripPlanner'

export function ResultsPane({ planner }: { planner: TripPlannerState }) {
  return (
    <Stack spacing={2}>
      <ShareTrip hasTrip={planner.run !== null} />
      <ErrorBoundary area="the results">
        <Suspense fallback={<Skeleton variant="rounded" height={200} />}>
          <RouteResults
            results={planner.results}
            selectedRouteId={planner.selectedRouteId}
            selectedCheckpointIndex={planner.selectedCheckpointIndex}
            onSelectRoute={planner.selectRoute}
            onSelectCheckpoint={planner.selectCheckpoint}
            onRetry={planner.retry}
          />
        </Suspense>
      </ErrorBoundary>
    </Stack>
  )
}
