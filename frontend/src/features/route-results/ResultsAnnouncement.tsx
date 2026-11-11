import { HiddenStatus } from './HiddenStatus'
import type { ResultsPhase } from './tripResults'

const READY_PHASES: readonly ResultsPhase[] = ['partial', 'complete']

// The text is the same for the first route and for the full set, so it is read once per trip.
export function ResultsAnnouncement({ phase }: { phase: ResultsPhase }) {
  return (
    <HiddenStatus>{READY_PHASES.includes(phase) ? 'Route options are ready' : ''}</HiddenStatus>
  )
}
