import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Typography from '@mui/material/Typography'
import { describeError } from '../../shared/api/problems'
import type { TripResults } from './tripResults'

export function RouteResults({ results }: { results: TripResults }) {
  if (results.phase === 'idle') return null
  if (results.phase === 'failed') return <Typography>{describeError(results.error)}</Typography>
  if (results.phase === 'loading') return <Typography>Planning your trip…</Typography>
  return (
    <List>
      {results.routes.map((route) => (
        <ListItem key={route.id}>{route.summary.distance_miles} mi</ListItem>
      ))}
    </List>
  )
}
