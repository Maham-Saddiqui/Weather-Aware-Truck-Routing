import Skeleton from '@mui/material/Skeleton'
import { lazy, Suspense } from 'react'
import { DEPARTURE_FIELD_HEIGHT_PX } from '../../shared/constants'
import { useWhenIdle } from '../../shared/useWhenIdle'
import { LoadField } from './LoadField'
import { SpacingField } from './SpacingField'
import type { useTripForm } from './useTripForm'

const DepartureField = lazy(() =>
  import('./DepartureField').then((module) => ({ default: module.DepartureField })),
)

const DeparturePlaceholder = () => <Skeleton variant="rounded" height={DEPARTURE_FIELD_HEIGHT_PX} />

// The date picker is large, so it is fetched once the page is idle rather than at first paint.
export function TripDetailsFields({ form }: { form: ReturnType<typeof useTripForm> }) {
  const { values, errors, change } = form
  const isIdle = useWhenIdle()
  return (
    <>
      {isIdle ? (
        <Suspense fallback={<DeparturePlaceholder />}>
          <DepartureField
            value={values.departure}
            zone={form.originZone}
            error={errors.departure}
            onChange={(departure) => {
              change({ departure })
            }}
          />
        </Suspense>
      ) : (
        <DeparturePlaceholder />
      )}
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
