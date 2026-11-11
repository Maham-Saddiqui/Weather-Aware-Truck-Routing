import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { DRIVING_TIME_NOTICE } from '../../shared/constants'
import { CheckpointSection } from './CheckpointSection'
import { PendingAlternatives } from './PendingAlternatives'
import { RecommendationBanner } from './RecommendationBanner'
import { ResultNotices } from './ResultNotices'
import { RouteCard } from './RouteCard'
import type { RouteResultsProps } from './RouteResults'

export function ReadyResults(props: RouteResultsProps) {
  const { results, selectedRouteId } = props
  const { routes, recommendation } = results
  const isPendingAlternatives = results.phase === 'partial' && !results.alternativesUnavailable
  const selectedRoute = routes.find((route) => route.id === selectedRouteId)

  return (
    <Stack spacing={2}>
      <ResultNotices results={results} />
      <RecommendationBanner recommendation={recommendation} routes={routes} />
      {routes.map((route, index) => (
        <RouteCard
          key={route.id}
          route={route}
          position={index + 1}
          isSelected={route.id === selectedRouteId}
          isRecommended={route.id === recommendation?.route_id}
          isLeastBad={route.id === recommendation?.least_bad_route_id}
          isMuted={recommendation?.status === 'none_eligible'}
          onSelect={props.onSelectRoute}
        />
      ))}
      {isPendingAlternatives && <PendingAlternatives />}
      {selectedRoute && (
        <CheckpointSection
          route={selectedRoute}
          position={routes.indexOf(selectedRoute) + 1}
          selectedCheckpointIndex={props.selectedCheckpointIndex}
          onSelectCheckpoint={props.onSelectCheckpoint}
        />
      )}
      <Typography variant="caption" color="text.secondary">
        {DRIVING_TIME_NOTICE}
      </Typography>
    </Stack>
  )
}
