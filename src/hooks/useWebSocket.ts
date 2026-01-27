/**
 * WebSocket Hook - manages WebSocket connection with auto-reconnect
 */
import { useEffect, useRef, useCallback } from 'react'
import { useConnectionStore } from '../stores/connectionStore'
import { useActivityStore } from '../stores/activityStore'
import { processServerMessage, processEvent, setGapDetectionCallback } from '../lib/eventProcessor'
import type { ClientMessage, ServerMessage, EventEnvelope } from '../types/events'

interface UseWebSocketOptions {
  url?: string
  clientName?: string
  topics?: string[]
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

// Build WebSocket URL dynamically based on current location
function getDefaultWebSocketUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:3456/ws/agentops'
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  
  // Local development
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return 'ws://localhost:3456/ws/agentops'
  }
  
  // Production: use /ws/ path (Caddy will proxy)
  return `${protocol}//${host}/ws/agentops`
}

const DEFAULT_OPTIONS: Required<UseWebSocketOptions> = {
  url: getDefaultWebSocketUrl(),
  clientName: 'dashboard',
  topics: ['all'],
  reconnectInterval: 3000,
  maxReconnectAttempts: 10
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  // Memoize options to prevent infinite re-renders
  const opts = useRef({ ...DEFAULT_OPTIONS, ...options }).current
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const isConnectingRef = useRef(false)

  const {
    status,
    clientId,
    reconnectAttempts,
    setConnected,
    setDisconnected,
    setReconnecting,
    setStatus,
    currentSeq
  } = useConnectionStore()

  const { addActivity } = useActivityStore()

  // Send message helper
  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    }
    return false
  }, [])

  // Request snapshot to sync state
  const requestSnapshot = useCallback(() => {
    send({ type: 'command', command: 'get_snapshot', data: {} })
  }, [send])

  // Request events since last known seq
  const requestReplay = useCallback((sinceSeq: number) => {
    send({ type: 'command', command: 'replay_events', data: { since_seq: sinceSeq } })
  }, [send])

  // Connect function
  const connect = useCallback(() => {
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    isConnectingRef.current = true
    setStatus('connecting')

    console.log(`[WebSocket] Connecting to ${opts.url}...`)

    const ws = new WebSocket(opts.url)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebSocket] Connected')
      isConnectingRef.current = false

      // Send handshake
      send({
        type: 'handshake',
        client_name: opts.clientName
      })
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Check if it's an event envelope (has event_type and seq)
        if ('event_type' in data && 'seq' in data) {
          processEvent(data as EventEnvelope)
          return
        }

        // Otherwise treat as server message
        const message = data as ServerMessage

        switch (message.type) {
          case 'handshake_ack':
            console.log('[WebSocket] Handshake acknowledged:', message.client_id)
            setConnected(message.client_id!)

            // Subscribe to topics
            if (opts.topics.length > 0) {
              send({ type: 'subscribe', topics: opts.topics })
            }

            // Request initial snapshot
            requestSnapshot()

            addActivity({
              message: 'Connected to Command Center',
              type: 'success'
            })
            break

          case 'subscribe_ack':
            console.log('[WebSocket] Subscribed to:', message.subscribed)
            break

          case 'pong':
            // Heartbeat response
            break

          case 'error':
            console.error('[WebSocket] Server error:', message.error)
            addActivity({
              message: `Server error: ${message.error}`,
              type: 'error'
            })
            break

          default:
            // Process other messages (snapshot, replay, etc.)
            processServerMessage(message)
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err)
      }
    }

    ws.onclose = (event) => {
      console.log('[WebSocket] Disconnected:', event.code, event.reason)
      isConnectingRef.current = false
      wsRef.current = null

      // Get current state directly from store (avoid stale closure)
      const currentState = useConnectionStore.getState()
      const wasConnected = currentState.status === 'connected'
      const currentReconnectAttempts = currentState.reconnectAttempts

      if (event.code !== 1000) {
        // Abnormal close - attempt reconnect
        setDisconnected(event.reason || 'Connection lost')

        if (currentReconnectAttempts < opts.maxReconnectAttempts) {
          setReconnecting()
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect()
          }, opts.reconnectInterval)
        } else {
          addActivity({
            message: 'Max reconnect attempts reached. Please refresh.',
            type: 'error'
          })
        }
      } else {
        setDisconnected()
      }

      if (wasConnected) {
        addActivity({
          message: 'Disconnected from Command Center',
          type: 'warning'
        })
      }
    }

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error)
      isConnectingRef.current = false
    }
  }, [
    send,
    requestSnapshot,
    setConnected,
    setDisconnected,
    setReconnecting,
    setStatus,
    addActivity
    // opts is a ref, status/reconnectAttempts read from store directly
  ])

  // Disconnect function
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect')
      wsRef.current = null
    }

    setDisconnected()
  }, [setDisconnected])

  // Ping for keepalive
  const ping = useCallback(() => {
    send({ type: 'ping' })
  }, [send])

  // Setup gap detection callback (Issue #25)
  useEffect(() => {
    setGapDetectionCallback((currentSeq, expectedSeq) => {
      console.log(`[WebSocket] Gap detected, requesting replay from seq ${currentSeq}`)
      // Request replay of missing events
      requestReplay(currentSeq)
    })

    return () => {
      setGapDetectionCallback(() => {}) // Clear callback
    }
  }, [requestReplay])

  // Auto-connect on mount
  useEffect(() => {
    connect()

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount')
      }
    }
  }, []) // Only run once on mount

  // Heartbeat interval
  useEffect(() => {
    if (status !== 'connected') return

    const interval = setInterval(() => {
      ping()
    }, 25000) // 25 seconds (server expects ping within 30s)

    return () => clearInterval(interval)
  }, [status, ping])

  return {
    status,
    clientId,
    reconnectAttempts,
    currentSeq,
    connect,
    disconnect,
    send,
    requestSnapshot,
    requestReplay
  }
}

export default useWebSocket
