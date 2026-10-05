import type { GameConfig, WeaponConfig } from '../../config/gameConfig'
import type {
  EnemyState,
  EnemyType,
  GameEvent,
  InputState,
  MatchEndReason,
  MatchSummary,
  PlayerState,
  ProjectileState,
  RectObstacle,
} from '../types'

const TAU = Math.PI * 2

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

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

const circlesIntersect = (
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
) => {
  const dx = ax - bx
  const dy = ay - by
  const radius = ar + br
  return dx * dx + dy * dy <= radius * radius
}

const distanceBetween = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot(ax - bx, ay - by)

const headingVector = (rotation: number) => ({
  x: Math.sin(rotation),
  y: -Math.cos(rotation),
})

const normalizeAngle = (angle: number) => {
  let normalized = angle % TAU

  if (normalized > Math.PI) normalized -= TAU
  if (normalized < -Math.PI) normalized += TAU

  return normalized
}

const rotateToward = (
  current: number,
  target: number,
  maxStep: number,
) => {
  const delta = normalizeAngle(target - current)

  if (Math.abs(delta) <= maxStep) {
    return target
  }

  return current + Math.sign(delta) * maxStep
}

const angleToTarget = (x: number, y: number, targetX: number, targetY: number) =>
  Math.atan2(targetX - x, -(targetY - y))

export class GameSimulation {
  readonly player: PlayerState
  readonly obstacles: RectObstacle[]
  readonly enemies: EnemyState[] = []
  readonly projectiles: ProjectileState[] = []

  private elapsedMs = 0
  private score = 0
  private finished = false
  private endReason: MatchEndReason | null = null
  private spawnAccumulatorMs: number
  private spawnCount = 0
  private entityId = 1
  private projectileId = 1
  private frontCooldownMs = 0
  private broadsideLeftCooldownMs = 0
  private broadsideRightCooldownMs = 0
  private readonly events: GameEvent[] = []

  constructor(
    private readonly config: GameConfig,
    private readonly random: () => number = Math.random,
  ) {
    this.player = {
      x: 640,
      y: 560,
      rotation: 0,
      health: config.player.maxHealth,
      hitFlashMs: 0,
    }

    this.obstacles = [
      { x: 78, y: 74, width: 338, height: 214 },
      { x: 850, y: 390, width: 340, height: 236 },
    ]

    this.spawnAccumulatorMs = config.enemies.spawnIntervalMs
  }

  update(deltaSeconds: number, input: InputState) {
    if (this.finished) {
      return
    }

    const deltaMs = deltaSeconds * 1000
    this.elapsedMs = Math.min(
      this.elapsedMs + deltaMs,
      this.config.sessionDurationMs,
    )

    this.updateTimers(deltaMs)
    this.updatePlayer(deltaSeconds, input)
    this.updatePlayerWeapons(input)
    this.updateSpawns(deltaMs)
    this.updateEnemies(deltaSeconds)
    this.updateProjectiles(deltaSeconds, deltaMs)

    if (this.player.health <= 0) {
      this.finish('destroyed')
      return
    }

    if (this.elapsedMs >= this.config.sessionDurationMs) {
      this.finish('time')
    }
  }

  consumeEvents() {
    return this.events.splice(0)
  }

  getRemainingSeconds() {
    return Math.max(
      0,
      Math.ceil((this.config.sessionDurationMs - this.elapsedMs) / 1000),
    )
  }

  getElapsedSeconds() {
    return Math.min(
      Math.ceil(this.elapsedMs / 1000),
      Math.ceil(this.config.sessionDurationMs / 1000),
    )
  }

  getScore() {
    return this.score
  }

  isFinished() {
    return this.finished
  }

  getMatchSummary(): MatchSummary | null {
    if (!this.finished || !this.endReason) {
      return null
    }

    return {
      score: this.score,
      elapsedSeconds: this.getElapsedSeconds(),
      reason: this.endReason,
    }
  }

