import { useEffect, useState } from 'react'

export function useElapsedFlag(isActive: boolean, delayMs: number): boolean {
  const [hasElapsed, setHasElapsed] = useState(false)

  useEffect(() => {
    if (!isActive) return
    const timer = setTimeout(() => {
      setHasElapsed(true)
    }, delayMs)
    return () => {
      clearTimeout(timer)
      setHasElapsed(false)
    }
  }, [isActive, delayMs])

  return isActive && hasElapsed
}

export function useDebouncedValue<Value>(value: Value, pauseMs: number): Value {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value)
    }, pauseMs)
    return () => {
      clearTimeout(timer)
    }
  }, [value, pauseMs])

  return debounced
}
