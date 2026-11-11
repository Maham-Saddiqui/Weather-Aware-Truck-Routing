import type { Route } from '../../shared/types'
import { HiddenStatus } from './HiddenStatus'

export function CheckpointAnnouncement({ route, index }: { route: Route; index: number | null }) {
  const checkpoint = route.checkpoints.find((candidate) => candidate.index === index)
  return (
    <HiddenStatus>
      {checkpoint ? `Checkpoint at mile ${checkpoint.distance_miles} selected` : ''}
    </HiddenStatus>
  )
}