  private updateTimers(deltaMs: number) {
    this.frontCooldownMs = Math.max(0, this.frontCooldownMs - deltaMs)
    this.broadsideLeftCooldownMs = Math.max(
      0,
      this.broadsideLeftCooldownMs - deltaMs,
    )
    this.broadsideRightCooldownMs = Math.max(
      0,
      this.broadsideRightCooldownMs - deltaMs,
    )
    this.player.hitFlashMs = Math.max(0, this.player.hitFlashMs - deltaMs)

    for (const enemy of this.enemies) {
      enemy.weaponCooldownMs = Math.max(0, enemy.weaponCooldownMs - deltaMs)
      enemy.hitFlashMs = Math.max(0, enemy.hitFlashMs - deltaMs)
    }
  }

  private updatePlayer(deltaSeconds: number, input: InputState) {
    const turnDirection = Number(input.turnRight) - Number(input.turnLeft)
    this.player.rotation +=
      turnDirection * this.config.player.rotationSpeed * deltaSeconds

    if (!input.forward) {
      return
    }

    this.moveShip(
      this.player,
      this.config.player.collisionRadius,
      this.config.player.moveSpeed * deltaSeconds,
    )
  }

  private updatePlayerWeapons(input: InputState) {
    if (input.fireFront && this.frontCooldownMs <= 0) {
      this.firePlayerFront()
      this.frontCooldownMs = this.config.weapons.front.cooldownMs
    }

    if (input.fireLeft && this.broadsideLeftCooldownMs <= 0) {
      this.fireBroadside(-1)
      this.broadsideLeftCooldownMs = this.config.weapons.broadside.cooldownMs
    }

    if (input.fireRight && this.broadsideRightCooldownMs <= 0) {
      this.fireBroadside(1)
      this.broadsideRightCooldownMs = this.config.weapons.broadside.cooldownMs
    }
  }

  private firePlayerFront() {
    const direction = headingVector(this.player.rotation)
    const originX = this.player.x + direction.x * 40
    const originY = this.player.y + direction.y * 40

    this.spawnProjectile(
      'player',
      originX,
      originY,
      this.player.rotation,
      this.config.weapons.front,
    )
    this.events.push({
      type: 'fire',
      x: originX,
      y: originY,
      rotation: this.player.rotation,
      owner: 'player',
      weapon: 'front',
    })
  }

  private fireBroadside(side: -1 | 1) {
    const weapon = this.config.weapons.broadside
    const fireRotation = this.player.rotation + side * (Math.PI / 2)
    const forward = headingVector(this.player.rotation)
    const sideDirection = headingVector(fireRotation)
    const offsets = [-1, 0, 1]

    for (const index of offsets) {
      const originX =
        this.player.x +
        forward.x * index * this.config.weapons.broadsideSpacing +
        sideDirection.x * 28
      const originY =
        this.player.y +
        forward.y * index * this.config.weapons.broadsideSpacing +
        sideDirection.y * 28

      this.spawnProjectile(
        'player',
        originX,
        originY,
        fireRotation,
        weapon,
      )
    }

    this.events.push({
      type: 'fire',
      x: this.player.x + sideDirection.x * 34,
      y: this.player.y + sideDirection.y * 34,
      rotation: fireRotation,
      owner: 'player',
      weapon: 'broadside',
    })
  }

  private updateSpawns(deltaMs: number) {
    this.spawnAccumulatorMs += deltaMs

    while (this.spawnAccumulatorMs >= this.config.enemies.spawnIntervalMs) {
      this.spawnAccumulatorMs -= this.config.enemies.spawnIntervalMs
      this.spawnEnemy()
    }
  }

  private spawnEnemy() {
    const position = this.findSpawnPosition()

    if (!position) {
      return
    }

    const type = this.nextEnemyType()
    const settings =
      type === 'chaser'
        ? this.config.enemies.chaser
        : this.config.enemies.shooter

    this.enemies.push({
      id: this.entityId++,
      type,
      x: position.x,
      y: position.y,
      rotation: angleToTarget(
        position.x,
        position.y,
        this.player.x,
        this.player.y,
      ),
      health: settings.maxHealth,
      maxHealth: settings.maxHealth,
      collisionRadius: settings.collisionRadius,
      weaponCooldownMs:
        type === 'shooter' ? this.config.enemies.shooter.weapon.cooldownMs * 0.5 : 0,
      hitFlashMs: 0,
    })
  }

