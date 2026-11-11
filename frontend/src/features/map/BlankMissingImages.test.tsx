import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BlankMissingImages, addBlankImageIfMissing } from './BlankMissingImages'

const stub = vi.hoisted(() => ({
  resolver: null as ((id: string) => void) | null,
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
  setMissingStyleImageResolver: (resolver: ((id: string) => void) | null) => {
    stub.resolver = resolver
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

  it('supplies the blank image when the map asks for a missing one, and stops when removed', () => {
    stub.images.clear()
    stub.addImage.mockClear()
    const { unmount } = render(<BlankMissingImages />)

    stub.resolver?.('circle-11')
    expect(stub.addImage).toHaveBeenCalledTimes(1)

    unmount()
    expect(stub.resolver).toBeNull()
  })
})
