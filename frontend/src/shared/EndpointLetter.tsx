import { styled } from '@mui/material/styles'

export type EndpointLetterName = 'A' | 'B'

const SMALL_PX = 22
const PIN_PX = 28

interface LetterShapeProps {
  letter: EndpointLetterName
  size: 'small' | 'pin'
}

// One look for the start and the destination on the map, in the form and in the trip summary.
// Shape carries the difference as well as the letter: a round A, a square B.
const LetterShape = styled('span', {
  shouldForwardProp: (name) => name !== 'letter' && name !== 'size',
})<LetterShapeProps>(({ theme, letter, size }) => {
  const sidePx = size === 'pin' ? PIN_PX : SMALL_PX
  return {
    display: 'inline-grid',
    placeItems: 'center',
    flexShrink: 0,
    width: sidePx,
    height: sidePx,
    borderRadius: letter === 'A' ? '50%' : theme.spacing(0.5),
    border: `2px solid ${theme.palette.common.white}`,
    backgroundColor: letter === 'A' ? theme.palette.primary.main : theme.palette.text.primary,
    color: theme.palette.background.default,
    fontSize: size === 'pin' ? '1rem' : '0.75rem',
    fontWeight: 'bold',
    lineHeight: 1,
    boxSizing: 'border-box',
    ...(size === 'pin' && { boxShadow: theme.shadows[3] }),
  }
})

interface EndpointLetterProps {
  letter: EndpointLetterName
  size?: 'small' | 'pin'
}

export function EndpointLetter({ letter, size = 'small' }: EndpointLetterProps) {
  return (
    <LetterShape letter={letter} size={size} aria-hidden="true">
      {letter}
    </LetterShape>
  )
}
