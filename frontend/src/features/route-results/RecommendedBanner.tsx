import StarIcon from '@mui/icons-material/Star'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import type { Recommendation } from '../../shared/types'

interface RecommendedBannerProps {
  recommendation: Recommendation
  position: number
}

export function RecommendedBanner({ recommendation, position }: RecommendedBannerProps) {
  return (
    <Alert severity="success" icon={<StarIcon />}>
      <AlertTitle>Recommended: Route {position}</AlertTitle>
      {recommendation.sentence}
    </Alert>
  )
}
