/**
 * WebSocket Message Handlers
 * Handles incoming WebSocket messages: handshake, subscribe, commands
 */
import { v4 as uuidv4 } from 'uuid'
import { pubsub, Topics } from './topics.js'

/**
 * Message types expected from clients
 */
export const ClientMessageTypes = {
  HANDSHAKE: 'handshake',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  COMMAND: 'command',
  PING: 'ping'
}

/**
 * Message types sent to clients
 */
export const ServerMessageTypes = {
  HANDSHAKE_ACK: 'handshake_ack',
  SUBSCRIBE_ACK: 'subscribe_ack',
  UNSUBSCRIBE_ACK: 'unsubscribe_ack',
  ERROR: 'error',
  PONG: 'pong',
  EVENT: 'event',
  SNAPSHOT: 'snapshot'
}

/**
 * Handles the initial handshake from a client
 * @param {WebSocket} ws
 * @param {Object} message
 * @param {Object} context - { db, eventLog }
 * @returns {Object} Response to send
 */
export function handleHandshake(ws, message, context) {
  const clientId = message.client_id || uuidv4()
  const clientName = message.client_name || 'anonymous'

  // Store client ID on WebSocket for later reference
  ws.clientId = clientId
  ws.clientName = clientName

  // Register with PubSub
  pubsub.registerClient(clientId, ws)

  // Auto-subscribe to 'all' topic by default
  pubsub.subscribe(clientId, Topics.ALL)

  console.log(`[WS] Handshake complete: ${clientName} (${clientId})`)

  return {
    type: ServerMessageTypes.HANDSHAKE_ACK,
    client_id: clientId,
    server_time: new Date().toISOString(),
    subscribed_topics: [Topics.ALL],
    available_topics: Object.values(Topics).filter(t => typeof t === 'string')
  }
}

/**
 * Handles topic subscription request
 * @param {WebSocket} ws
 * @param {Object} message
 * @returns {Object} Response to send
 */
export function handleSubscribe(ws, message) {
  const { topics } = message

  if (!ws.clientId) {
    return {
      type: ServerMessageTypes.ERROR,
      error: 'Not authenticated. Send handshake first.',
      code: 'AUTH_REQUIRED'
    }
  }

  if (!topics || !Array.isArray(topics)) {
    return {
      type: ServerMessageTypes.ERROR,
      error: 'Invalid topics. Expected array.',
      code: 'INVALID_TOPICS'
    }
  }

  const subscribed = []
  const failed = []

  for (const topic of topics) {
    if (pubsub.subscribe(ws.clientId, topic)) {
      subscribed.push(topic)
    } else {
      failed.push(topic)
    }
  }

  return {
    type: ServerMessageTypes.SUBSCRIBE_ACK,
    subscribed,
    failed: failed.length > 0 ? failed : undefined
  }
}

/**
 * Handles topic unsubscription request
 * @param {WebSocket} ws
 * @param {Object} message
 * @returns {Object} Response to send
 */
export function handleUnsubscribe(ws, message) {
  const { topics } = message

  if (!ws.clientId) {
    return {
      type: ServerMessageTypes.ERROR,
      error: 'Not authenticated',
      code: 'AUTH_REQUIRED'
    }
  }

  if (!topics || !Array.isArray(topics)) {
    return {
      type: ServerMessageTypes.ERROR,
      error: 'Invalid topics. Expected array.',
      code: 'INVALID_TOPICS'
    }
  }

  for (const topic of topics) {
    pubsub.unsubscribe(ws.clientId, topic)
  }

  return {
    type: ServerMessageTypes.UNSUBSCRIBE_ACK,
    unsubscribed: topics
  }
}

/**
 * Handles ping messages (keep-alive)
 * @param {WebSocket} ws
 * @returns {Object} Response to send
 */
export function handlePing(ws) {
  return {
    type: ServerMessageTypes.PONG,
    timestamp: new Date().toISOString()
  }
}

/**
 * Main message router
 * @param {WebSocket} ws
 * @param {string} rawMessage
 * @param {Object} context - { db, eventLog, commandHandler }
 */
export function handleMessage(ws, rawMessage, context) {
  let message
  try {
    message = JSON.parse(rawMessage)
  } catch (err) {
    const errorResponse = {
      type: ServerMessageTypes.ERROR,
      error: 'Invalid JSON',
      code: 'PARSE_ERROR'
    }
    ws.send(JSON.stringify(errorResponse))
    return
  }

  const { type } = message
  let response

  switch (type) {
    case ClientMessageTypes.HANDSHAKE:
      response = handleHandshake(ws, message, context)
      break

    case ClientMessageTypes.SUBSCRIBE:
      response = handleSubscribe(ws, message)
      break

    case ClientMessageTypes.UNSUBSCRIBE:
      response = handleUnsubscribe(ws, message)
      break

    case ClientMessageTypes.PING:
      response = handlePing(ws)
      break

    case ClientMessageTypes.COMMAND:
      // Commands are handled by the command handler
      if (context.commandHandler) {
        response = context.commandHandler(ws, message, context)
      } else {
        response = {
          type: ServerMessageTypes.ERROR,
          error: 'Commands not supported',
          code: 'UNSUPPORTED'
        }
      }
      break

    default:
      response = {
        type: ServerMessageTypes.ERROR,
        error: `Unknown message type: ${type}`,
        code: 'UNKNOWN_TYPE'
      }
  }

  if (response) {
    ws.send(JSON.stringify(response))
  }
}

/**
 * Handle WebSocket close
 * @param {WebSocket} ws
 */
export function handleClose(ws) {
  if (ws.clientId) {
    pubsub.unregisterClient(ws.clientId)
    console.log(`[WS] Client disconnected: ${ws.clientName} (${ws.clientId})`)
  }
}

export default {
  ClientMessageTypes,
  ServerMessageTypes,
  handleMessage,
  handleClose,
  handleHandshake,
  handleSubscribe,
  handleUnsubscribe,
  handlePing
}
