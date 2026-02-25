/**
 * Live Session Polling Hook
 * Feature #64: Live Agent Stream View
 *
 * Polls /api/sessions every 10 seconds and returns normalized sessions.
 */

import { useEffect, useRef, useState } from 'react'

export interface LiveAgentSession {
  name?: string
  agentName?: string
  order?: string
  task?: string
  project?: string
  status?: string
  lastActivity?: string
  lastOutput?: string
  output?: string
  tool?: string
}

interface UseLiveSessionPollingReturn {
  sessions: LiveAgentSession[]
  loading: boolean
  error: string | null
}

const POLLING_INTERVAL = 10000

export function useLiveSessionPolling(): UseLiveSessionPollingReturn {
  const [sessions, setSessions] = useState<LiveAgentSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sessions')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const normalized = Array.isArray(data) ? data : data.sessions || []
      setSessions(normalized)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      setSessions([])
      console.error('[useLiveSessionPolling] Fetch error:', message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()

    intervalRef.current = setInterval(() => {
      fetchSessions()
    }, POLLING_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  return { sessions, loading, error }
}
