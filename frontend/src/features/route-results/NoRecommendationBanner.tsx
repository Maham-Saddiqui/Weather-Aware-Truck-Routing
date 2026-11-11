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

const ROUTES_ARE_REAL_NOTE =
  'The routes and travel times are real; only the weather ratings are missing.'

const WEATHER_PROBLEM_NOTES: Partial<Record<WeatherStatus, string>> = {
  busy: ROUTES_ARE_REAL_NOTE,
  unavailable: `Weather data is unavailable right now. ${ROUTES_ARE_REAL_NOTE}`,
}

const LEAVE_LATER_ENDING =
  'Leaving later may help. Pick a later departure time and plan the trip again.'

export function NoRecommendationBanner({
  recommendation,
  routes,
  weather,
}: NoRecommendationBannerProps) {
  const weatherNote = weather ? WEATHER_PROBLEM_NOTES[weather] : undefined
  if (weatherNote) {
    return (
      <Alert severity="warning" icon={<BlockIcon />}>
        <AlertTitle>No route is recommended</AlertTitle>
        {weatherNote}
      </Alert>
    )
  }
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
      {LEAVE_LATER_ENDING}
    </Alert>
  )
}
