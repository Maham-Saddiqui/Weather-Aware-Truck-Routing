import Box from '@mui/material/Box'
import { RISK_COLOURS } from '../../shared/colours'
import { RiskIcon } from '../../shared/risk'
import type { CheckpointLevel } from '../../shared/types'

const DOT_PX = 24
const SELECTED_DOT_PX = 34
// Slightly muted once the truck has passed; at this level the icon keeps over 4:1 against its dot and the dot over 3:1 against the dark map (FE-07).
const PASSED_OPACITY = 0.8

interface CheckpointDotProps {
  level: CheckpointLevel
  isSelected: boolean
  isPassed: boolean
}

export function CheckpointDot({ level, isSelected, isPassed }: CheckpointDotProps) {
  const dotSize = isSelected ? SELECTED_DOT_PX : DOT_PX
  return (
    <Box
      sx={{
        display: 'grid',
        placeItems: 'center',
        width: dotSize,
        height: dotSize,
        borderRadius: '50%',
        bgcolor: RISK_COLOURS[level],
        color: 'background.default',
        border: 2,
        borderColor: isSelected ? 'common.white' : 'background.default',
        fontSize: dotSize * 0.7,
        opacity: isPassed ? PASSED_OPACITY : 1,
      }}
    >
      <RiskIcon level={level} fontSize="inherit" />
    </Box>
  )
}
