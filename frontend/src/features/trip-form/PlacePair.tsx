import SwapVertIcon from '@mui/icons-material/SwapVert'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import type { Place } from '../../shared/types'
import { PlaceField } from './PlaceField'

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
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: 1,
        alignItems: 'center',
      }}
    >
      <Stack spacing={2}>
        <PlaceField label="Origin" value={origin} error={errors.origin} onChange={onChangeOrigin} />
        <PlaceField
          label="Destination"
          value={destination}
          error={errors.destination}
          onChange={onChangeDestination}
        />
      </Stack>
      <IconButton aria-label="Swap origin and destination" onClick={onSwap}>
        <SwapVertIcon />
      </IconButton>
    </Box>
  )
}
