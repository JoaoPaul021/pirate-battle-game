import {
  Assets,
  Container,
  Graphics,
  Sprite,
  Texture,
  type Application,
} from 'pixi.js'
import type { GameConfig } from '../../config/gameConfig'
import type { GameSimulation } from '../simulation/GameSimulation'
import type { EnemyState, GameEvent, ProjectileState } from '../types'

const ASSETS = {
  water: '/png/default/tiles/tile_73.png',
  sandTopLeft: '/png/default/tiles/tile_1.png',
  sandTop: '/png/default/tiles/tile_2.png',
  sandTopRight: '/png/default/tiles/tile_3.png',
  sandLeft: '/png/default/tiles/tile_17.png',
  sand: '/png/default/tiles/tile_68.png',
  sandRight: '/png/default/tiles/tile_19.png',
  sandBottomLeft: '/png/default/tiles/tile_33.png',
  sandBottom: '/png/default/tiles/tile_34.png',
  sandBottomRight: '/png/default/tiles/tile_35.png',
  grass: '/png/default/tiles/tile_23.png',
  palm: '/png/default/tiles/tile_71.png',
  rock: '/png/default/tiles/tile_65.png',
  playerHealthy: '/png/default/ships/ship_5.png',
  playerDamaged: '/png/default/ships/ship_11.png',
  playerCritical: '/png/default/ships/ship_17.png',
  chaserHealthy: '/png/default/ships/ship_2.png',
  chaserDamaged: '/png/default/ships/ship_8.png',
  chaserCritical: '/png/default/ships/ship_14.png',
  shooterHealthy: '/png/default/ships/ship_3.png',
  shooterDamaged: '/png/default/ships/ship_9.png',
  shooterCritical: '/png/default/ships/ship_15.png',
  cannonBall: '/png/default/ship_parts/cannon_ball.png',
  fire: '/png/default/effects/fire_1.png',
  explosionLarge: '/png/default/effects/explosion_1.png',
  explosionMedium: '/png/default/effects/explosion_2.png',
  explosionSmall: '/png/default/effects/explosion_3.png',
} as const

type AssetKey = keyof typeof ASSETS
type AssetTextures = Record<AssetKey, Texture>

type ShipView = {
  container: Container
  sprite: Sprite
  health: Graphics
}

type VisualEffect = {
  sprite: Sprite
  ageMs: number
  durationMs: number
  kind: 'fire' | 'impact' | 'explosion'
}

const loadTextures = async (): Promise<AssetTextures> => {
  const entries = await Promise.all(
    Object.entries(ASSETS).map(async ([key, path]) => {
      const texture = await Assets.load<Texture>(path)
      return [key, texture] as const
    }),
  )

  return Object.fromEntries(entries) as AssetTextures
}

const addTile = (
  container: Container,
  texture: Texture,
  x: number,
  y: number,
) => {
  const sprite = new Sprite(texture)
  sprite.position.set(x, y)
  container.addChild(sprite)
}

const createIsland = (
  textures: AssetTextures,
  x: number,
  y: number,
  columns: number,
  rows: number,
  decoration: 'palm' | 'rock',
) => {
  const island = new Container()
  island.position.set(x, y)

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const isTop = row === 0
      const isBottom = row === rows - 1
      const isLeft = column === 0
      const isRight = column === columns - 1
      let texture = textures.sand

      if (isTop && isLeft) texture = textures.sandTopLeft
      else if (isTop && isRight) texture = textures.sandTopRight
      else if (isTop) texture = textures.sandTop
      else if (isBottom && isLeft) texture = textures.sandBottomLeft
      else if (isBottom && isRight) texture = textures.sandBottomRight
      else if (isBottom) texture = textures.sandBottom
      else if (isLeft) texture = textures.sandLeft
      else if (isRight) texture = textures.sandRight
      else texture = textures.grass

      addTile(island, texture, column * 64, row * 64)
    }
  }

  const decor = new Sprite(
    decoration === 'palm' ? textures.palm : textures.rock,
  )
  decor.anchor.set(0.5)
  decor.position.set(columns * 32, rows * 32)
  island.addChild(decor)

  return island
}

const drawHealth = (
  graphics: Graphics,
  health: number,
  maxHealth: number,
  width: number,
  y: number,
) => {
  const ratio = Math.max(0, Math.min(1, health / maxHealth))

  graphics.clear()
  graphics.roundRect(-width / 2, y, width, 8, 3)
  graphics.fill({ color: 0x18232b, alpha: 0.9 })
  graphics.roundRect(-width / 2 + 1, y + 1, (width - 2) * ratio, 6, 2)
  graphics.fill({
    color: ratio > 0.55 ? 0x48cc52 : ratio > 0.25 ? 0xf1ad3c : 0xe4493e,
  })
}

