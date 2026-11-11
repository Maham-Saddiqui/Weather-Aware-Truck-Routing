import { skipToken, useQuery } from '@tanstack/react-query'
import { SUGGESTION_MIN_CHARACTERS, SUGGESTION_PAUSE_MS } from '../../shared/constants'
import { useDebouncedValue } from '../../shared/timers'
import type { Place } from '../../shared/types'
import { searchPlaces } from './photon'

export function usePlaceSuggestions(typedText: string, chosenLabel: string | undefined) {
  const pausedText = useDebouncedValue(typedText.trim(), SUGGESTION_PAUSE_MS)
  const shouldSearch = pausedText.length >= SUGGESTION_MIN_CHARACTERS && pausedText !== chosenLabel

  const search = useQuery({
    queryKey: ['places', pausedText],
    queryFn: shouldSearch ? ({ signal }) => searchPlaces(pausedText, signal) : skipToken,
  })

  const options: Place[] = shouldSearch ? (search.data ?? []) : []
  return { options, isSearching: search.isFetching, hasFailed: search.isError }
}
