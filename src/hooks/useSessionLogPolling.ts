/**
 * Session Log Polling Hook - Chat Format
 */

import { useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_INTERVAL = 5000

interface ChatMessage {
  role: string
  text: string
  time?: string
}

export function useSessionLogPolling(sessionNames: string[], intervalMs: number = DEFAULT_INTERVAL): Map<string, string> {
  const [chatData, setChatData] = useState<Map<string, string>>(new Map())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const sessionKey = useMemo(() => sessionNames.join('|'), [sessionNames])

  useEffect(() => {
    let isActive = true

    if (sessionNames.length === 0) {
      setChatData(new Map())
      return () => undefined
    }

    const fetchLogs = async () => {
      try {
        const results = await Promise.all(
          sessionNames.map(async (name) => {
            const response = await fetch(`/api/sessions/${encodeURIComponent(name)}/log`)
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const data = await response.json()
            return [name, JSON.stringify(data.chat || [])] as const
          })
        )

        if (!isActive) return
        setChatData(new Map(results))
      } catch (error) {
        if (!isActive) return
        console.error('[useSessionLogPolling] Fetch error:', error)
        setChatData(new Map())
      }
    }

    fetchLogs()
    intervalRef.current = setInterval(fetchLogs, intervalMs)

    return () => {
      isActive = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [sessionKey, intervalMs, sessionNames])

  return chatData
}
