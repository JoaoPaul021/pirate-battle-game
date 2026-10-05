import type { GameEvent, MatchEndReason } from '../types'

const SOUND_PATHS = {
  frontFire: '/sounds/cannon_fire_1.wav',
  broadside: '/sounds/cannon_broadside.wav',
  enemyFire: '/sounds/cannon_fire_2.wav',
  impact: '/sounds/ship_wood_hit_1.wav',
  explosion: '/sounds/ship_explosion_1.wav',
  score: '/sounds/score_point.wav',
  pause: '/sounds/game_pause.wav',
  resume: '/sounds/game_resume.wav',
  complete: '/sounds/game_complete.wav',
  gameOver: '/sounds/game_over.wav',
  ambience: '/sounds/ocean_ambience_loop.wav',
} as const

type SoundName = keyof typeof SOUND_PATHS

export class GameAudio {
  private readonly sounds = new Map<SoundName, HTMLAudioElement>()
  private destroyed = false

  constructor() {
    for (const [name, path] of Object.entries(SOUND_PATHS)) {
      const audio = new Audio(path)
      audio.preload = 'auto'
      this.sounds.set(name as SoundName, audio)
    }

    const ambience = this.sounds.get('ambience')

    if (ambience) {
      ambience.loop = true
      ambience.volume = 0.18
    }
  }

  start() {
    void this.play('ambience', false, 0.18)
  }

  handleEvents(events: GameEvent[]) {
    for (const event of events) {
      if (event.type === 'fire') {
        const sound =
          event.weapon === 'broadside'
            ? 'broadside'
            : event.owner === 'enemy'
              ? 'enemyFire'
              : 'frontFire'
        void this.play(sound, true, event.weapon === 'broadside' ? 0.42 : 0.32)
      } else if (event.type === 'impact') {
        void this.play('impact', true, 0.26)
      } else if (event.type === 'explosion') {
        void this.play('explosion', true, 0.38)
      } else if (event.type === 'score') {
        void this.play('score', true, 0.34)
      }
    }
  }

  pause() {
    this.sounds.get('ambience')?.pause()
    void this.play('pause', true, 0.28)
  }

  resume() {
    void this.play('resume', true, 0.26)
    void this.play('ambience', false, 0.18)
  }

  finish(reason: MatchEndReason) {
    this.sounds.get('ambience')?.pause()
    void this.play(reason === 'time' ? 'complete' : 'gameOver', true, 0.42)
  }

  destroy() {
    this.destroyed = true

    for (const audio of this.sounds.values()) {
      audio.pause()
      audio.currentTime = 0
    }

    this.sounds.clear()
  }

  private async play(name: SoundName, overlap: boolean, volume: number) {
    if (this.destroyed) {
      return
    }

    const source = this.sounds.get(name)

    if (!source) {
      return
    }

    const audio = overlap ? (source.cloneNode(true) as HTMLAudioElement) : source
    audio.volume = volume

    try {
      await audio.play()
    } catch {
      return
    }
  }
}
