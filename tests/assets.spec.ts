import { expect, test } from '@playwright/test'
import { gotoApp, resetState } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetState(page)
})

test('shows an asset loading failure and allows a clean retry', async ({ page }) => {
  await gotoApp(page, '/?e2e=1&failAsset=1')
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('alert')).toContainText('Unable to start the battle')

  await gotoApp(page, '/?e2e=1')
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Pause match' })).toBeEnabled()
})
