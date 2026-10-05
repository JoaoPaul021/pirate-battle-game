import { expect, test } from '@playwright/test'

test('opens the main menu', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Options' })).toBeVisible()
})

test('persists game options', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Options' }).click()

  await page.getByRole('button', { name: 'Increase game session time' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Options' }).click()

  await expect(page.getByText('150 s')).toBeVisible()
})
