import { useState } from 'react'
import { DEFAULT_SPACING_MILES } from '../../shared/constants'
import { browserTimeZone, dayjs, tomorrowMorning } from '../../shared/time'
import type { TripRequest } from '../../shared/types'
import { useOriginTimeZone, zoneBlockMessage } from './useOriginTimeZone'
import { checkTripForm, type TripFormErrors, type TripFormValues } from './validation'

function defaultValues(): TripFormValues {
  return {
    origin: null,
    destination: null,
    departure: tomorrowMorning(dayjs(), browserTimeZone()),
    loadLb: '',
    spacingMiles: DEFAULT_SPACING_MILES,
  }
}

function valuesFromTrip(trip: TripRequest): TripFormValues {
  return {
    origin: trip.origin,
    destination: trip.destination,
    departure: dayjs(trip.departure_utc),
    loadLb: String(trip.load_lb),
    spacingMiles: trip.spacing_miles,
  }
}

export function useTripForm(
  initialTrip: TripRequest | null,
  needsReview: boolean,
  onSubmit: (trip: TripRequest) => void,
) {
  const [values, setValues] = useState(() =>
    initialTrip ? valuesFromTrip(initialTrip) : defaultValues(),
  )
  const [hasAttempted, setHasAttempted] = useState(needsReview)
  const originZone = useOriginTimeZone(values.origin)

  const check = checkTripForm(values, dayjs())
  const zoneBlock = zoneBlockMessage(originZone.state)
  const checkErrors: TripFormErrors = check.isValid ? {} : check.errors
  const errors: TripFormErrors = hasAttempted
    ? { ...checkErrors, ...(zoneBlock && { departure: zoneBlock }) }
    : {}

  return {
    values,
    errors,
    originZone,
    change: (changes: Partial<TripFormValues>) => {
      setValues((previous) => ({ ...previous, ...changes }))
    },
    swapPlaces: () => {
      setValues((previous) => ({
        ...previous,
        origin: previous.destination,
        destination: previous.origin,
      }))
    },
    submit: () => {
      setHasAttempted(true)
      if (check.isValid && !zoneBlock) onSubmit(check.trip)
    },
    submitTrip: (trip: TripRequest) => {
      setValues(valuesFromTrip(trip))
      onSubmit(trip)
    },
  }
}
