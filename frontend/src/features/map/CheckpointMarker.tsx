import ButtonBase from '@mui/material/ButtonBase'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import { Marker } from '@vis.gl/react-maplibre'
import { memo } from 'react'
import { RISK_COLOURS } from '../../shared/colours'
import { MIN_TOUCH_TARGET_PX } from '../../shared/constants'
import { LEVEL_LABELS, RiskIcon } from '../../shared/risk'
import type { Checkpoint } from '../../shared/types'
import { CheckpointCard } from './CheckpointCard'
import { formatEta } from './formatEta'

const DOT_PX = 24
const SELECTED_DOT_PX = 34

interface CheckpointMarkerProps {
  checkpoint: Checkpoint
  isSelected: boolean
  onSelect: (checkpointIndex: number) => void
}

function CheckpointMarkerView({ checkpoint, isSelected, onSelect }: CheckpointMarkerProps) {
  const { level, position, index, distance_miles, eta_utc, time_zone } = checkpoint
  const label = `${LEVEL_LABELS[level]} risk at mile ${distance_miles}, arriving ${formatEta(eta_utc, time_zone)}`
  const dotSize = isSelected ? SELECTED_DOT_PX : DOT_PX
  return (
    <Marker longitude={position.lon} latitude={position.lat} anchor="center">
      <Tooltip title={<CheckpointCard checkpoint={checkpoint} />} placement="top" arrow>
        <ButtonBase
          aria-label={label}
          aria-pressed={isSelected}
          tabIndex={-1}
          onClick={() => {
            onSelect(index)
          }}
          sx={{ width: MIN_TOUCH_TARGET_PX, height: MIN_TOUCH_TARGET_PX, borderRadius: '50%' }}
        >
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
            }}
          >
            <RiskIcon level={level} fontSize="inherit" />
          </Box>
        </ButtonBase>
      </Tooltip>
    </Marker>
  )
}

export const CheckpointMarker = memo(CheckpointMarkerView)
