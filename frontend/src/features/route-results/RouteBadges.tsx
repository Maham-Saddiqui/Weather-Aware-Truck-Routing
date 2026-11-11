import BlockIcon from '@mui/icons-material/Block'
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined'
import StarIcon from '@mui/icons-material/Star'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import type { Route } from '../../shared/types'

type IneligibleReason = NonNullable<Route['summary']['ineligible_reason']>

const INELIGIBLE_BADGES: Record<IneligibleReason, { label: string; icon: typeof BlockIcon }> = {
  no_travel: { label: 'Contains No Travel', icon: BlockIcon },
  not_enough_weather_data: { label: 'Not enough weather data', icon: HelpOutlinedIcon },
}

interface RouteBadgesProps {
  route: Route
  isRecommended: boolean
  isLeastBad: boolean
}

export function RouteBadges({ route, isRecommended, isLeastBad }: RouteBadgesProps) {
  const { ineligible_reason: reason } = route.summary
  const ineligible = reason === null ? null : INELIGIBLE_BADGES[reason]
  return (
    <Stack
      direction="row"
      spacing={0.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}
    >
      {isRecommended && (
        <Chip size="small" color="primary" icon={<StarIcon />} label="Recommended" />
      )}
      {isLeastBad && (
        <Chip size="small" variant="outlined" label="Least bad, for information only" />
      )}
      {ineligible && (
        <Chip size="small" variant="outlined" icon={<ineligible.icon />} label={ineligible.label} />
      )}
    </Stack>
  )
}
