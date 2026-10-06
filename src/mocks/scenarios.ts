export type NetworkScenario =
  | 'success'
  | 'empty'
  | 'slow'
  | 'variable-latency'
  | 'ranking-error'
  | 'history-error'
  | 'client-error'
  | 'server-error'
  | 'request-timeout'
  | 'connection-error'
  | 'post-timeout'
  | 'offline-registration'

export const NETWORK_SCENARIO_STORAGE_KEY = 'pirate-battle-network-scenario'

export const NETWORK_SCENARIOS: Array<{ value: NetworkScenario; label: string }> = [
  { value: 'success', label: 'Success' },
  { value: 'empty', label: 'Empty lists' },
  { value: 'slow', label: 'Slow network' },
  { value: 'variable-latency', label: 'Variable latency' },
  { value: 'ranking-error', label: 'Ranking failure' },
  { value: 'history-error', label: 'History failure' },
  { value: 'client-error', label: 'HTTP 429' },
  { value: 'server-error', label: 'HTTP 500' },
  { value: 'request-timeout', label: 'Request timeout' },
  { value: 'connection-error', label: 'Connection failure' },
  { value: 'post-timeout', label: 'Timeout after save' },
  { value: 'offline-registration', label: 'Registration unavailable' },
]

const isScenario = (value: string | null): value is NetworkScenario =>
  NETWORK_SCENARIOS.some((scenario) => scenario.value === value)

export const getNetworkScenario = (): NetworkScenario => {
  const stored = localStorage.getItem(NETWORK_SCENARIO_STORAGE_KEY)
  return isScenario(stored) ? stored : 'success'
}

export const setNetworkScenario = (scenario: NetworkScenario) => {
  localStorage.setItem(NETWORK_SCENARIO_STORAGE_KEY, scenario)
  window.dispatchEvent(new Event('pirate-network-scenario-change'))
}
