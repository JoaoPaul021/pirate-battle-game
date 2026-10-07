import { expect, type Page } from '@playwright/test'

export const resetState = async (page: Page) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('pirate-battle-network-scenario', 'success')
  })
  await page.reload()
}

export const openGame = async (page: Page, query = 'e2e=1') => {
  await page.goto(`/?${query}`)
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByTestId('game-canvas').locator('canvas')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause match' })).toBeEnabled()
}

export const snapshotGame = async (page: Page) =>
  page.evaluate(() => {
    const bridge = (window as typeof window & {
      __pirateBattleTest?: { snapshot: () => unknown }
    }).__pirateBattleTest

    if (!bridge) {
      throw new Error('Game test bridge is unavailable.')
    }

    return bridge.snapshot() as {
      player: { x: number; y: number; rotation: number; health: number }
      enemies: Array<{ id: number; type: 'chaser' | 'shooter'; health: number }>
      projectiles: Array<{ id: number; owner: 'player' | 'enemy' }>
      score: number
      elapsedMs: number
      remainingSeconds: number
      finished: boolean
      endReason: 'time' | 'destroyed' | null
    }
  })

export const advanceGame = async (page: Page, seconds: number) => {
  await page.evaluate((value) => {
    const bridge = (window as typeof window & {
      __pirateBattleTest?: { advance: (seconds: number) => void }
    }).__pirateBattleTest

    if (!bridge) {
      throw new Error('Game test bridge is unavailable.')
    }

    bridge.advance(value)
  }, seconds)
}

export const setGameAction = async (
  page: Page,
  action: 'forward' | 'turnLeft' | 'turnRight' | 'fireFront' | 'fireLeft' | 'fireRight',
  active: boolean,
) => {
  await page.evaluate(
    ({ inputAction, isActive }) => {
      const bridge = (window as typeof window & {
        __pirateBattleTest?: {
          setAction: (action: string, active: boolean) => void
        }
      }).__pirateBattleTest

      if (!bridge) {
        throw new Error('Game test bridge is unavailable.')
      }

      bridge.setAction(inputAction, isActive)
    },
    { inputAction: action, isActive: active },
  )
}


export const simulateFocusLoss = async (page: Page) => {
  await page.evaluate(() => {
    const bridge = (window as typeof window & {
      __pirateBattleTest?: { simulateFocusLoss: () => void }
    }).__pirateBattleTest

    if (!bridge) {
      throw new Error('Game test bridge is unavailable.')
    }

    bridge.simulateFocusLoss()
  })
}

export const chooseNetworkScenario = async (page: Page, label: string) => {
  const tools = page.locator('.network-tools')
  const isOpen = await tools.evaluate((element) => (element as HTMLDetailsElement).open)

  if (!isOpen) {
    await tools.locator('summary').click()
  }

  const select = tools.locator('select')
  await select.selectOption({ label })
  const selectedValue = await select.inputValue()

  await expect.poll(async () =>
    page.evaluate(() => localStorage.getItem('pirate-battle-network-scenario')),
  ).toBe(selectedValue)
}
