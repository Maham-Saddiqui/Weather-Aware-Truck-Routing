import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import { styled, useTheme } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import type { Route } from '../../shared/types'
import { RouteBadges } from './RouteBadges'

// The button's click area is stretched over the whole card, so the card content stays ordinary text for screen readers.
// ButtonBase is position: relative by default; it must be static so the overlay anchors to the card, not to the button.
const SelectButton = styled(ButtonBase)(({ theme }) => ({
  position: 'static',
  font: 'inherit',
  textAlign: 'left',
  '&::after': { content: '""', position: 'absolute', inset: 0 },
  '&.Mui-focusVisible': { outline: 'none' },
  '&.Mui-focusVisible::after': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -4,
    borderRadius: theme.shape.borderRadius,
  },
}))

const SWATCH_WIDTH_PX = 6
const SWATCH_HEIGHT_PX = 20

// The same hue as the route's line and name pill on the map, so card and line are linked.
const Swatch = styled('span', { shouldForwardProp: (name) => name !== 'hue' })<{ hue: string }>(
  ({ theme, hue }) => ({
    display: 'inline-block',
    flexShrink: 0,
    width: SWATCH_WIDTH_PX,
    height: SWATCH_HEIGHT_PX,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: hue,
  }),
)

interface RouteHeadingProps {
  route: Route
  routeNumber: number
  headingId: string
  isSelected: boolean
  isRecommended: boolean
  isLeastBad: boolean
  onSelect: (routeId: string) => void
}

export function RouteHeading({
  route,
  routeNumber,
  headingId,
  isSelected,
  isRecommended,
  isLeastBad,
  onSelect,
}: RouteHeadingProps) {
  const theme = useTheme()
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
      <Typography
        id={headingId}
        variant="h3"
        component="h3"
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Swatch hue={theme.palette.route[routeNumber - 1] ?? ''} aria-hidden="true" />
        <SelectButton
          aria-pressed={isSelected}
          onClick={() => {
            onSelect(route.id)
          }}
        >
          Route {routeNumber}
        </SelectButton>
      </Typography>
      <RouteBadges route={route} isRecommended={isRecommended} isLeastBad={isLeastBad} />
    </Stack>
  )
}
