import { lazy, Suspense } from 'react'

export type OpenDialog = 'credits' | 'risk' | null

const CreditsDialog = lazy(() =>
  import('./CreditsDialog').then((module) => ({ default: module.CreditsDialog })),
)
const RiskInfoDialog = lazy(() =>
  import('./RiskInfoDialog').then((module) => ({ default: module.RiskInfoDialog })),
)

interface LazyDialogsProps {
  openDialog: OpenDialog
  onClose: () => void
}

export function LazyDialogs({ openDialog, onClose }: LazyDialogsProps) {
  return (
    <Suspense fallback={null}>
      {openDialog === 'credits' && <CreditsDialog open onClose={onClose} />}
      {openDialog === 'risk' && <RiskInfoDialog open onClose={onClose} />}
    </Suspense>
  )
}
