import Box from '@mui/material/Box'
import type { ReactNode } from 'react'

// Mounted for the whole session so screen readers register it before the text arrives.
// Sizes are strings: in MUI's sx a bare 1 means 100%, which once stretched the whole page.
export function HiddenStatus({ children }: { children: ReactNode }) {
  return (
    <Box
      role="status"
      sx={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        margin: '-1px',
        padding: 0,
        border: 0,
        overflow: 'hidden',
        clipPath: 'inset(50%)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  )
}
