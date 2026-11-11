import SwapVertIcon from '@mui/icons-material/SwapVert'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import { styled } from '@mui/material/styles'
import type { Place } from '../../shared/types'
import { PlaceField } from './PlaceField'

// Sits in the gap between the two fields, on the helper-text line, so both fields keep the full width.
const SwapButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: theme.spacing(8),
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 1,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  '&:hover': { backgroundColor: theme.palette.action.hover },
}))

interface PlacePairProps {
  origin: Place | null
  destination: Place | null
  errors: { origin?: string; destination?: string }
  onChangeOrigin: (place: Place | null) => void
  onChangeDestination: (place: Place | null) => void
  onSwap: () => void
}

export function PlacePair({
  origin,
  destination,
  errors,
  onChangeOrigin,
  onChangeDestination,
  onSwap,
}: PlacePairProps) {
  return (
    <Stack useFlexGap spacing={2} sx={{ position: 'relative' }}>
      <PlaceField label="Origin" value={origin} error={errors.origin} onChange={onChangeOrigin} />
      <SwapButton aria-label="Swap origin and destination" onClick={onSwap}>
        <SwapVertIcon />
      </SwapButton>
      <PlaceField
        label="Destination"
        value={destination}
        error={errors.destination}
        onChange={onChangeDestination}
      />
    </Stack>
  )
}
