/**
 * WebSocket Server Setup
 * Configures WebSocket server and integrates with Express
 */
import { WebSocketServer } from 'ws'
import { handleMessage, handleClose } from './handlers.js'
import { pubsub } from './topics.js'

/**
 * Sets up WebSocket server on an existing HTTP server
 * @param {http.Server} server - HTTP server instance
 * @param {Object} context - Shared context { db, eventLog, commandHandler }
 * @returns {WebSocketServer}
 */
export function setupWebSocket(server, context = {}) {
  const wss = new WebSocketServer({
    server,
    path: '/ws/agentops'
  })

  console.log('[WS] WebSocket server initialized on /ws/agentops')

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress
    console.log(`[WS] New connection from ${clientIp}`)

    // Set up heartbeat
    ws.isAlive = true
    ws.on('pong', () => {
      ws.isAlive = true
    })

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        handleMessage(ws, data.toString(), context)
      } catch (err) {
        console.error('[WS] Error handling message:', err)
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }))
      }
    })

    // Handle close
    ws.on('close', () => {
      handleClose(ws)
    })

    // Handle errors
    ws.on('error', (err) => {
      console.error('[WS] WebSocket error:', err.message)
      handleClose(ws)
    })
  })

  // Heartbeat interval to detect broken connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log('[WS] Terminating inactive connection')
        return ws.terminate()
      }
      ws.isAlive = false
      ws.ping()
    })
  }, 30000) // 30 seconds

  wss.on('close', () => {
    clearInterval(heartbeatInterval)
  })

  // Attach pubsub for external access
  wss.pubsub = pubsub

  return wss
}

/**
 * Broadcast an event to all subscribed clients
 * @param {Object} event - Event envelope
 */
export function broadcast(event) {
  pubsub.publish(event)
}

/**
 * Get WebSocket server stats
 * @param {WebSocketServer} wss
 * @returns {Object}
 */
export function getStats(wss) {
  return {
    connections: wss.clients.size,
    pubsub: pubsub.getStats()
  }
}

export default { setupWebSocket, broadcast, getStats }