  private nextEnemyType(): EnemyType {
    const guaranteed = this.spawnCount === 0 ? 'chaser' : this.spawnCount === 1 ? 'shooter' : null
    this.spawnCount += 1

    if (guaranteed) {
      return guaranteed
    }

    const total =
      this.config.enemies.chaserWeight + this.config.enemies.shooterWeight
    return this.random() * total < this.config.enemies.chaserWeight
      ? 'chaser'
      : 'shooter'
  }

  private findSpawnPosition() {
    const { width, height } = this.config.arena
    const padding = this.config.enemies.spawnPadding

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const edge = Math.floor(this.random() * 4)
      let x = padding + this.random() * (width - padding * 2)
      let y = padding + this.random() * (height - padding * 2)

      if (edge === 0) y = padding
      if (edge === 1) x = width - padding
      if (edge === 2) y = height - padding
      if (edge === 3) x = padding

      const farEnough =
        distanceBetween(x, y, this.player.x, this.player.y) >=
        this.config.enemies.minSpawnDistance
      const clearOfObstacles = !this.obstacles.some((obstacle) =>
        circleIntersectsRect(x, y, 34, obstacle),
      )
      const clearOfEnemies = this.enemies.every(
        (enemy) => distanceBetween(x, y, enemy.x, enemy.y) >= 86,
      )

      if (farEnough && clearOfObstacles && clearOfEnemies) {
        return { x, y }
      }
    }

