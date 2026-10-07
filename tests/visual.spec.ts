import { expect, test } from '@playwright/test'
import { advanceGame, gotoApp, openGame, resetState } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetState(page)
})

test('menu visual baseline', async ({ page }) => {
  await gotoApp(page, '/?e2e=1')
  const menu = page.locator('.main-menu')

  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()

  await page.evaluate(async () => {
    await document.fonts.ready

    const sources = [
      '/png/default/ui/menu/panel_menu.png',
      '/png/default/ui/menu/title_pirate_battle.png',
      '/png/default/ui/menu/button_primary_normal.png',
      '/png/default/ui/menu/button_secondary_normal.png',
    ]

    await Promise.all([
      ...Array.from(document.images).map((image) =>
        image.complete ? Promise.resolve() : image.decode().catch(() => undefined),
      ),
      ...sources.map(
        (source) =>
          new Promise<void>((resolve) => {
            const image = new Image()
            image.onload = () => resolve()
            image.onerror = () => resolve()
            image.src = source
          }),
      ),
    ])
  })

  await page.mouse.move(1, 1)

  await expect(menu).toHaveScreenshot('menu.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.03,
  })
})

test('stable arena visual baseline', async ({ page }) => {
  await openGame(page, 'e2e=1&spawnMs=100000')
  await expect(page).toHaveScreenshot('arena.png', { animations: 'disabled' })
})

test('result visual baseline', async ({ page }) => {
  await openGame(page, 'e2e=1&durationMs=1000&spawnMs=100000')
  await advanceGame(page, 1.1)

  const resultDialog = page.getByRole('dialog', { name: 'Battle Complete' })

  await expect(resultDialog).toBeVisible()
  await expect(resultDialog.getByText('Match registered')).toBeVisible()
  await expect(resultDialog).toHaveScreenshot('result.png', {
    animations: 'disabled',
  })
})
