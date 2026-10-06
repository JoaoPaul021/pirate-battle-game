import { createGameConfig, DEFAULT_GAME_OPTIONS } from '../config/gameConfig'
import type { MatchRecord } from '../api/contracts'

const CONFIRMED_MATCHES_KEY = 'pirate-battle-confirmed-matches'

const fixtureConfig = createGameConfig(DEFAULT_GAME_OPTIONS)

const fixture = (
  id: string,
  playerId: string,
  playerName: string,
  score: number,
  minutesAgo: number,
  durationSeconds: number,
): MatchRecord => ({
  id,
  playerId,
  playerName,
  score,
  durationSeconds,
  reason: 'time',
  completedAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  config: fixtureConfig,
})

const FIXTURES: MatchRecord[] = [
  fixture('fixture-1', 'maria-silva', 'Maria Silva', 18, 180, 120),
  fixture('fixture-2', 'captain-blue', 'Captain Blue', 15, 160, 118),
  fixture('fixture-3', 'ana-lima', 'Ana Lima', 13, 140, 120),
  fixture('fixture-4', 'black-beard', 'Black Beard', 11, 120, 116),
  fixture('fixture-5', 'mateus-r', 'Mateus R.', 9, 100, 120),
  fixture('fixture-6', 'sea-wolf', 'Sea Wolf', 8, 80, 109),
  fixture('fixture-7', 'luna-p', 'Luna P.', 7, 60, 120),
  fixture('fixture-8', 'red-sail', 'Red Sail', 5, 40, 94),
  fixture('player-fixture-1', 'joao-paulo', 'Joao Paulo', 12, 30, 120),
  fixture('player-fixture-2', 'joao-paulo', 'Joao Paulo', 10, 320, 114),
  fixture('player-fixture-3', 'joao-paulo', 'Joao Paulo', 8, 760, 120),
  fixture('player-fixture-4', 'joao-paulo', 'Joao Paulo', 7, 1440, 107),
  fixture('player-fixture-5', 'joao-paulo', 'Joao Paulo', 6, 2160, 120),
  fixture('player-fixture-6', 'joao-paulo', 'Joao Paulo', 5, 2880, 91),
  fixture('player-fixture-7', 'joao-paulo', 'Joao Paulo', 4, 4320, 83),
]

const readStoredMatches = (): MatchRecord[] => {
  const stored = localStorage.getItem(CONFIRMED_MATCHES_KEY)

  if (!stored) {
    return []
  }

  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? (parsed as MatchRecord[]) : []
  } catch {
    return []
  }
}

const writeStoredMatches = (records: MatchRecord[]) => {
  localStorage.setItem(CONFIRMED_MATCHES_KEY, JSON.stringify(records))
}

export const getAllMatches = () => [...FIXTURES, ...readStoredMatches()]

export const findMatch = (matchId: string) =>
  getAllMatches().find((record) => record.id === matchId)

export const confirmMatch = (record: MatchRecord) => {
  const existing = findMatch(record.id)

  if (existing) {
    return existing
  }

  writeStoredMatches([...readStoredMatches(), record])
  return record
}

export const resetMockData = () => {
  localStorage.removeItem(CONFIRMED_MATCHES_KEY)
}
