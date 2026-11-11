import { DepartureField } from './DepartureField'
import { LoadField } from './LoadField'
import { SpacingField } from './SpacingField'
import type { useTripForm } from './useTripForm'

export function TripDetailsFields({ form }: { form: ReturnType<typeof useTripForm> }) {
  const { values, errors, change } = form
  return (
    <>
      <DepartureField
        value={values.departure}
        timeZone={form.timeZone}
        hasOrigin={values.origin !== null}
        error={errors.departure}
        onChange={(departure) => {
          change({ departure })
        }}
      />
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