export class GameRenderer {
  private readonly world = new Container()
  private readonly entityLayer = new Container()
  private readonly projectileLayer = new Container()
  private readonly effectLayer = new Container()
  private playerView?: ShipView
  private readonly enemyViews = new Map<number, ShipView>()
  private readonly projectileViews = new Map<number, Sprite>()
  private readonly effects: VisualEffect[] = []
  private textures?: AssetTextures

  constructor(
    private readonly app: Application,
    private readonly config: GameConfig,
    private readonly simulation: GameSimulation,
  ) {}

  async init() {
    this.textures = await loadTextures()
    this.app.stage.addChild(this.world)

    for (let y = 0; y < this.config.arena.height; y += 64) {
      for (let x = 0; x < this.config.arena.width; x += 64) {
        addTile(this.world, this.textures.water, x, y)
      }
    }

    const islandOne = createIsland(this.textures, 80, 72, 5, 3, 'palm')
    islandOne.scale.set(1.05)
    this.world.addChild(islandOne)

    const islandTwo = createIsland(this.textures, 862, 396, 5, 3, 'rock')
    islandTwo.scale.set(1.04)
    this.world.addChild(islandTwo)

    this.world.addChild(this.entityLayer)
    this.world.addChild(this.projectileLayer)
    this.world.addChild(this.effectLayer)

    const playerSprite = new Sprite(this.textures.playerHealthy)
    playerSprite.anchor.set(0.5)
    playerSprite.scale.set(0.78)
    const playerHealth = new Graphics()
    const playerContainer = new Container()
    playerContainer.addChild(playerSprite)
    playerContainer.addChild(playerHealth)
    this.playerView = {
      container: playerContainer,
      sprite: playerSprite,
      health: playerHealth,
    }
    this.entityLayer.addChild(playerContainer)

    this.resize()
    this.renderFrame(0, [])
  }

  resize() {
    const { width, height } = this.config.arena
    const screen = this.app.screen
    const scale = Math.min(screen.width / width, screen.height / height)

    this.world.scale.set(scale)
    this.world.position.set(
      (screen.width - width * scale) / 2,
      (screen.height - height * scale) / 2,
    )
  }

  renderFrame(deltaSeconds: number, events: GameEvent[]) {
    if (!this.textures) {
      return
    }

    this.renderPlayer()
    this.renderEnemies()
    this.renderProjectiles()
    this.consumeEvents(events)
    this.updateEffects(deltaSeconds * 1000)
  }

  private renderPlayer() {
    if (!this.textures || !this.playerView) {
      return
    }

    const player = this.simulation.player
    const ratio = player.health / this.config.player.maxHealth

    this.playerView.container.position.set(player.x, player.y)
    this.playerView.sprite.rotation = player.rotation
    this.playerView.sprite.texture = this.shipTexture('player', ratio)
    this.playerView.sprite.tint = player.hitFlashMs > 0 ? 0xffb5a7 : 0xffffff
    drawHealth(
      this.playerView.health,
      player.health,
      this.config.player.maxHealth,
      64,
      -62,
    )
  }

  private renderEnemies() {
    if (!this.textures) {
      return
    }

    const activeIds = new Set(this.simulation.enemies.map((enemy) => enemy.id))

    for (const [id, view] of this.enemyViews) {
      if (!activeIds.has(id)) {
        view.container.destroy({ children: true })
        this.enemyViews.delete(id)
      }
    }

    for (const enemy of this.simulation.enemies) {
      let view = this.enemyViews.get(enemy.id)

      if (!view) {
        view = this.createEnemyView(enemy)
        this.enemyViews.set(enemy.id, view)
        this.entityLayer.addChild(view.container)
      }

      const ratio = enemy.health / enemy.maxHealth
      view.container.position.set(enemy.x, enemy.y)
      view.sprite.rotation = enemy.rotation
      view.sprite.texture = this.shipTexture(enemy.type, ratio)
      view.sprite.tint = enemy.hitFlashMs > 0 ? 0xffb5a7 : 0xffffff
      drawHealth(view.health, enemy.health, enemy.maxHealth, 56, -58)
    }
  }

  private createEnemyView(enemy: EnemyState): ShipView {
    const sprite = new Sprite(this.shipTexture(enemy.type, 1))
    sprite.anchor.set(0.5)
    sprite.scale.set(enemy.type === 'chaser' ? 0.68 : 0.72)

    const health = new Graphics()
    const container = new Container()
    container.addChild(sprite)
    container.addChild(health)

    return { container, sprite, health }
  }

