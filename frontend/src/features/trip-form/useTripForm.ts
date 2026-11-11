import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
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

function shownErrors(
  check: ReturnType<typeof checkTripForm>,
  zoneBlock: string | undefined,
): TripFormErrors {
  const checkErrors: TripFormErrors = check.isValid ? {} : check.errors
  return { ...checkErrors, ...(zoneBlock && { departure: zoneBlock }) }
}

type SetValues = Dispatch<SetStateAction<TripFormValues>>

function valueChanges(setValues: SetValues, markDepartureEntered: () => void) {
  return {
    change: (changes: Partial<TripFormValues>) => {
      if ('departure' in changes) markDepartureEntered()
      setValues((previous) => ({ ...previous, ...changes }))
    },
    swapPlaces: () => {
      setValues((previous) => ({
        ...previous,
        origin: previous.destination,
        destination: previous.origin,
      }))
    },
  }
}

export function useTripForm(
  initialTrip: TripRequest | null,
  needsReview: boolean,
  onSubmit: (trip: TripRequest) => void,
) {
  const [entered, setEntered] = useState(() =>
    initialTrip ? valuesFromTrip(initialTrip) : defaultValues(),
  )
  const [isDepartureEntered, setIsDepartureEntered] = useState(initialTrip !== null)
  const [hasAttempted, setHasAttempted] = useState(needsReview)
  const [rejectedSubmits, setRejectedSubmits] = useState(0)
  const originZone = useOriginTimeZone(entered.origin)
  // Until the driver sets a time, the default is 08:00 tomorrow on the clock they see, so it follows the origin's zone.
  const defaultDeparture = useMemo(
    () => tomorrowMorning(dayjs(), originZone.timeZone),
    [originZone.timeZone],
  )
  const values = isDepartureEntered ? entered : { ...entered, departure: defaultDeparture }

  const check = checkTripForm(values, dayjs())
  const zoneBlock = zoneBlockMessage(originZone.state)
  const errors = hasAttempted ? shownErrors(check, zoneBlock) : {}

  return {
    values,
    errors,
    originZone,
    rejectedSubmits,
    ...valueChanges(setEntered, () => {
      setIsDepartureEntered(true)
    }),
    submit: () => {
      setHasAttempted(true)
      if (check.isValid && !zoneBlock) onSubmit(check.trip)
      else setRejectedSubmits((count) => count + 1)
    },
    submitTrip: (trip: TripRequest) => {
      setEntered(valuesFromTrip(trip))
      setIsDepartureEntered(true)
      onSubmit(trip)
    },
  }
}
