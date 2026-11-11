import Stack from '@mui/material/Stack'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useRef } from 'react'
import type { Route } from '../../shared/types'
import { CheckpointAnnouncement } from './CheckpointAnnouncement'
import { CheckpointPanel } from './CheckpointPanel'
import { CHECKPOINTS_TITLE_ID, CheckpointsToggle } from './CheckpointsToggle'
import { useCheckpointDisclosure } from './useCheckpointDisclosure'

interface CheckpointSectionProps {
  route: Route
  routeNumber: number
  selectedCheckpointIndex: number | null
  onSelectCheckpoint: (routeId: string, checkpointIndex: number) => void
}

// The section is positioned so the hidden announcement stays inside it and cannot stretch the page.
// Closed on a phone, where fifty rows would push everything else off the page; open on a wide screen.
export function CheckpointSection({
  route,
  routeNumber,
  selectedCheckpointIndex,
  onSelectCheckpoint,
}: CheckpointSectionProps) {
  const isPhone = useMediaQuery(useTheme().breakpoints.down('md'))
  const section = useRef<HTMLElement>(null)
  const disclosure = useCheckpointDisclosure(selectedCheckpointIndex, section, !isPhone)

  return (
    <Stack
      spacing={1}
      component="section"
      ref={section}
      aria-labelledby={CHECKPOINTS_TITLE_ID}
      sx={{ position: 'relative', scrollMarginTop: (theme) => theme.spacing(1) }}
    >
      <CheckpointsToggle
        routeNumber={routeNumber}
        checkpointCount={route.checkpoints.length}
        isOpen={disclosure.isOpen}
        onToggle={disclosure.toggle}
      />
      {disclosure.isOpen && (
        <CheckpointPanel
          route={route}
          selectedCheckpointIndex={selectedCheckpointIndex}
          highlightedCheckpointIndex={disclosure.revealedIndex}
          onSelectCheckpoint={(routeId, checkpointIndex) => {
            disclosure.markPickedInList()
            onSelectCheckpoint(routeId, checkpointIndex)
          }}
        />
      )}
      <CheckpointAnnouncement route={route} index={disclosure.revealedIndex} />
    </Stack>
  )
}
