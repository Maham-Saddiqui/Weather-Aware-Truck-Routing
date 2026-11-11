import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './test'

test.describe('first screen (REQ-11, REQ-13, NFR-03)', () => {
  test('shows the product, the tagline and the four example trips', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Weather-Aware Truck Routing')
    await expect(page.getByRole('button', { name: 'Chicago to Denver' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Credits' })).toBeVisible()
  })

  test('has no automatically detectable accessibility violations', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Plan your first trip' })).toBeVisible()

    const { violations } = await new AxeBuilder({ page }).analyze()

    expect(violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([])
  })
})
