/**
 * Live Session Log Polling Hook
 * Feature #64: Live Agent Stream View
 *
 * Polls /api/sessions/:name/log every 5 seconds.
 */

import { useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_INTERVAL = 5000

export function useSessionLogPolling(sessionNames: string[], intervalMs: number = DEFAULT_INTERVAL): Map<string, string> {
  const [output, setOutput] = useState<Map<string, string>>(new Map())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const sessionKey = useMemo(() => sessionNames.join('|'), [sessionNames])

  useEffect(() => {
    let isActive = true

    if (sessionNames.length === 0) {
      setOutput(new Map())
      return () => undefined
    }

    const fetchLogs = async () => {
      try {
        const results = await Promise.all(
          sessionNames.map(async (name) => {
            const response = await fetch(`/api/sessions/${encodeURIComponent(name)}/log`)

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`)
            }

            const data = await response.json()
            const lines = Array.isArray(data.lines) ? data.lines : []
            return [name, lines.join('\n')] as const
          })
        )

        if (!isActive) return

        setOutput(new Map(results))
      } catch (error) {
        if (!isActive) return
        console.error('[useSessionLogPolling] Fetch error:', error)
        setOutput(new Map())
      }
    }

    fetchLogs()

    intervalRef.current = setInterval(fetchLogs, intervalMs)

    return () => {
      isActive = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [sessionKey, intervalMs, sessionNames])

  return output
}
