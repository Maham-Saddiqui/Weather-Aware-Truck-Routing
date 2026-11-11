const ARRIVAL_LABEL_HALF_WIDTH_PX = 32

export interface ArrivalMark {
  hour: number
  percent: number
  description: string
}

// The forecast beyond arrival is only worth pointing out when there is some of it left on the slider.
export function arrivalMarkFor(arrivalHour: number, lastHour: number): ArrivalMark | null {
  if (arrivalHour >= lastHour) {
    return null
  }
  return {
    hour: arrivalHour,
    percent: (arrivalHour / lastHour) * 100,
    description: `Arrival at +${String(arrivalHour)} h; the forecast continues to +${String(lastHour)} h`,
  }
}

// Keeps the word "Arrival" inside the track at both ends while the tick stays at the exact hour.
export function arrivalLabelLeft(percent: number): string {
  const half = `${String(ARRIVAL_LABEL_HALF_WIDTH_PX)}px`
  return `clamp(${half}, ${String(percent)}%, calc(100% - ${half}))`
}
