import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ARROW_IMAGE_ID } from './directionArrowImage'
import { useDirectionArrow } from './useDirectionArrow'

const stub = vi.hoisted(() => {
  const images = new Set<string>()
  const handlers = new Set<() => void>()
  return {
    images,
    handlers,
    width: 600,
    addImage: vi.fn<(id: string, image: object, options: object) => void>((id) => images.add(id)),
    hasImage: (id: string) => images.has(id),
    getContainer: () => ({ clientWidth: stub.width }),
    on: (_name: string, handler: () => void) => handlers.add(handler),
    off: (_name: string, handler: () => void) => handlers.delete(handler),
  }
})

vi.mock('@vis.gl/react-maplibre', () => ({ useMap: () => ({ current: stub }) }))

beforeEach(() => {
  stub.images.clear()
  stub.handlers.clear()
  stub.width = 600
  stub.addImage.mockClear()
})

describe('the direction arrow is registered with the map before it is drawn (REQ-08, FE-08)', () => {
  it('adds the image once, at twice the size it is shown at, and gives the gap for the map width', () => {
    const { result } = renderHook(() => useDirectionArrow('route-1'))

    expect(result.current?.layout['symbol-spacing']).toBe(60)
    expect(stub.addImage).toHaveBeenCalledTimes(1)
    expect(stub.addImage.mock.calls[0]?.[0]).toBe(ARROW_IMAGE_ID)
    expect(stub.addImage.mock.calls[0]?.[2]).toEqual({ pixelRatio: 2 })
  })

  it('gives the layer for the selected route', () => {
    const { result } = renderHook(() => useDirectionArrow('route-2'))

    expect(result.current?.filter).toEqual(['==', ['get', 'routeId'], 'route-2'])
  })

  it('gives a new gap when the map is resized', () => {
    const { result } = renderHook(() => useDirectionArrow('route-1'))

    stub.width = 1600
    act(() => {
      stub.handlers.forEach((handler) => {
        handler()
      })
    })

    expect(result.current?.layout['symbol-spacing']).toBe(150)
  })

  it('adds the image only once when the scene is mounted again on the same map', () => {
    renderHook(() => useDirectionArrow('route-1')).unmount()

    renderHook(() => useDirectionArrow('route-1'))

    expect(stub.addImage).toHaveBeenCalledTimes(1)
  })

  it('stops listening for resizes when the map scene goes away', () => {
    const { unmount } = renderHook(() => useDirectionArrow('route-1'))

    unmount()

    expect(stub.handlers.size).toBe(0)
  })
})
