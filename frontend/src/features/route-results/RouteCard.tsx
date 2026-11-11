import { useId } from 'react'
import Card from '@mui/material/Card'
import { styled } from '@mui/material/styles'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { Route } from '../../shared/types'
import { MilesBar } from './MilesBar'
import { RouteBadges } from './RouteBadges'
import { RouteRiskSummary } from './RouteRiskSummary'
import { RouteStats } from './RouteStats'

const SelectableCard = styled(Card, {
  shouldForwardProp: (name) => name !== 'isSelected' && name !== 'isMuted',
})<{ isSelected: boolean; isMuted: boolean }>(({ theme, isSelected, isMuted }) => ({
  opacity: isMuted ? 0.7 : 1,
  borderColor: isSelected ? theme.palette.primary.main : theme.palette.divider,
  borderWidth: isSelected ? 2 : 1,
}))

interface RouteCardProps {
  route: Route
  position: number
  isSelected: boolean
  isRecommended: boolean
  isLeastBad: boolean
  isMuted: boolean
  onSelect: (routeId: string) => void
}

export function RouteCard({
  route,
  position,
  isSelected,
  isMuted,
  onSelect,
  ...badges
}: RouteCardProps) {
  const { summary } = route
  const headingId = useId()
  return (
    <SelectableCard isSelected={isSelected} isMuted={isMuted}>
      <CardActionArea
        component="div"
        aria-pressed={isSelected}
        aria-labelledby={headingId}
        onClick={() => {
          onSelect(route.id)
        }}
      >
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
              <Typography id={headingId} variant="h3" component="h3">
                Route {position}
              </Typography>
              <RouteBadges route={route} {...badges} />
            </Stack>
            <RouteStats route={route} />
            <MilesBar milesByLevel={summary.miles_by_level} />
            <RouteRiskSummary summary={summary} />
          </Stack>
        </CardContent>
      </CardActionArea>
    </SelectableCard>
  )
}
