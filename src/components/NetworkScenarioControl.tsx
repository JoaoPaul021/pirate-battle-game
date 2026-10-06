import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getNetworkScenario,
  NETWORK_SCENARIOS,
  setNetworkScenario,
  type NetworkScenario,
} from '../mocks/scenarios'
import { resetMockData } from '../mocks/store'
import { clearPendingMatches } from '../api/storage'

function NetworkScenarioControl() {
  const queryClient = useQueryClient()
  const [scenario, setScenario] = useState<NetworkScenario>(() => getNetworkScenario())

  useEffect(() => {
    const syncScenario = () => setScenario(getNetworkScenario())
    window.addEventListener('pirate-network-scenario-change', syncScenario)
    return () => window.removeEventListener('pirate-network-scenario-change', syncScenario)
  }, [])

  const handleScenarioChange = (value: NetworkScenario) => {
    setNetworkScenario(value)
    setScenario(value)
    void queryClient.cancelQueries()
    void queryClient.invalidateQueries({ queryKey: ['ranking'] })
    void queryClient.invalidateQueries({ queryKey: ['history'] })
  }

  const handleReset = () => {
    resetMockData()
    clearPendingMatches()
    setNetworkScenario('success')
    setScenario('success')
    void queryClient.clear()
  }

  return (
    <details className="network-tools">
      <summary>Network scenarios</summary>
      <label>
        Scenario
        <select
          value={scenario}
          onChange={(event) => handleScenarioChange(event.target.value as NetworkScenario)}
        >
          {NETWORK_SCENARIOS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </label>
      <button type="button" onClick={handleReset}>Reset mock data</button>
    </details>
  )
}

export default NetworkScenarioControl
