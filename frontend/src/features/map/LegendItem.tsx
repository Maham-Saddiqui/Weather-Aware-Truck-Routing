import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { RiskIcon } from './RiskIcon'
import { RISK_COLOURS, RISK_WORDS } from './riskScale'
import type { RiskLevel } from './riskScale'

interface LegendItemProps {
  level: RiskLevel
}

export function LegendItem({ level }: LegendItemProps) {
  return (
    <Stack component="li" direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <RiskIcon level={level} fontSize="small" sx={{ color: RISK_COLOURS[level] }} />
      <Typography variant="caption">{RISK_WORDS[level]}</Typography>
    </Stack>
  )
}
