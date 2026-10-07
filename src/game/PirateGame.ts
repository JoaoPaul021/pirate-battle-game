import { Application } from 'pixi.js'
import type { GameConfig } from '../config/gameConfig'
import { GameAudio } from './audio/GameAudio'
import { GameInput } from './input/GameInput'
import { GameRenderer } from './rendering/GameRenderer'
import { GameSimulation } from './simulation/GameSimulation'
import { createSeededRandom, isE2EMode } from './testing/testMode'
import type {
  GameHudState,
  InputAction,
  MatchSummary,
  PauseReason,
} from './types'

type PirateGameCallbacks = {
  onReady: () => void
  onHudChange: (state: GameHudState) => void
  onError: (message: string) => void
  onPauseChange: (paused: boolean, reason: PauseReason | null) => void
  onMatchEnd: (summary: MatchSummary) => void
}

export class PirateGame {
  private readonly app = new Application()
  private readonly input = new GameInput()
  private readonly audio = new GameAudio()
  private readonly simulation: GameSimulation
  private renderer?: GameRenderer
  private resizeObserver?: ResizeObserver
  private destroyed = false
  private initialized = false
  private ready = false
  private paused = false
  private finishedSent = false
  private lastHudSignature = ''

  constructor(
    private readonly host: HTMLDivElement,
    private readonly config: GameConfig,
    private readonly callbacks: PirateGameCallbacks,
  ) {
    this.simulation = new GameSimulation(
      config,
      isE2EMode() ? createSeededRandom() : Math.random,
    )
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
      window.addEventListener('keydown', this.handlePauseKey)
      if (!isE2EMode()) {
        window.addEventListener('blur', this.handleFocusLoss)
        document.addEventListener('visibilitychange', this.handleVisibilityChange)
        this.app.ticker.add(this.tick)
      }
      this.ready = true
      this.audio.start()
      this.emitHud(true)
      this.callbacks.onReady()
    } catch (error) {
      if (!this.destroyed) {
        const message =
          error instanceof Error ? error.message : 'Unable to load game assets.'
        this.callbacks.onError(message)
        this.destroy()
      }
    }
  }

  setAction(action: InputAction, active: boolean) {
    if (this.paused || this.simulation.isFinished()) {
      return
    }

    this.input.setAction(action, active)
  }

  clearInput() {
    this.input.clear()
  }

  togglePause() {
    if (this.paused) {
      this.resume()
    } else {
      this.pause('manual')
    }
  }

  pause(reason: PauseReason) {
    if (!this.ready || this.paused || this.simulation.isFinished()) {
      return
    }

    this.paused = true
    this.input.clear()
    this.audio.pause()
    this.callbacks.onPauseChange(true, reason)
  }

  resume() {
    if (!this.ready || !this.paused || this.simulation.isFinished()) {
      return
    }

    this.paused = false
    this.input.clear()
    this.audio.resume()
    this.callbacks.onPauseChange(false, null)
  }

  private readonly handleFocusLoss = () => {
    this.pause('focus')
  }

  private readonly handleVisibilityChange = () => {
    if (document.hidden) {
      this.pause('focus')
    }
  }

  private readonly handlePauseKey = (event: KeyboardEvent) => {
    if (event.code !== 'Escape' || event.repeat) {
      return
    }

    event.preventDefault()
    this.togglePause()
  }

  private readonly tick = () => {
    const deltaSeconds = Math.min(this.app.ticker.deltaMS / 1000, 0.05)
    this.runFrame(deltaSeconds)
  }

  private runFrame(deltaSeconds: number) {
    if (!this.ready || this.destroyed || this.paused) {
      return
    }

    this.simulation.update(deltaSeconds, this.input.getState())
    const events = this.simulation.consumeEvents()
    this.renderer?.renderFrame(deltaSeconds, events)
    this.audio.handleEvents(events)
    this.emitHud(false)

    if (this.simulation.isFinished() && !this.finishedSent) {
      const summary = this.simulation.getMatchSummary()

      if (!summary) {
        return
      }

      this.finishedSent = true
      this.input.clear()
      this.audio.finish(summary.reason)
      this.callbacks.onMatchEnd(summary)
    }
  }

  advanceForTesting(seconds: number) {
    if (!isE2EMode() || seconds <= 0) {
      return
    }

    let remaining = seconds

    while (remaining > 0 && !this.simulation.isFinished()) {
      const step = Math.min(remaining, 1 / 60)
      this.runFrame(step)
      remaining -= step
    }
  }

  simulateFocusLossForTesting() {
    if (isE2EMode()) {
      this.pause('focus')
    }
  }

  getDebugState() {
    return this.simulation.getDebugState()
  }

  private emitHud(force: boolean) {
    const hud: GameHudState = {
      health: this.simulation.player.health,
      maxHealth: this.config.player.maxHealth,
      score: this.simulation.getScore(),
      remainingSeconds: this.simulation.getRemainingSeconds(),
      enemyCount: this.simulation.enemies.length,
    }
    const signature = `${hud.health}:${hud.score}:${hud.remainingSeconds}:${hud.enemyCount}`

    if (!force && signature === this.lastHudSignature) {
      return
    }

    this.lastHudSignature = signature
    this.callbacks.onHudChange(hud)
  }

  destroy() {
    if (this.destroyed) {
      return
    }

    this.destroyed = true
    this.ready = false
    this.resizeObserver?.disconnect()
    this.input.destroy()
    this.audio.destroy()
    window.removeEventListener('blur', this.handleFocusLoss)
    window.removeEventListener('keydown', this.handlePauseKey)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    if (this.initialized) {
      this.app.ticker.remove(this.tick)
      this.app.destroy(true, true)
    }
  }
}
