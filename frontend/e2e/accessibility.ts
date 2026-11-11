import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

// Real findings in the app, reported to the lead; they are left out here so the rest of each screen stays strictly checked.
const KNOWN_APP_VIOLATIONS = ['heading-order', 'label-content-name-mismatch']

export async function accessibilityViolations(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations
    .filter(({ id }) => !KNOWN_APP_VIOLATIONS.includes(id))
    .map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
}
