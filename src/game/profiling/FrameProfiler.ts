export const PERFORMANCE_STORAGE_KEY = 'pirate-battle-performance-runs'

type MemoryPerformance = Performance & {
  memory?: {
    usedJSHeapSize: number
  }
}

export type PerformanceRun = {
  completedAt: string
  durationSeconds: number
  frameSamples: number
  averageFps: number
  p95FrameMs: number
  maxEntities: number
  averageEntities: number
  heapStartMb: number | null
  heapEndMb: number | null
}

const readHeapMb = () => {
  const memory = (performance as MemoryPerformance).memory
  return memory ? Number((memory.usedJSHeapSize / 1024 / 1024).toFixed(2)) : null
}

const percentile = (values: number[], ratio: number) => {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)
  return sorted[index]
}

export class FrameProfiler {
  private readonly enabled = new URLSearchParams(window.location.search).get('profile') === '1'
  private readonly frameTimes: number[] = []
  private readonly entityCounts: number[] = []
  private readonly heapStartMb = this.enabled ? readHeapMb() : null
  private completed = false

  sample(frameMs: number, entityCount: number) {
    if (!this.enabled || this.completed || !Number.isFinite(frameMs) || frameMs <= 0) {
      return
    }

    this.frameTimes.push(frameMs)
    this.entityCounts.push(entityCount)
  }

  complete(durationSeconds: number) {
    if (!this.enabled || this.completed || this.frameTimes.length === 0) {
      return null
    }

    this.completed = true

    const averageFrameMs =
      this.frameTimes.reduce((total, value) => total + value, 0) /
      this.frameTimes.length
    const averageEntities =
      this.entityCounts.reduce((total, value) => total + value, 0) /
      Math.max(1, this.entityCounts.length)

    const run: PerformanceRun = {
      completedAt: new Date().toISOString(),
      durationSeconds,
      frameSamples: this.frameTimes.length,
      averageFps: Number((1000 / averageFrameMs).toFixed(2)),
      p95FrameMs: Number(percentile(this.frameTimes, 0.95).toFixed(2)),
      maxEntities: Math.max(...this.entityCounts),
      averageEntities: Number(averageEntities.toFixed(2)),
      heapStartMb: this.heapStartMb,
      heapEndMb: readHeapMb(),
    }

    const stored = localStorage.getItem(PERFORMANCE_STORAGE_KEY)
    let history: PerformanceRun[] = []

    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        history = Array.isArray(parsed) ? parsed : []
      } catch {
        history = []
      }
    }

    localStorage.setItem(
      PERFORMANCE_STORAGE_KEY,
      JSON.stringify([...history.slice(-9), run]),
    )
    console.info('[Pirate Battle profile]', run)

    return run
  }
}
