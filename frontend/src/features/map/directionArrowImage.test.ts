import { describe, expect, it } from 'vitest'
import { arrowImageData } from './directionArrowImage'

const WHITE = [255, 255, 255] as const
const DARK = [13, 30, 45] as const

function pixel(image: ReturnType<typeof arrowImageData>, x: number, y: number) {
  const offset = (y * image.width + x) * 4
  return Array.from(image.data.slice(offset, offset + 4))
}

describe('the arrow image is a bright chevron with a thin dark halo (REQ-08, FE-07)', () => {
  const image = arrowImageData(WHITE, DARK)

  it('is a square image with four bytes per pixel', () => {
    expect(image.width).toBe(image.height)
    expect(image.data).toHaveLength(image.width * image.height * 4)
  })

  it('is solid white on the tip of the chevron', () => {
    expect(pixel(image, 32, 22)).toEqual([255, 255, 255, 255])
  })

  it('is solid white in the middle of an arm', () => {
    expect(pixel(image, 22, 14)).toEqual([255, 255, 255, 255])
  })

  it('has a dark, solid halo just outside the white', () => {
    const [red, green, blue, alpha] = pixel(image, 22, 19)

    expect([red, green, blue]).toEqual([...DARK])
    expect(alpha).toBe(255)
  })

  it('is fully transparent away from the chevron', () => {
    expect(pixel(image, 0, 0)[3]).toBe(0)
    expect(pixel(image, 4, 22)[3]).toBe(0)
  })

  it('points right: it is open at the back and closed at the tip', () => {
    expect(pixel(image, 12, 22)[3]).toBe(0)
    expect(pixel(image, 28, 22)[3]).toBe(255)
  })

  it('takes both colours from its arguments', () => {
    const custom = arrowImageData([10, 20, 30], [200, 100, 50])

    expect(pixel(custom, 32, 22).slice(0, 3)).toEqual([10, 20, 30])
  })
})
