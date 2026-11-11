import useMediaQuery from '@mui/material/useMediaQuery'
import { useEffect, useRef, useState, type RefObject } from 'react'

const HIGHLIGHT_MS = 2500

function scrollToCheckpoint(section: HTMLElement | null, behavior: ScrollBehavior) {
  section?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', behavior })
  section?.scrollIntoView({ block: 'start', behavior })
}

// A checkpoint chosen on the map has no sign of life on the map side, so the section opens, scrolls to it and marks the row.
// A checkpoint chosen in the list needs none of that: the driver is already looking at it.
export function useCheckpointDisclosure(
  selectedIndex: number | null,
  section: RefObject<HTMLElement | null>,
  startsOpen: boolean,
) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [isOpen, setIsOpen] = useState(startsOpen)
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null)
  const isPickedInList = useRef(false)

  useEffect(() => {
    if (selectedIndex === null) return
    if (isPickedInList.current) {
      isPickedInList.current = false
      return
    }
    setIsOpen(true)
    setRevealedIndex(selectedIndex)
  }, [selectedIndex])

  useEffect(() => {
    if (revealedIndex === null) return
    const behavior = prefersReducedMotion ? 'auto' : 'smooth'
    scrollToCheckpoint(section.current, behavior)
    const timer = setTimeout(() => {
      setRevealedIndex(null)
    }, HIGHLIGHT_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [revealedIndex, prefersReducedMotion, section])

  return {
    isOpen,
    revealedIndex,
    toggle: () => {
      setIsOpen((wasOpen) => !wasOpen)
    },
    markPickedInList: () => {
      isPickedInList.current = true
    },
  }
}
