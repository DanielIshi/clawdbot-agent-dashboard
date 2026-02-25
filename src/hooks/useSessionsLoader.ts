/**
 * Sessions Loader - Liest Sessions direkt vom lokalen Dateisystem
 * Kein separater Server nötig!
 */

import { useEffect, useState } from 'react'

export interface SessionData {
  name: string
  type: string
  status: string
  project: string
  startedAt: string
  lastActivity: string
  lastOutput: string
  tool: string
}

// Diese Daten werden zur Build-Zeit eingebettet
// Zur Laufzeit: fetch('/api/sessions') -> diese Funktion wird vom Server gerendert

export function useSessionsLoader() {
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Polling alle 10 Sekunden
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/sessions')
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        setSessions(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
    const interval = setInterval(fetchSessions, 10000)
    return () => clearInterval(interval)
  }, [])

  return { sessions, loading, error }
}
