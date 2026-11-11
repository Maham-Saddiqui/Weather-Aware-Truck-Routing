import { useState } from 'react'

export interface FadingHours {
  hourOfLayer: readonly [number, number]
  frontLayer: 0 | 1
}

// MapLibre cannot fade a colour that depends on each point's own data, so two layers take turns: the one that
// is not showing is given the new hour and fades in while the other fades out (FE-08, FE-09).
export function useCrossfadingHours(hourOffset: number): FadingHours {
  const [fading, setFading] = useState<FadingHours>({
    hourOfLayer: [hourOffset, hourOffset],
    frontLayer: 0,
  })
  if (fading.hourOfLayer[fading.frontLayer] !== hourOffset) {
    const [first, second] = fading.hourOfLayer
    setFading(
      fading.frontLayer === 0
        ? { hourOfLayer: [first, hourOffset], frontLayer: 1 }
        : { hourOfLayer: [hourOffset, second], frontLayer: 0 },
    )
  }
  return fading
}
