import { useEffect, useState } from 'react'

const IDLE_DEADLINE_MS = 2000
const FALLBACK_DELAY_MS = 200

// Safari has no requestIdleCallback, so a short timer stands in for it.
export function useWhenIdle(): boolean {
  const [isIdle, setIsIdle] = useState(false)
  useEffect(() => {
    const markIdle = () => {
      setIsIdle(true)
    }
    const idleApi: Partial<Pick<Window, 'requestIdleCallback' | 'cancelIdleCallback'>> = window
    if (idleApi.requestIdleCallback && idleApi.cancelIdleCallback) {
      const handle = idleApi.requestIdleCallback(markIdle, { timeout: IDLE_DEADLINE_MS })
      return () => idleApi.cancelIdleCallback?.(handle)
    }
    const timer = setTimeout(markIdle, FALLBACK_DELAY_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [])
  return isIdle
}
