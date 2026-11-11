import Stack from '@mui/material/Stack'
import type { ReactNode } from 'react'
import type { TripRequest } from '../../shared/types'
import { ExampleTrips } from './ExampleTrips'
import { TripFormFields } from './TripFormFields'
import { TripSummary } from './TripSummary'
import { useSummaryToggle } from './useSummaryToggle'
import { useTripForm } from './useTripForm'

interface TripFormProps {
  initialTrip: TripRequest | null
  needsReview: boolean
  isBusy: boolean
  onSubmit: (trip: TripRequest) => void
  summaryActions?: ReactNode
}

export function TripForm({
  initialTrip,
  needsReview,
  isBusy,
  onSubmit,
  summaryActions,
}: TripFormProps) {
  const { root, showsSummary, collapse } = useSummaryToggle(initialTrip !== null && !needsReview)
  const form = useTripForm(initialTrip, needsReview, (trip) => {
    collapse(true)
    onSubmit(trip)
  })

  return (
    <div ref={root}>
      {showsSummary ? (
        <TripSummary
          values={form.values}
          actions={summaryActions}
          departureZone={form.originZone.state === 'found' ? form.originZone.timeZone : null}
          onEdit={() => {
            collapse(false)
          }}
        />
      ) : (
        <Stack spacing={3}>
          <ExampleTrips isBusy={isBusy} onChoose={form.submitTrip} />
          <TripFormFields form={form} isBusy={isBusy} />
        </Stack>
      )}
    </div>
  )
}
