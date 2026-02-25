/**
 * useSessionPolling Hook
 * Issue #58: AC6 - Auto-Refresh (Polling 10s)
 *
 * Fetcht Sessions von /api/sessions alle 10 Sekunden
 * Cleanup bei Unmount (kein Memory Leak)
 */

import { useState, useEffect, useRef } from 'react'
import type { Session } from '../components/settlers/types'

interface UseSessionPollingReturn {
  sessions: Session[]
  loading: boolean
  error: string | null
}

const POLLING_INTERVAL = 10000 // 10 Sekunden

export function useSessionPolling(): UseSessionPollingReturn {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState<boolean>(true)
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
      setSessions(data.sessions || [])
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('[useSessionPolling] Fetch error:', message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchSessions()

    // Polling interval
    intervalRef.current = setInterval(() => {
      fetchSessions()
    }, POLLING_INTERVAL)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, []) // Empty dependency array: nur bei Mount/Unmount

  return { sessions, loading, error }
}
