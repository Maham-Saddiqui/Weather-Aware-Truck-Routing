import BlockIcon from '@mui/icons-material/Block'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import type { CheckpointLevel } from './types'

export const LEVEL_ORDER: readonly CheckpointLevel[] = [
  'low',
  'moderate',
  'high',
  'severe',
  'no_travel',
  'no_data',
]

export const LEVEL_LABELS: Record<CheckpointLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  severe: 'Severe',
  no_travel: 'No Travel',
  no_data: 'No data',
}

export const LEVEL_ICONS: Record<CheckpointLevel, typeof BlockIcon> = {
  low: CheckCircleOutlinedIcon,
  moderate: InfoOutlinedIcon,
  high: WarningAmberIcon,
  severe: ErrorOutlinedIcon,
  no_travel: BlockIcon,
  no_data: HelpOutlinedIcon,
}

interface RiskIconProps extends SvgIconProps {
  level: CheckpointLevel
}

export function RiskIcon({ level, ...iconProps }: RiskIconProps) {
  const Icon = LEVEL_ICONS[level]
  return <Icon aria-hidden="true" {...iconProps} />
}
