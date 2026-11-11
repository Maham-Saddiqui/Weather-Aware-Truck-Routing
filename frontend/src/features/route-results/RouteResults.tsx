import { EmptyResults } from './EmptyResults'
import { FailedResults } from './FailedResults'
import { LoadingResults } from './LoadingResults'
import { ReadyResults } from './ReadyResults'
import { ResultsAnnouncement } from './ResultsAnnouncement'
import type { TripResults } from './tripResults'

export interface RouteResultsProps {
  results: TripResults
  selectedRouteId: string | null
  selectedCheckpointIndex: number | null
  onSelectRoute: (routeId: string) => void
  onSelectCheckpoint: (routeId: string, checkpointIndex: number) => void
  onRetry: () => void
}

function CurrentResults(props: RouteResultsProps) {
  const { results } = props
  switch (results.phase) {
    case 'idle':
      return <EmptyResults />
    case 'failed':
      return <FailedResults error={results.error} onRetry={props.onRetry} />
    case 'loading':
      return <LoadingResults isServerWaking={results.isServerWaking} />
    default:
      return <ReadyResults {...props} />
  }
}

export function RouteResults(props: RouteResultsProps) {
  return (
    <>
      <ResultsAnnouncement phase={props.results.phase} />
      <CurrentResults {...props} />
    </>
  )
}
