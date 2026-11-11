import type { Page } from '@playwright/test'
import { expect } from './test'

export const recommendationBanner = (page: Page) =>
  page.getByRole('alert').filter({ hasText: 'Recommended: Route' })

export async function expectThreeRoutesPlanned(page: Page) {
  await expect(recommendationBanner(page)).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(3)
}

export async function planChicagoToDenver(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Chicago to Denver' }).click()
  await expectThreeRoutesPlanned(page)
}

export function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}
