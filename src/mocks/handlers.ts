import { delay, http, HttpResponse } from 'msw'
import type {
  MatchRecord,
  PageResponse,
  RankingEntry,
} from '../api/contracts'
import { confirmMatch, findMatch, getAllMatches } from './store'
import { getNetworkScenario } from './scenarios'

const API_URL = '*/api'

let variableRequestIndex = 0
const timedOutPosts = new Set<string>()

const getPageNumber = (url: URL, key: string, fallback: number) => {
  const value = Number(url.searchParams.get(key))
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

const paginate = <T>(items: T[], page: number, pageSize: number): PageResponse<T> => {
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
  }
}

const sameRankingConfig = (
  match: MatchRecord,
  sessionDurationMs: number,
  spawnIntervalMs: number,
) =>
  match.config.sessionDurationMs === sessionDurationMs &&
  match.config.enemies.spawnIntervalMs === spawnIntervalMs

const rankingSort = (a: MatchRecord, b: MatchRecord) => {
  if (b.score !== a.score) {
    return b.score - a.score
  }

  if (a.durationSeconds !== b.durationSeconds) {
    return a.durationSeconds - b.durationSeconds
  }

  const dateDifference = a.completedAt.localeCompare(b.completedAt)
  return dateDifference !== 0 ? dateDifference : a.id.localeCompare(b.id)
}

const applyReadScenario = async (resource: 'ranking' | 'history') => {
  const scenario = getNetworkScenario()

  if (scenario === 'slow') {
    await delay(1500)
  }

  if (scenario === 'variable-latency') {
    variableRequestIndex += 1
    await delay(variableRequestIndex % 2 === 0 ? 150 : 1300)
  }

  if (scenario === 'request-timeout') {
    await delay(5500)
  }

  if (scenario === 'client-error') {
    return HttpResponse.json({ message: 'Too many mock requests.' }, { status: 429 })
  }

  if (scenario === 'server-error') {
    return HttpResponse.json({ message: 'Mock server error.' }, { status: 500 })
  }

  if (scenario === 'connection-error') {
    return HttpResponse.error()
  }

  if (scenario === `${resource}-error`) {
    return HttpResponse.json(
      { message: `${resource === 'ranking' ? 'Ranking' : 'History'} is unavailable.` },
      { status: 503 },
    )
  }

  return null
}

export const handlers = [
  http.get(`${API_URL}/ranking`, async ({ request }) => {
    const scenarioResponse = await applyReadScenario('ranking')

    if (scenarioResponse) {
      return scenarioResponse
    }

    const scenario = getNetworkScenario()
    const url = new URL(request.url)
    const page = getPageNumber(url, 'page', 1)
    const pageSize = getPageNumber(url, 'pageSize', 6)
    const sessionDurationMs = Number(url.searchParams.get('sessionDurationMs'))
    const spawnIntervalMs = Number(url.searchParams.get('spawnIntervalMs'))

    const matches = scenario === 'empty'
      ? []
      : getAllMatches()
          .filter((record) => sameRankingConfig(record, sessionDurationMs, spawnIntervalMs))
          .sort(rankingSort)

    const ranked: RankingEntry[] = matches.map((record, index) => ({
      ...record,
      position: index + 1,
    }))

    return HttpResponse.json(paginate(ranked, page, pageSize))
  }),

  http.get(`${API_URL}/history`, async ({ request }) => {
    const scenarioResponse = await applyReadScenario('history')

    if (scenarioResponse) {
      return scenarioResponse
    }

    const scenario = getNetworkScenario()
    const url = new URL(request.url)
    const page = getPageNumber(url, 'page', 1)
    const pageSize = getPageNumber(url, 'pageSize', 6)
    const playerId = url.searchParams.get('playerId') ?? ''

    const matches = scenario === 'empty'
      ? []
      : getAllMatches()
          .filter((record) => record.playerId === playerId)
          .sort((a, b) => b.completedAt.localeCompare(a.completedAt))

    return HttpResponse.json(paginate(matches, page, pageSize))
  }),

  http.post(`${API_URL}/matches`, async ({ request }) => {
    const record = (await request.json()) as MatchRecord
    const existing = findMatch(record.id)

    if (existing) {
      return HttpResponse.json(existing)
    }

    const scenario = getNetworkScenario()

    if (scenario === 'offline-registration') {
      await delay(350)
      return HttpResponse.json({ message: 'Match registration unavailable.' }, { status: 503 })
    }

    if (scenario === 'connection-error') {
      return HttpResponse.error()
    }

    const confirmed = confirmMatch(record)

    if (scenario === 'post-timeout' && !timedOutPosts.has(record.id)) {
      timedOutPosts.add(record.id)
      await delay(5500)
      return HttpResponse.json(confirmed)
    }

    if (scenario === 'slow') {
      await delay(1400)
    }

    return HttpResponse.json(confirmed, { status: 201 })
  }),
]
