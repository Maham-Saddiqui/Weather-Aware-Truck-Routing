import { useState } from 'react'

const STORAGE_KEY = 'results-panel-collapsed'

function readRemembered(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function remember(isCollapsed: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(isCollapsed))
  } catch {
    return
  }
}

// `arrival` names a new trip result or error; the panel opens for each new one so the driver never misses it.
// Opening for an arrival does not change the remembered choice. Until a first result or error exists the
// page is empty and the form lives in the panel, so the panel stays open and the remembered choice waits.
export function usePanelCollapse(arrival: string | null) {
  const [isCollapsed, setIsCollapsed] = useState(readRemembered)
  const [seenArrival, setSeenArrival] = useState(arrival)
  if (arrival !== null && arrival !== seenArrival) {
    setSeenArrival(arrival)
    setIsCollapsed(false)
  }
  const hasTrip = seenArrival !== null
  const toggle = () => {
    remember(!isCollapsed)
    setIsCollapsed(!isCollapsed)
  }
  return { isCollapsed: hasTrip && isCollapsed, hasTrip, toggle }
}
