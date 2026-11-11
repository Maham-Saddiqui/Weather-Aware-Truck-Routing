import { styled } from '@mui/material/styles'
import type { Heatmap, Route } from '../../shared/types'
import { ShowTruckButton } from './ShowTruckButton'
import { truckAtHour } from './truckAtHour'
import { useFollowTruck } from './useFollowTruck'

const HiddenAnnouncement = styled('p')({
  position: 'absolute',
  width: 1,
  height: 1,
  margin: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
})

const OUT_OF_VIEW_MESSAGE = 'The truck is outside the map view. Use Show truck to bring it back.'

interface TruckFollowerProps {
  route: Route
  heatmap: Heatmap
  hourOffset: number
  showTruckRequest?: number
}

// The announcement region stays mounted and its words change only when the button appears or goes,
// so playback never repeats it (FE-07).
export function TruckFollower({
  route,
  heatmap,
  hourOffset,
  showTruckRequest,
}: TruckFollowerProps) {
  const truck = truckAtHour(route, heatmap, hourOffset)
  const follow = useFollowTruck(truck?.position ?? null, route, showTruckRequest)
  return (
    <>
      <HiddenAnnouncement role="status">
        {follow.isTruckHidden ? OUT_OF_VIEW_MESSAGE : ''}
      </HiddenAnnouncement>
      {follow.isTruckHidden && <ShowTruckButton onClick={follow.showTruck} />}
    </>
  )
}
