import axios from 'axios'
import type {
  HistoryParams,
  MatchRecord,
  PageResponse,
  RankingEntry,
  RankingParams,
} from './contracts'

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 5000,
})

const isPageResponse = <T>(value: unknown): value is PageResponse<T> => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const response = value as Partial<PageResponse<T>>

  return (
    Array.isArray(response.items) &&
    typeof response.page === 'number' &&
    typeof response.pageSize === 'number' &&
    typeof response.totalItems === 'number' &&
    typeof response.totalPages === 'number'
  )
}

const readPageResponse = <T>(value: unknown, resource: string) => {
  if (!isPageResponse<T>(value)) {
    throw new Error(`Invalid ${resource} response`)
  }

  return value
}

export const getRanking = async (
  params: RankingParams,
  signal?: AbortSignal,
) => {
  const response = await apiClient.get<PageResponse<RankingEntry>>('/ranking', {
    params,
    signal,
  })

  return readPageResponse<RankingEntry>(response.data, 'ranking')
}

export const getMatchHistory = async (
  params: HistoryParams,
  signal?: AbortSignal,
) => {
  const response = await apiClient.get<PageResponse<MatchRecord>>('/history', {
    params,
    signal,
  })

  return readPageResponse<MatchRecord>(response.data, 'history')
}

export const registerMatch = async (record: MatchRecord) => {
  const response = await apiClient.post<MatchRecord>('/matches', record)
  return response.data
}
