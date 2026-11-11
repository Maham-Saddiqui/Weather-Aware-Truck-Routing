import ButtonBase from '@mui/material/ButtonBase'
import Tooltip from '@mui/material/Tooltip'
import { Marker } from '@vis.gl/react-maplibre'
import { memo } from 'react'
import { MIN_TOUCH_TARGET_PX } from '../../shared/constants'
import { LEVEL_LABELS } from '../../shared/risk'
import { formatClockTime } from '../../shared/time'
import type { Checkpoint } from '../../shared/types'
import { CheckpointCard } from './CheckpointCard'
import { CheckpointDot } from './CheckpointDot'

interface CheckpointMarkerProps {
  checkpoint: Checkpoint
  isSelected: boolean
  isPassed: boolean
  onSelect: (checkpointIndex: number) => void
}

function CheckpointMarkerView({
  checkpoint,
  isSelected,
  isPassed,
  onSelect,
}: CheckpointMarkerProps) {
  const { level, position, index, distance_miles, eta_utc, time_zone } = checkpoint
  const label = `${LEVEL_LABELS[level]} risk at mile ${distance_miles}, arriving ${formatClockTime(eta_utc, time_zone)}`
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
          <CheckpointDot level={level} isSelected={isSelected} isPassed={isPassed} />
        </ButtonBase>
      </Tooltip>
    </Marker>
  )
}

export const CheckpointMarker = memo(CheckpointMarkerView)
