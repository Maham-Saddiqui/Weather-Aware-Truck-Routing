import { useEffect, useRef, useState } from 'react'

// The button or field the driver just used disappears, so focus moves to what replaced it.
export function useSummaryToggle(startsCollapsed: boolean) {
  const [showsSummary, setShowsSummary] = useState(startsCollapsed)
  const root = useRef<HTMLDivElement>(null)
  const mustMoveFocus = useRef(false)
  const collapse = (shouldCollapse: boolean) => {
    mustMoveFocus.current = true
    setShowsSummary(shouldCollapse)
  }

  useEffect(() => {
    if (!mustMoveFocus.current) return
    mustMoveFocus.current = false
    root.current?.querySelector<HTMLElement>(showsSummary ? 'button' : 'input')?.focus()
  }, [showsSummary])

  return { root, showsSummary, collapse }
}
