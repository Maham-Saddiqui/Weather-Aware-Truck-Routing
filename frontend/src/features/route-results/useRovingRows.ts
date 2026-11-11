import { useState, type KeyboardEvent } from 'react'

function targetPosition(key: string, current: number, count: number): number | null {
  const targets: Record<string, number> = {
    ArrowDown: Math.min(current + 1, count - 1),
    ArrowUp: Math.max(current - 1, 0),
    Home: 0,
    End: count - 1,
  }
  return targets[key] ?? null
}

// One tab stop for a long list of rows (a hundred checkpoints); arrow keys, Home and End move between them.
export function useRovingRows(rowCount: number, preferredPosition: number) {
  const [focusedPosition, setFocusedPosition] = useState<number | null>(null)
  const tabStopPosition = focusedPosition ?? Math.max(preferredPosition, 0)

  return {
    tabStopPosition,
    rememberRow: setFocusedPosition,
    moveFocus: (event: KeyboardEvent<HTMLElement>) => {
      const target = targetPosition(event.key, tabStopPosition, rowCount)
      if (target === null) return
      event.preventDefault()
      event.currentTarget.querySelectorAll<HTMLElement>('[role="button"]')[target]?.focus()
    },
  }
}
