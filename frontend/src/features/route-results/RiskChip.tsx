import Chip from '@mui/material/Chip'
import { styled } from '@mui/material/styles'
import { LEVEL_ICONS, LEVEL_LABELS } from '../../shared/risk'
import type { CheckpointLevel } from '../../shared/types'

const LevelChip = styled(Chip, { shouldForwardProp: (name) => name !== 'level' })<{
  level: CheckpointLevel
}>(({ theme, level }) => ({
  color: theme.palette.risk[level],
  borderColor: theme.palette.risk[level],
  '& .MuiChip-icon': { color: 'inherit' },
}))

interface RiskChipProps {
  level: CheckpointLevel
  size?: 'small' | 'medium'
}

export function RiskChip({ level, size = 'small' }: RiskChipProps) {
  const Icon = LEVEL_ICONS[level]
  return (
    <LevelChip
      level={level}
      size={size}
      variant="outlined"
      icon={<Icon />}
      label={LEVEL_LABELS[level]}
    />
  )
}
