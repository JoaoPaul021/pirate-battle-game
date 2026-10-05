import { Application } from 'pixi.js'
import type { GameConfig } from '../config/gameConfig'
import { GameInput } from './input/GameInput'
import { GameRenderer } from './rendering/GameRenderer'
import { GameSimulation } from './simulation/GameSimulation'
import type { GameHudState, InputAction } from './types'

type PirateGameCallbacks = {
  onReady: () => void
  onHudChange: (state: GameHudState) => void
  onError: (message: string) => void
  onTimeExpired: () => void
}

export class PirateGame {
  private readonly app = new Application()
  private readonly input = new GameInput()
  private readonly simulation: GameSimulation
  private renderer?: GameRenderer
  private resizeObserver?: ResizeObserver
  private destroyed = false
  private initialized = false
  private ready = false
  private lastHudSecond = -1
  private timeExpiredSent = false

  constructor(
    private readonly host: HTMLDivElement,
    private readonly config: GameConfig,
    private readonly callbacks: PirateGameCallbacks,
  ) {
    this.simulation = new GameSimulation(config)
  }

  async init() {
    try {
      await this.app.init({
        resizeTo: this.host,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        antialias: true,
        backgroundColor: 0x159cc6,
      })
      this.initialized = true

      if (this.destroyed) {
        this.app.destroy(true, true)
        return
      }

      this.host.appendChild(this.app.canvas)
      this.renderer = new GameRenderer(this.app, this.config, this.simulation)
      await this.renderer.init()

      if (this.destroyed) {
        return
      }

      this.resizeObserver = new ResizeObserver(() => {
        this.app.resize()
        this.renderer?.resize()
      })
      this.resizeObserver.observe(this.host)
      this.input.attach()
      this.app.ticker.add(this.tick)
      this.ready = true
      this.emitHud(true)
      this.callbacks.onReady()
    } catch (error) {
      if (!this.destroyed) {
        const message = error instanceof Error ? error.message : 'Unable to load game assets.'
        this.callbacks.onError(message)
        this.destroy()
      }
    }
  }

  setAction(action: InputAction, active: boolean) {
    this.input.setAction(action, active)
  }

  clearInput() {
    this.input.clear()
  }

  private readonly tick = () => {
    if (!this.ready || this.destroyed) {
      return
    }

    const deltaSeconds = this.app.ticker.deltaMS / 1000
    this.simulation.update(deltaSeconds, this.input.getState())
    this.renderer?.renderFrame()
    this.emitHud(false)

    if (this.simulation.isFinished() && !this.timeExpiredSent) {
      this.timeExpiredSent = true
      this.input.clear()
      this.callbacks.onTimeExpired()
    }
  }

  private emitHud(force: boolean) {
    const remainingSeconds = this.simulation.getRemainingSeconds()

    if (!force && remainingSeconds === this.lastHudSecond) {
      return
    }

    this.lastHudSecond = remainingSeconds
    this.callbacks.onHudChange({
      health: this.simulation.player.health,
      maxHealth: this.config.player.maxHealth,
      score: this.simulation.getScore(),
      remainingSeconds,
    })
  }

  destroy() {
    if (this.destroyed) {
      return
    }

    this.destroyed = true
    this.ready = false
    this.resizeObserver?.disconnect()
    this.input.destroy()

    if (this.initialized) {
      this.app.ticker.remove(this.tick)
      this.app.destroy(true, true)
    }
  }
}
