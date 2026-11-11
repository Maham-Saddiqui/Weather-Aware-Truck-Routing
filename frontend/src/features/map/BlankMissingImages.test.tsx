import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BlankMissingImages, addBlankImageIfMissing } from './BlankMissingImages'

const stub = vi.hoisted(() => ({
  listeners: new Map<string, (event: { id: string }) => void>(),
  images: new Set<string>(),
  addImage:
    vi.fn<(id: string, image: { width: number; height: number; data: Uint8Array }) => void>(),
}))

const mapStub = {
  hasImage: (id: string) => stub.images.has(id),
  addImage: (id: string, image: { width: number; height: number; data: Uint8Array }) => {
    stub.images.add(id)
    stub.addImage(id, image)
  },
  on: (name: string, listener: (event: { id: string }) => void) => {
    stub.listeners.set(name, listener)
  },
  off: (name: string) => {
    stub.listeners.delete(name)
  },
}

vi.mock('@vis.gl/react-maplibre', () => ({ useMap: () => ({ current: mapStub }) }))

describe('a missing basemap icon is drawn as nothing instead of a console warning (NFR-03)', () => {
  it('adds a 1 by 1 transparent image under the missing id', () => {
    stub.images.clear()
    stub.addImage.mockClear()

    addBlankImageIfMissing(mapStub, 'circle-11')

    expect(stub.addImage).toHaveBeenCalledWith('circle-11', {
      width: 1,
      height: 1,
      data: new Uint8Array(4),
    })
  })

  it('leaves an image that already exists alone', () => {
    stub.images.clear()
    stub.addImage.mockClear()
    stub.images.add('airport-11')

    addBlankImageIfMissing(mapStub, 'airport-11')

    expect(stub.addImage).not.toHaveBeenCalled()
  })

  it('listens for the map reporting a missing image and stops listening when removed', () => {
    stub.images.clear()
    stub.addImage.mockClear()
    const { unmount } = render(<BlankMissingImages />)

    stub.listeners.get('styleimagemissing')?.({ id: 'circle-11' })
    expect(stub.addImage).toHaveBeenCalledTimes(1)

    unmount()
    expect(stub.listeners.has('styleimagemissing')).toBe(false)
  })
})
