import type { GameConfig } from '../config/gameConfig'
import type { MatchEndReason } from '../game/types'

export const PLAYER_ID = 'joao-paulo'
export const PLAYER_NAME = 'Joao Paulo'

export type MatchRecord = {
  id: string
  playerId: string
  playerName: string
  completedAt: string
  score: number
  durationSeconds: number
  reason: MatchEndReason
  config: GameConfig
}

export type RankingEntry = MatchRecord & {
  position: number
}

export type PageResponse<T> = {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type RankingParams = {
  page: number
  pageSize: number
  sessionDurationMs: number
  spawnIntervalMs: number
}

export type HistoryParams = {
  page: number
  pageSize: number
  playerId: string
}
