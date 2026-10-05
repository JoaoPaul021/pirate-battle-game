import { expect, test } from '@playwright/test'

test('opens the main menu', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})

test('keeps saved options after reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Options' }).click()

  await page.getByRole('button', { name: 'Increase Game session time' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await page.reload()

  await page.getByRole('button', { name: 'Options' }).click()
  await expect(page.getByText('150s')).toBeVisible()
})

test('starts the PixiJS game scene', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play' }).click()

  await expect(page.getByTestId('game-canvas').locator('canvas')).toBeVisible()
  await expect(page.getByText('00:00')).not.toBeVisible()
})
