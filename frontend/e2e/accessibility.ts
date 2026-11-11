import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

export async function accessibilityViolations(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations.map(
    ({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
  )
}
