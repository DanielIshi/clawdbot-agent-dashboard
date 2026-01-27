/**
 * Minimal test to isolate the infinite loop issue
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import { useConnectionStore } from './stores/connectionStore'

// Minimal WebSocket hook
function useMinimalWebSocket() {
  const wsRef = React.useRef<WebSocket | null>(null)
  const { status, setConnected, setDisconnected, setStatus } = useConnectionStore()
  
  const connect = React.useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    setStatus('connecting')
    const ws = new WebSocket('wss://apps.srv947487.hstgr.cloud/ws/agentops')
    wsRef.current = ws
    
    ws.onopen = () => {
      console.log('Connected!')
      ws.send(JSON.stringify({ type: 'handshake', client_name: 'test' }))
    }
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('Message:', data.type)
      if (data.type === 'handshake_ack') {
        setConnected(data.client_id)
      }
    }
    
    ws.onclose = () => {
      console.log('Disconnected')
      setDisconnected()
    }
  }, [setConnected, setDisconnected, setStatus])
  
  React.useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close(1000)
    }
  }, [])  // Empty deps - only connect once
  
  return { status }
}

function MinimalApp() {
  const { status } = useMinimalWebSocket()
  
  return (
    <div style={{ padding: '20px', background: '#1a1a2e', color: 'white', minHeight: '100vh' }}>
      <h1>Minimal WebSocket Test</h1>
      <p>Status: <strong>{status}</strong></p>
    </div>
  )
}

// Only run if this file is the entry point
if (document.getElementById('root')) {
  createRoot(document.getElementById('root')!).render(<MinimalApp />)
}

export { MinimalApp, useMinimalWebSocket }
