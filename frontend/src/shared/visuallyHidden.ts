// Read by screen readers, invisible on screen. The sizes are strings on purpose: a bare 1 in `sx` means 100%.
export const VISUALLY_HIDDEN_STYLE = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
} as const
