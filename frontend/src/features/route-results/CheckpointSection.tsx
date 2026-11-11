import Stack from '@mui/material/Stack'
import { useTheme } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useState } from 'react'
import type { Route } from '../../shared/types'
import { CheckpointDetails } from './CheckpointDetails'
import { CheckpointList } from './CheckpointList'
import { CheckpointsToggle } from './CheckpointsToggle'

interface CheckpointSectionProps {
  route: Route
  routeNumber: number
  selectedCheckpointIndex: number | null
  onSelectCheckpoint: (routeId: string, checkpointIndex: number) => void
}

// Closed on a phone, where fifty rows would push everything else off the page; open on a wide screen.
export function CheckpointSection({ routeNumber, ...list }: CheckpointSectionProps) {
  const isPhone = useMediaQuery(useTheme().breakpoints.down('md'))
  const [isOpen, setIsOpen] = useState(!isPhone)
  const selected = list.route.checkpoints.find(
    (checkpoint) => checkpoint.index === list.selectedCheckpointIndex,
  )
  return (
    <Stack spacing={1} component="section" aria-labelledby="checkpoints-title">
      <CheckpointsToggle
        titleId="checkpoints-title"
        panelId="checkpoints-panel"
        routeNumber={routeNumber}
        checkpointCount={list.route.checkpoints.length}
        isOpen={isOpen}
        onToggle={() => {
          setIsOpen((wasOpen) => !wasOpen)
        }}
      />
      {isOpen && (
        <Stack spacing={1} id="checkpoints-panel">
          <div aria-live="polite">
            {selected ? (
              <CheckpointDetails checkpoint={selected} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Select a checkpoint to see its wind, rain, snow and estimated arrival.
              </Typography>
            )}
          </div>
          <CheckpointList key={list.route.id} {...list} />
        </Stack>
      )}
    </Stack>
  )
}
