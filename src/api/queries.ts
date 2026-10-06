import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GameOptions } from '../config/gameConfig'
import { getMatchHistory, getRanking, registerMatch } from './client'
import {
  PLAYER_ID,
  type HistoryParams,
  type MatchRecord,
  type RankingParams,
} from './contracts'
import { removePendingMatch, savePendingMatch } from './storage'
import { getNetworkScenario } from '../mocks/scenarios'

export const rankingQueryKey = (options: GameOptions, page: number) => [
  'ranking',
  getNetworkScenario(),
  options.sessionTime,
  options.enemySpawnTime,
  page,
] as const

export const historyQueryKey = (page: number) => [
  'history',
  getNetworkScenario(),
  PLAYER_ID,
  page,
] as const

const shouldRetry = (failureCount: number, error: unknown) => {
  if (failureCount >= 2) {
    return false
  }

  if (typeof error === 'object' && error !== null && 'response' in error) {
    const status = (error as { response?: { status?: number } }).response?.status

    if (status && status >= 400 && status < 500) {
      return false
    }
  }

  return true
}

export const useRanking = (options: GameOptions, page: number) => {
  const params: RankingParams = {
    page,
    pageSize: 6,
    sessionDurationMs: options.sessionTime * 1000,
    spawnIntervalMs: options.enemySpawnTime * 1000,
  }

  return useQuery({
    queryKey: rankingQueryKey(options, page),
    queryFn: ({ signal }) => getRanking(params, signal),
    staleTime: 10_000,
    retry: shouldRetry,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  })
}

export const useMatchHistory = (page: number) => {
  const params: HistoryParams = {
    page,
    pageSize: 6,
    playerId: PLAYER_ID,
  }

  return useQuery({
    queryKey: historyQueryKey(page),
    queryFn: ({ signal }) => getMatchHistory(params, signal),
    staleTime: 10_000,
    retry: shouldRetry,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  })
}

export const useRegisterMatch = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['register-match'],
    mutationFn: async (record: MatchRecord) => {
      savePendingMatch(record)
      return registerMatch(record)
    },
    onSuccess: (record) => {
      removePendingMatch(record.id)
      void queryClient.invalidateQueries({ queryKey: ['ranking'] })
      void queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })
}
