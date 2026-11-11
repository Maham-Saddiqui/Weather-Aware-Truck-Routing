import Box from '@mui/material/Box'
import type { ResultsPhase } from './tripResults'

const READY_PHASES: readonly ResultsPhase[] = ['partial', 'complete']

// Mounted for the whole session so screen readers register it before the text arrives.
// The text is the same for the first route and for the full set, so it is read once per trip.
export function ResultsAnnouncement({ phase }: { phase: ResultsPhase }) {
  return (
    <Box
      role="status"
      sx={{
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clipPath: 'inset(50%)',
        whiteSpace: 'nowrap',
      }}
    >
      {READY_PHASES.includes(phase) ? 'Route options are ready' : ''}
    </Box>
  )
}
