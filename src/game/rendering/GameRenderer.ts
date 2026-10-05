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
  player: '/png/default/ships/ship_5.png',
} as const

type AssetKey = keyof typeof ASSETS
type AssetTextures = Record<AssetKey, Texture>

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

export class GameRenderer {
  private readonly world = new Container()
  private readonly playerLayer = new Container()
  private readonly playerHealth = new Graphics()
  private playerSprite?: Sprite

  constructor(
    private readonly app: Application,
    private readonly config: GameConfig,
    private readonly simulation: GameSimulation,
  ) {}

  async init() {
    const textures = await loadTextures()
    this.app.stage.addChild(this.world)

    for (let y = 0; y < this.config.arena.height; y += 64) {
      for (let x = 0; x < this.config.arena.width; x += 64) {
        addTile(this.world, textures.water, x, y)
      }
    }

    const islandOne = createIsland(textures, 80, 72, 5, 3, 'palm')
    islandOne.scale.set(1.05)
    this.world.addChild(islandOne)

    const islandTwo = createIsland(textures, 862, 396, 5, 3, 'rock')
    islandTwo.scale.set(1.04)
    this.world.addChild(islandTwo)

    this.playerSprite = new Sprite(textures.player)
    this.playerSprite.anchor.set(0.5)
    this.playerSprite.scale.set(0.78)

    this.playerLayer.addChild(this.playerSprite)
    this.playerLayer.addChild(this.playerHealth)
    this.world.addChild(this.playerLayer)

    this.resize()
    this.renderFrame()
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

  renderFrame() {
    if (!this.playerSprite) {
      return
    }

    const player = this.simulation.player
    this.playerLayer.position.set(player.x, player.y)
    this.playerSprite.rotation = player.rotation

    const healthRatio = player.health / this.config.player.maxHealth
    const barWidth = 64

    this.playerHealth.clear()
    this.playerHealth.roundRect(-barWidth / 2, -61, barWidth, 8, 3)
    this.playerHealth.fill({ color: 0x1b2730, alpha: 0.88 })
    this.playerHealth.roundRect(-barWidth / 2 + 1, -60, (barWidth - 2) * healthRatio, 6, 2)
    this.playerHealth.fill({ color: healthRatio > 0.4 ? 0x45d24b : 0xe24a3f })
  }

  destroy() {
    this.world.destroy({ children: true })
  }
}
