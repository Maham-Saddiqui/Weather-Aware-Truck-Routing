import type { Recommendation, Route, WeatherStatus } from '../../shared/types'
import { NoRecommendationBanner } from './NoRecommendationBanner'
import { RecommendedBanner } from './RecommendedBanner'

interface RecommendationBannerProps {
  recommendation: Recommendation | null
  routes: readonly Route[]
  weather: WeatherStatus | null
}

export function RecommendationBanner({
  recommendation,
  routes,
  weather,
}: RecommendationBannerProps) {
  if (recommendation === null) return null
  if (recommendation.status === 'none_eligible') {
    return (
      <NoRecommendationBanner recommendation={recommendation} routes={routes} weather={weather} />
    )
  }
  const index = routes.findIndex((route) => route.id === recommendation.route_id)
  return index < 0 ? null : (
    <RecommendedBanner recommendation={recommendation} position={index + 1} />
  )
}