  private renderProjectiles() {
    if (!this.textures) {
      return
    }

    const activeIds = new Set(
      this.simulation.projectiles.map((projectile) => projectile.id),
    )

    for (const [id, sprite] of this.projectileViews) {
      if (!activeIds.has(id)) {
        sprite.destroy()
        this.projectileViews.delete(id)
      }
    }

    for (const projectile of this.simulation.projectiles) {
      let sprite = this.projectileViews.get(projectile.id)

      if (!sprite) {
        sprite = this.createProjectileView(projectile)
        this.projectileViews.set(projectile.id, sprite)
        this.projectileLayer.addChild(sprite)
      }

      sprite.position.set(projectile.x, projectile.y)
    }
  }

  private createProjectileView(projectile: ProjectileState) {
    if (!this.textures) {
      throw new Error('Projectile texture is not loaded.')
    }

    const sprite = new Sprite(this.textures.cannonBall)
    sprite.anchor.set(0.5)
    sprite.scale.set(projectile.owner === 'player' ? 0.95 : 0.85)
    sprite.tint = projectile.owner === 'player' ? 0xffffff : 0xffb36a
    return sprite
  }

  private consumeEvents(events: GameEvent[]) {
    if (!this.textures) {
      return
    }

    for (const event of events) {
      if (event.type === 'score') {
        continue
      }

      if (event.type === 'fire') {
        const sprite = new Sprite(this.textures.fire)
        sprite.anchor.set(0.5, 0.82)
        sprite.position.set(event.x, event.y)
        sprite.rotation = event.rotation
        sprite.scale.set(event.weapon === 'broadside' ? 0.8 : 0.66)
        sprite.tint = event.owner === 'player' ? 0xffe2a1 : 0xffb18a
        this.effectLayer.addChild(sprite)
        this.effects.push({
          sprite,
          ageMs: 0,
          durationMs: 130,
          kind: 'fire',
        })
        continue
      }

      if (event.type === 'impact') {
        const sprite = new Sprite(this.textures.explosionSmall)
        sprite.anchor.set(0.5)
        sprite.position.set(event.x, event.y)
        sprite.scale.set(0.42)
        this.effectLayer.addChild(sprite)
        this.effects.push({
          sprite,
          ageMs: 0,
          durationMs: 180,
          kind: 'impact',
        })
        continue
      }

      const sprite = new Sprite(this.textures.explosionLarge)
      sprite.anchor.set(0.5)
      sprite.position.set(event.x, event.y)
      sprite.scale.set(0.55)
      this.effectLayer.addChild(sprite)
      this.effects.push({
        sprite,
        ageMs: 0,
        durationMs: 520,
        kind: 'explosion',
      })
    }
  }

  private updateEffects(deltaMs: number) {
    if (!this.textures) {
      return
    }

    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index]
      effect.ageMs += deltaMs
      const progress = Math.min(1, effect.ageMs / effect.durationMs)

      if (effect.kind === 'explosion') {
        effect.sprite.texture =
          progress < 0.34
            ? this.textures.explosionSmall
            : progress < 0.68
              ? this.textures.explosionMedium
              : this.textures.explosionLarge
        effect.sprite.scale.set(0.45 + progress * 0.5)
      } else if (effect.kind === 'impact') {
        effect.sprite.scale.set(0.35 + progress * 0.35)
      } else {
        effect.sprite.scale.set(0.6 + progress * 0.25)
      }

      effect.sprite.alpha = 1 - progress

      if (progress >= 1) {
        effect.sprite.destroy()
        this.effects.splice(index, 1)
      }
    }
  }

  private shipTexture(
    type: 'player' | EnemyState['type'],
    healthRatio: number,
  ) {
    if (!this.textures) {
      throw new Error('Ship textures are not loaded.')
    }

    const state =
      healthRatio > 0.66 ? 'Healthy' : healthRatio > 0.33 ? 'Damaged' : 'Critical'
    const key = `${type}${state}` as
      | 'playerHealthy'
      | 'playerDamaged'
      | 'playerCritical'
      | 'chaserHealthy'
      | 'chaserDamaged'
      | 'chaserCritical'
      | 'shooterHealthy'
      | 'shooterDamaged'
      | 'shooterCritical'

    return this.textures[key]
  }

  destroy() {
    this.enemyViews.clear()
    this.projectileViews.clear()
    this.effects.length = 0
    this.world.destroy({ children: true })
  }
}
