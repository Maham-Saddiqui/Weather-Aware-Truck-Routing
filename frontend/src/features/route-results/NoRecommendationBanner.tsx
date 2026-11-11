import BlockIcon from '@mui/icons-material/Block'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import type { Recommendation, Route } from '../../shared/types'
import { describeRouteProblems } from './noRecommendationReasons'

interface NoRecommendationBannerProps {
  recommendation: Recommendation
  routes: readonly Route[]
}

export function NoRecommendationBanner({ recommendation, routes }: NoRecommendationBannerProps) {
  const problems = routes.flatMap((route, index) => describeRouteProblems(route, index + 1))
  return (
    <Alert severity="warning" icon={<BlockIcon />}>
      <AlertTitle>No route is recommended</AlertTitle>
      {recommendation.sentence}
      <List dense disablePadding aria-label="Why no route is recommended">
        {problems.map((problem) => (
          <ListItem key={problem} disableGutters>
            {problem}
          </ListItem>
        ))}
      </List>
      Leaving later may help. Pick a later departure time and plan the trip again.
    </Alert>
  )
}
