import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

// MapLibre 6 cannot find its own worker once Vite has bundled it, so the worker file is named explicitly.
export const mapLib = import('maplibre-gl').then((maplibre) => {
  maplibre.setWorkerUrl(workerUrl)
  return maplibre
})
