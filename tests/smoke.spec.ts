import { expect, test } from '@playwright/test'
import { gotoApp, resetState } from './helpers'

test('opens the main menu', async ({ page }) => {
  await resetState(page)
  await gotoApp(page)

  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Options' })).toBeVisible()
})
