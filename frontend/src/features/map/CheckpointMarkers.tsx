import { useCallback } from 'react'
import type { Route } from '../../shared/types'
import { CheckpointMarker } from './CheckpointMarker'

interface CheckpointMarkersProps {
  route: Route
  selectedCheckpointIndex: number | null
  onSelectCheckpoint: (routeId: string, checkpointIndex: number) => void
}

export function CheckpointMarkers({
  route,
  selectedCheckpointIndex,
  onSelectCheckpoint,
}: CheckpointMarkersProps) {
  const selectCheckpoint = useCallback(
    (checkpointIndex: number) => {
      onSelectCheckpoint(route.id, checkpointIndex)
    },
    [onSelectCheckpoint, route.id],
  )
  return route.checkpoints.map((checkpoint) => (
    <CheckpointMarker
      key={checkpoint.index}
      checkpoint={checkpoint}
      isSelected={checkpoint.index === selectedCheckpointIndex}
      onSelect={selectCheckpoint}
    />
  ))
}
