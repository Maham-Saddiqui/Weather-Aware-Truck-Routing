import type { Recommendation, Route } from '../../shared/types'
import { NoRecommendationBanner } from './NoRecommendationBanner'
import { RecommendedBanner } from './RecommendedBanner'

interface RecommendationBannerProps {
  recommendation: Recommendation | null
  routes: readonly Route[]
}

export function RecommendationBanner({ recommendation, routes }: RecommendationBannerProps) {
  if (recommendation === null) return null
  if (recommendation.status === 'none_eligible') {
    return <NoRecommendationBanner recommendation={recommendation} routes={routes} />
  }
  const index = routes.findIndex((route) => route.id === recommendation.route_id)
  return index < 0 ? null : (
    <RecommendedBanner recommendation={recommendation} position={index + 1} />
  )
}
