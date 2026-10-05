import { expect, test } from '@playwright/test'

test('opens the project shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible()
})
