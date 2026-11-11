// The map area is a size container from the md breakpoint up, so these rules follow the map's own width and
// never apply on a phone, where the panel sits below the map and no container exists.
const TABLET_MAP_MAX_PX = 760
const NARROW_TABLET_MAP_MAX_PX = 540
const ONE_LINE_ARRIVAL_MAP_MIN_PX = 650

export const WHEN_TABLET_MAP = `@container (max-width: ${String(TABLET_MAP_MAX_PX)}px)`
export const WHEN_NARROW_TABLET_MAP = `@container (max-width: ${String(NARROW_TABLET_MAP_MAX_PX)}px)`
export const WHEN_TABLET_MAP_FITS_ARRIVAL_ON_ONE_LINE = `@container (min-width: ${String(ONE_LINE_ARRIVAL_MAP_MIN_PX)}px) and (max-width: ${String(TABLET_MAP_MAX_PX)}px)`
