import CheckCircle from '@mui/icons-material/CheckCircle'
import ErrorOutlined from '@mui/icons-material/ErrorOutlined'
import HelpOutlined from '@mui/icons-material/HelpOutlined'
import NotInterested from '@mui/icons-material/NotInterested'
import ReportProblem from '@mui/icons-material/ReportProblem'
import WarningAmber from '@mui/icons-material/WarningAmber'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import type { ComponentType } from 'react'
import type { RiskLevel } from './riskScale'

const ICON_FOR_LEVEL: Record<RiskLevel, ComponentType<SvgIconProps>> = {
  low: CheckCircle,
  moderate: ErrorOutlined,
  high: WarningAmber,
  severe: ReportProblem,
  no_travel: NotInterested,
  no_data: HelpOutlined,
}

interface RiskIconProps extends SvgIconProps {
  level: RiskLevel
}

export function RiskIcon({ level, ...iconProps }: RiskIconProps) {
  const Icon = ICON_FOR_LEVEL[level]
  return <Icon aria-hidden="true" {...iconProps} />
}
