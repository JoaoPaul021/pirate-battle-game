import type { GameConfig } from '../../config/gameConfig'
import type { InputState, PlayerState, RectObstacle } from '../types'

const circleIntersectsRect = (
  x: number,
  y: number,
  radius: number,
  rect: RectObstacle,
) => {
  const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.width))
  const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.height))
  const dx = x - closestX
  const dy = y - closestY

  return dx * dx + dy * dy < radius * radius
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export class GameSimulation {
  readonly player: PlayerState
  readonly obstacles: RectObstacle[]

  private elapsedMs = 0
  private score = 0
  private finished = false

  constructor(private readonly config: GameConfig) {
    this.player = {
      x: 640,
      y: 560,
      rotation: 0,
      health: config.player.maxHealth,
    }

    this.obstacles = [
      { x: 78, y: 74, width: 338, height: 214 },
      { x: 850, y: 390, width: 340, height: 236 },
    ]
  }

  update(deltaSeconds: number, input: InputState) {
    if (this.finished) {
      return
    }

    this.elapsedMs = Math.min(
      this.elapsedMs + deltaSeconds * 1000,
      this.config.sessionDurationMs,
    )

    if (this.elapsedMs >= this.config.sessionDurationMs) {
      this.finished = true
      return
    }

    const turnDirection = Number(input.turnRight) - Number(input.turnLeft)
    this.player.rotation +=
      turnDirection * this.config.player.rotationSpeed * deltaSeconds

    if (!input.forward) {
      return
    }

    const distance = this.config.player.moveSpeed * deltaSeconds
    const nextX = this.player.x + Math.sin(this.player.rotation) * distance
    const nextY = this.player.y - Math.cos(this.player.rotation) * distance
    const radius = this.config.player.collisionRadius
    const { width, height, padding } = this.config.arena

    const boundedX = clamp(nextX, padding + radius, width - padding - radius)
    const boundedY = clamp(nextY, padding + radius, height - padding - radius)
    const blocked = this.obstacles.some((obstacle) =>
      circleIntersectsRect(boundedX, boundedY, radius, obstacle),
    )

    if (!blocked) {
      this.player.x = boundedX
      this.player.y = boundedY
    }
  }

  getRemainingSeconds() {
    return Math.max(
      0,
      Math.ceil((this.config.sessionDurationMs - this.elapsedMs) / 1000),
    )
  }

  getScore() {
    return this.score
  }

  isFinished() {
    return this.finished
  }
}
