import { useMediaQuery, useTheme } from '@mui/material'
import Stack from '@mui/material/Stack'
import { useEffect, useRef, useState } from 'react'
import type { TripRequest } from '../../shared/types'
import { ExampleTrips } from './ExampleTrips'
import { TripFormFields } from './TripFormFields'
import { TripSummary } from './TripSummary'
import { useTripForm } from './useTripForm'

interface TripFormProps {
  initialTrip: TripRequest | null
  needsReview: boolean
  isBusy: boolean
  onSubmit: (trip: TripRequest) => void
}

export function TripForm({ initialTrip, needsReview, isBusy, onSubmit }: TripFormProps) {
  const isPhone = useMediaQuery(useTheme().breakpoints.down('md'))
  const [isCollapsed, setIsCollapsed] = useState(initialTrip !== null && !needsReview)
  const showsSummary = isPhone && isCollapsed
  const root = useRef<HTMLDivElement>(null)
  const mustMoveFocus = useRef(false)
  const collapse = (shouldCollapse: boolean) => {
    mustMoveFocus.current = true
    setIsCollapsed(shouldCollapse)
  }
  const form = useTripForm(initialTrip, needsReview, (trip) => {
    collapse(true)
    onSubmit(trip)
  })

  // The button or field the driver just used disappears, so focus moves to what replaced it.
  useEffect(() => {
    if (!mustMoveFocus.current) return
    mustMoveFocus.current = false
    root.current?.querySelector<HTMLElement>(showsSummary ? 'button' : 'input')?.focus()
  }, [showsSummary])

  return (
    <div ref={root}>
      {showsSummary ? (
        <TripSummary
          values={form.values}
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
