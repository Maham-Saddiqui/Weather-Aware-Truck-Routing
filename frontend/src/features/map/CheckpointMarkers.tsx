import { useCallback } from 'react'
import type { Route } from '../../shared/types'
import { CheckpointMarker } from './CheckpointMarker'
import { isDotDrawn } from './dotThinning'
import { useDotStride } from './useDotStride'

interface CheckpointMarkersProps {
  route: Route
  selectedCheckpointIndex: number | null
  onSelectCheckpoint: (routeId: string, checkpointIndex: number) => void
  forecastMs: number | null
}

export function CheckpointMarkers({
  route,
  selectedCheckpointIndex,
  onSelectCheckpoint,
  forecastMs,
}: CheckpointMarkersProps) {
  const selectCheckpoint = useCallback(
    (checkpointIndex: number) => {
      onSelectCheckpoint(route.id, checkpointIndex)
    },
    [onSelectCheckpoint, route.id],
  )
  const stride = useDotStride(route.checkpoints.map((checkpoint) => checkpoint.position))
  const lastPosition = route.checkpoints.length - 1
  const drawn = route.checkpoints.filter((checkpoint, position) =>
    isDotDrawn({
      position,
      lastPosition,
      stride,
      isSelected: checkpoint.index === selectedCheckpointIndex,
    }),
  )
  return drawn.map((checkpoint) => (
    <CheckpointMarker
      key={checkpoint.index}
      checkpoint={checkpoint}
      isSelected={checkpoint.index === selectedCheckpointIndex}
      isPassed={forecastMs !== null && Date.parse(checkpoint.eta_utc) <= forecastMs}
      onSelect={selectCheckpoint}
    />
  ))
}