    return null
  }

  private updateEnemies(deltaSeconds: number) {
    const destroyed = new Set<number>()

    for (const enemy of this.enemies) {
      const desiredRotation = angleToTarget(
        enemy.x,
        enemy.y,
        this.player.x,
        this.player.y,
      )
      const settings =
        enemy.type === 'chaser'
          ? this.config.enemies.chaser
          : this.config.enemies.shooter

      enemy.rotation = rotateToward(
        enemy.rotation,
        desiredRotation,
        settings.rotationSpeed * deltaSeconds,
      )

      const distance = distanceBetween(
        enemy.x,
        enemy.y,
        this.player.x,
        this.player.y,
      )

      if (enemy.type === 'chaser') {
        this.moveShip(enemy, enemy.collisionRadius, settings.moveSpeed * deltaSeconds)

        if (
          circlesIntersect(
            enemy.x,
            enemy.y,
            enemy.collisionRadius,
            this.player.x,
            this.player.y,
            this.config.player.collisionRadius,
          )
        ) {
          this.damagePlayer(this.config.enemies.chaser.collisionDamage)
          destroyed.add(enemy.id)
          this.events.push({ type: 'explosion', x: enemy.x, y: enemy.y })
        }

        continue
      }

      const shooter = this.config.enemies.shooter

      if (distance > shooter.preferredRange) {
        this.moveShip(
          enemy,
          enemy.collisionRadius,
          shooter.moveSpeed * deltaSeconds,
        )
      }

      if (distance <= shooter.attackRange && enemy.weaponCooldownMs <= 0) {
        this.fireEnemy(enemy)
        enemy.weaponCooldownMs = shooter.weapon.cooldownMs
      }

    }

    if (destroyed.size > 0) {
      this.removeEnemies(destroyed)
    }
  }

  private fireEnemy(enemy: EnemyState) {
    const weapon = this.config.enemies.shooter.weapon
    const direction = headingVector(enemy.rotation)
    const originX = enemy.x + direction.x * 38
    const originY = enemy.y + direction.y * 38

    this.spawnProjectile(
      'enemy',
      originX,
      originY,
      enemy.rotation,
      weapon,
    )
    this.events.push({
      type: 'fire',
      x: originX,
      y: originY,
      rotation: enemy.rotation,
      owner: 'enemy',
      weapon: 'enemy',
    })
  }

  private spawnProjectile(
    owner: ProjectileState['owner'],
    x: number,
    y: number,
    rotation: number,
    weapon: WeaponConfig,
  ) {
    const direction = headingVector(rotation)

    this.projectiles.push({
      id: this.projectileId++,
      owner,
      x,
      y,
      vx: direction.x * weapon.projectileSpeed,
      vy: direction.y * weapon.projectileSpeed,
      damage: weapon.damage,
      lifetimeMs: weapon.projectileLifetimeMs,
      collisionRadius: weapon.projectileRadius,
    })
  }

  private updateProjectiles(deltaSeconds: number, deltaMs: number) {
    const aliveProjectiles: ProjectileState[] = []
    const destroyedEnemies = new Set<number>()

    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * deltaSeconds
      projectile.y += projectile.vy * deltaSeconds
      projectile.lifetimeMs -= deltaMs

      if (
        projectile.lifetimeMs <= 0 ||
        this.isOutsideArena(projectile.x, projectile.y, projectile.collisionRadius)
      ) {
        continue
      }

      if (
        this.obstacles.some((obstacle) =>
          circleIntersectsRect(
            projectile.x,
            projectile.y,
            projectile.collisionRadius,
            obstacle,
          ),
        )
      ) {
        this.events.push({
          type: 'impact',
          x: projectile.x,
          y: projectile.y,
        })
        continue
      }

      if (projectile.owner === 'player') {
        const target = this.enemies.find(
          (enemy) =>
            !destroyedEnemies.has(enemy.id) &&
            circlesIntersect(
              projectile.x,
              projectile.y,
              projectile.collisionRadius,
              enemy.x,
              enemy.y,
              enemy.collisionRadius,
            ),
        )

        if (target) {
          target.health = Math.max(0, target.health - projectile.damage)
          target.hitFlashMs = 110
          this.events.push({
            type: 'impact',
            x: projectile.x,
            y: projectile.y,
          })

          if (target.health <= 0) {
            destroyedEnemies.add(target.id)
            this.score += 1
            this.events.push({ type: 'explosion', x: target.x, y: target.y })
            this.events.push({ type: 'score', x: target.x, y: target.y })
          }

          continue
        }
      } else if (
        circlesIntersect(
          projectile.x,
          projectile.y,
          projectile.collisionRadius,
          this.player.x,
          this.player.y,
          this.config.player.collisionRadius,
        )
      ) {
        this.damagePlayer(projectile.damage)
        this.events.push({
          type: 'impact',
          x: projectile.x,
          y: projectile.y,
        })
        continue
      }

      aliveProjectiles.push(projectile)
    }

    this.projectiles.splice(0, this.projectiles.length, ...aliveProjectiles)

    if (destroyedEnemies.size > 0) {
      this.removeEnemies(destroyedEnemies)
    }
  }

  private removeEnemies(ids: Set<number>) {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      if (ids.has(this.enemies[index].id)) {
        this.enemies.splice(index, 1)
      }
    }
  }

  private damagePlayer(damage: number) {
    if (this.finished) {
      return
    }

    this.player.health = Math.max(0, this.player.health - damage)
    this.player.hitFlashMs = 130
  }

  private moveShip(
    ship: { x: number; y: number; rotation: number },
    radius: number,
    distance: number,
  ) {
    const direction = headingVector(ship.rotation)
    const nextX = ship.x + direction.x * distance
    const nextY = ship.y + direction.y * distance
    const { width, height, padding } = this.config.arena
    const boundedX = clamp(nextX, padding + radius, width - padding - radius)
    const boundedY = clamp(nextY, padding + radius, height - padding - radius)
    const blocked = this.obstacles.some((obstacle) =>
      circleIntersectsRect(boundedX, boundedY, radius, obstacle),
    )

    if (!blocked) {
      ship.x = boundedX
      ship.y = boundedY
    }
  }

  private isOutsideArena(x: number, y: number, radius: number) {
    return (
      x < -radius ||
      y < -radius ||
      x > this.config.arena.width + radius ||
      y > this.config.arena.height + radius
    )
  }

  private finish(reason: MatchEndReason) {
    if (this.finished) {
      return
    }

    this.finished = true
    this.endReason = reason

    if (reason === 'destroyed') {
      this.events.push({ type: 'explosion', x: this.player.x, y: this.player.y })
    }
  }
}
