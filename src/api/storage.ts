import type { MatchRecord } from './contracts'

const PENDING_MATCHES_KEY = 'pirate-battle-pending-matches'
const LAST_MATCH_KEY = 'pirate-battle-last-match'

const readRecords = (key: string): MatchRecord[] => {
  const stored = localStorage.getItem(key)

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

export const readPendingMatches = () => readRecords(PENDING_MATCHES_KEY)

export const savePendingMatch = (record: MatchRecord) => {
  const records = readPendingMatches()

  if (records.some((item) => item.id === record.id)) {
    return
  }

  localStorage.setItem(PENDING_MATCHES_KEY, JSON.stringify([...records, record]))
}

export const removePendingMatch = (matchId: string) => {
  const records = readPendingMatches().filter((item) => item.id !== matchId)
  localStorage.setItem(PENDING_MATCHES_KEY, JSON.stringify(records))
}

export const clearPendingMatches = () => {
  localStorage.removeItem(PENDING_MATCHES_KEY)
}

export const saveLastMatch = (record: MatchRecord) => {
  localStorage.setItem(LAST_MATCH_KEY, JSON.stringify(record))
}

export const loadLastMatch = (): MatchRecord | null => {
  const stored = localStorage.getItem(LAST_MATCH_KEY)

  if (!stored) {
    return null
  }

  try {
    return JSON.parse(stored) as MatchRecord
  } catch {
    return null
  }
}
