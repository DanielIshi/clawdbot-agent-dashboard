/**
 * Issue #57 - AC6: Live-Output API Polling Hook
 *
 * Polls agent output API every 5 seconds and returns current output map
 *
 * @param apiUrl - API endpoint URL
 * @returns Map<agentId, currentOutput>
 */

import { useState, useEffect } from 'react'

export function useAgentOutputPolling(apiUrl: string): Map<string, string> {
  const [output, setOutput] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    // Fetch function
    const fetchOutput = async () => {
      try {
        const response = await fetch(apiUrl)

        if (!response.ok) {
          console.error(`API error: ${response.status} ${response.statusText}`)
          setOutput(new Map()) // Clear on error
          return
        }

        const data = await response.json()

        // Convert object to Map
        const newOutput = new Map<string, string>()
        Object.entries(data).forEach(([agentId, text]) => {
          newOutput.set(agentId, text as string)
        })

        setOutput(newOutput)
      } catch (error) {
        console.error('Failed to fetch agent output:', error)
        setOutput(new Map()) // Clear on error
      }
    }

    // Initial fetch
    fetchOutput()

    // Poll every 5 seconds
    const intervalId = setInterval(fetchOutput, 5000)

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId)
    }
  }, [apiUrl])

  return output
}
