import FormHelperText from '@mui/material/FormHelperText'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import { SPACING_OPTIONS_MILES } from '../../shared/constants'
import type { SpacingMiles } from '../../shared/types'

interface SpacingFieldProps {
  value: SpacingMiles
  onChange: (spacingMiles: SpacingMiles) => void
}

export function SpacingField({ value, onChange }: SpacingFieldProps) {
  return (
    <Stack spacing={0.5}>
      <Typography id="spacing-label" variant="body2" color="text.secondary">
        Checkpoint spacing
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        color="primary"
        value={value}
        aria-labelledby="spacing-label"
        onChange={(_event, spacing: SpacingMiles | null) => {
          if (spacing !== null) onChange(spacing)
        }}
      >
        {SPACING_OPTIONS_MILES.map((miles) => (
          <ToggleButton key={miles} value={miles}>
            {miles} miles
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <FormHelperText>Weather is rated at a checkpoint every {value} miles</FormHelperText>
    </Stack>
  )
}
