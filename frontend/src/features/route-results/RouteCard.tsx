import { useId } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import { alpha, styled } from '@mui/material/styles'
import type { Route } from '../../shared/types'
import { MilesBar } from './MilesBar'
import { RouteHeading } from './RouteHeading'
import { RouteRiskSummary } from './RouteRiskSummary'
import { RouteStats } from './RouteStats'

const SelectableCard = styled(Card, {
  shouldForwardProp: (name) => name !== 'isSelected' && name !== 'isMuted',
})<{ isSelected: boolean; isMuted: boolean }>(({ theme, isSelected, isMuted }) => ({
  position: 'relative',
  borderColor: isSelected ? theme.palette.primary.main : theme.palette.divider,
  borderWidth: isSelected ? 2 : 1,
  '&:hover': {
    borderColor: isSelected ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.6),
  },
  ...(isMuted && {
    backgroundColor: theme.palette.background.paper,
    borderStyle: 'dashed',
  }),
}))

interface RouteCardProps {
  route: Route
  routeNumber: number
  isSelected: boolean
  isRecommended: boolean
  isLeastBad: boolean
  isMuted: boolean
  onSelect: (routeId: string) => void
}

export function RouteCard({
  route,
  routeNumber,
  isSelected,
  isRecommended,
  isLeastBad,
  isMuted,
  onSelect,
}: RouteCardProps) {
  const { summary } = route
  const headingId = useId()
  return (
    <SelectableCard
      role="article"
      aria-labelledby={headingId}
      isSelected={isSelected}
      isMuted={isMuted && !isLeastBad}
    >
      <CardContent>
        <Stack spacing={1.5}>
          <RouteHeading
            route={route}
            routeNumber={routeNumber}
            headingId={headingId}
            isSelected={isSelected}
            isRecommended={isRecommended}
            isLeastBad={isLeastBad}
            onSelect={onSelect}
          />
          <RouteStats route={route} />
          <MilesBar milesByLevel={summary.miles_by_level} />
          <RouteRiskSummary summary={summary} />
        </Stack>
      </CardContent>
    </SelectableCard>
  )
}
