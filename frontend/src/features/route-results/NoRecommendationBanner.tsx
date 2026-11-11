import BlockIcon from '@mui/icons-material/Block'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import type { Recommendation, Route, WeatherStatus } from '../../shared/types'
import { describeRouteProblems } from './noRecommendationReasons'

interface NoRecommendationBannerProps {
  recommendation: Recommendation
  routes: readonly Route[]
  weather: WeatherStatus | null
}

const WEATHER_PROBLEM_ENDINGS: Partial<Record<WeatherStatus, string>> = {
  busy: 'The weather service is busy, so no route could be rated. Try again in a minute.',
  unavailable: 'Weather data is unavailable, so no route could be rated. Try again in a minute.',
}

const LEAVE_LATER_ENDING =
  'Leaving later may help. Pick a later departure time and plan the trip again.'

function closingSentence(weather: WeatherStatus | null): string {
  return (weather && WEATHER_PROBLEM_ENDINGS[weather]) ?? LEAVE_LATER_ENDING
}

export function NoRecommendationBanner({
  recommendation,
  routes,
  weather,
}: NoRecommendationBannerProps) {
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
      {closingSentence(weather)}
    </Alert>
  )
}
