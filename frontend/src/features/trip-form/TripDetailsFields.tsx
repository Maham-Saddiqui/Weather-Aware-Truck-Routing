import Skeleton from '@mui/material/Skeleton'
import { lazy, Suspense } from 'react'
import { LoadField } from './LoadField'
import { SpacingField } from './SpacingField'
import type { useTripForm } from './useTripForm'

const DepartureField = lazy(() =>
  import('./DepartureField').then((module) => ({ default: module.DepartureField })),
)

export function TripDetailsFields({ form }: { form: ReturnType<typeof useTripForm> }) {
  const { values, errors, change } = form
  return (
    <>
      <Suspense fallback={<Skeleton variant="rounded" height={56} />}>
        <DepartureField
          value={values.departure}
          zone={form.originZone}
          error={errors.departure}
          onChange={(departure) => {
            change({ departure })
          }}
        />
      </Suspense>
      <LoadField
        value={values.loadLb}
        error={errors.loadLb}
        onChange={(loadLb) => {
          change({ loadLb })
        }}
      />
      <SpacingField
        value={values.spacingMiles}
        onChange={(spacingMiles) => {
          change({ spacingMiles })
        }}
      />
    </>
  )
}
