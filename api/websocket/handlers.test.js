/**
 * Tests für WebSocket Handlers (Issue #2)
 * Akzeptanzkriterien:
 * - [x] `auth` Message mit JWT-Token
 * - [x] `subscribe` mit Topics-Array und `since`
 * - [x] `unsubscribe` zum Abmelden
 * - [x] `ack` Response
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  handleMessage,
  handleHandshake,
  handleSubscribe,
  handleUnsubscribe,
  handlePing,
  ClientMessageTypes,
  ServerMessageTypes
} from './handlers.js'
import { pubsub } from './topics.js'

describe('WebSocket Handlers (Issue #2)', () => {
  let mockWs
  let sentMessages

  beforeEach(() => {
    sentMessages = []
    mockWs = {
      clientId: null,
      clientName: null,
      send: vi.fn((data) => sentMessages.push(JSON.parse(data)))
    }

    // Reset pubsub state
    pubsub.clients.clear()
    pubsub.subscriptions.clear()
    pubsub.clientTopics.clear()
  })

  describe('Handshake (Auth)', () => {
    it('sollte Handshake-Response mit client_id senden', () => {
      const response = handleHandshake(mockWs, {
        type: 'handshake',
        client_name: 'test-client'
      }, {})

      expect(response.type).toBe(ServerMessageTypes.HANDSHAKE_ACK)
      expect(response.client_id).toBeDefined()
      expect(response.server_time).toBeDefined()
    })

    it('sollte client_id auf WebSocket speichern', () => {
      handleHandshake(mockWs, {
        type: 'handshake',
        client_name: 'test-client'
      }, {})

      expect(mockWs.clientId).toBeDefined()
      expect(mockWs.clientName).toBe('test-client')
    })

    it('sollte Client bei PubSub registrieren', () => {
      handleHandshake(mockWs, {
        type: 'handshake',
        client_name: 'test-client'
      }, {})

      expect(pubsub.clients.has(mockWs.clientId)).toBe(true)
    })

    it('sollte Auto-Subscribe zu "all" Topic machen', () => {
      const response = handleHandshake(mockWs, {
        type: 'handshake'
      }, {})

      expect(response.subscribed_topics).toContain('all')
    })

    it('sollte verfügbare Topics auflisten', () => {
      const response = handleHandshake(mockWs, {
        type: 'handshake'
      }, {})

      expect(response.available_topics).toContain('all')
      expect(response.available_topics).toContain('issues')
      expect(response.available_topics).toContain('agents')
    })

    it('sollte existierende client_id akzeptieren (Reconnect)', () => {
      const response = handleHandshake(mockWs, {
        type: 'handshake',
        client_id: 'existing-client-123',
        client_name: 'reconnecting'
      }, {})

      expect(response.client_id).toBe('existing-client-123')
    })
  })

  describe('Subscribe', () => {
    beforeEach(() => {
      handleHandshake(mockWs, { type: 'handshake' }, {})
    })

    it('sollte Topics subscriben', () => {
      const response = handleSubscribe(mockWs, {
        type: 'subscribe',
        topics: ['issues', 'agents']
      })

      expect(response.type).toBe(ServerMessageTypes.SUBSCRIBE_ACK)
      expect(response.subscribed).toContain('issues')
      expect(response.subscribed).toContain('agents')
    })

    it('sollte Fehler bei fehlender Auth senden', () => {
      const unauthWs = { clientId: null, send: vi.fn() }

      const response = handleSubscribe(unauthWs, {
        type: 'subscribe',
        topics: ['issues']
      })

      expect(response.type).toBe(ServerMessageTypes.ERROR)
      expect(response.code).toBe('AUTH_REQUIRED')
    })

    it('sollte Fehler bei ungültigen Topics senden', () => {
      const response = handleSubscribe(mockWs, {
        type: 'subscribe',
        topics: 'not-an-array'
      })

      expect(response.type).toBe(ServerMessageTypes.ERROR)
      expect(response.code).toBe('INVALID_TOPICS')
    })
  })

  describe('Unsubscribe', () => {
    beforeEach(() => {
      handleHandshake(mockWs, { type: 'handshake' }, {})
      handleSubscribe(mockWs, { type: 'subscribe', topics: ['issues', 'agents'] })
    })

    it('sollte Topics unsubscriben', () => {
      const response = handleUnsubscribe(mockWs, {
        type: 'unsubscribe',
        topics: ['issues']
      })

      expect(response.type).toBe(ServerMessageTypes.UNSUBSCRIBE_ACK)
      expect(response.unsubscribed).toContain('issues')
    })

    it('sollte Fehler bei fehlender Auth senden', () => {
      const unauthWs = { clientId: null }

      const response = handleUnsubscribe(unauthWs, {
        type: 'unsubscribe',
        topics: ['issues']
      })

      expect(response.type).toBe(ServerMessageTypes.ERROR)
    })
  })

  describe('Ping/Pong (Issue #3)', () => {
    it('sollte Pong auf Ping antworten', () => {
      const response = handlePing(mockWs)

      expect(response.type).toBe(ServerMessageTypes.PONG)
      expect(response.timestamp).toBeDefined()
    })
  })

  describe('Message Router', () => {
    it('sollte Handshake-Message routen', () => {
      handleMessage(mockWs, JSON.stringify({
        type: 'handshake',
        client_name: 'test'
      }), {})

      expect(sentMessages[0].type).toBe('handshake_ack')
    })

    it('sollte Ping-Message routen', () => {
      handleMessage(mockWs, JSON.stringify({ type: 'ping' }), {})

      expect(sentMessages[0].type).toBe('pong')
    })

    it('sollte Fehler bei ungültigem JSON senden', () => {
      handleMessage(mockWs, 'invalid json {', {})

      expect(sentMessages[0].type).toBe('error')
      expect(sentMessages[0].code).toBe('PARSE_ERROR')
    })

    it('sollte Fehler bei unbekanntem Message-Type senden', () => {
      handleMessage(mockWs, JSON.stringify({ type: 'unknown_type' }), {})

      expect(sentMessages[0].type).toBe('error')
      expect(sentMessages[0].code).toBe('UNKNOWN_TYPE')
    })
  })

  describe('Command Handler', () => {
    beforeEach(() => {
      handleHandshake(mockWs, { type: 'handshake' }, {})
    })

    it('sollte Command an Handler weiterleiten', () => {
      const commandHandler = vi.fn(() => ({ type: 'snapshot', data: {} }))

      handleMessage(mockWs, JSON.stringify({
        type: 'command',
        command: 'get_snapshot'
      }), { commandHandler })

      expect(commandHandler).toHaveBeenCalled()
    })

    it('sollte Fehler wenn kein Command-Handler', () => {
      handleMessage(mockWs, JSON.stringify({
        type: 'command',
        command: 'test'
      }), {})

      expect(sentMessages[0].type).toBe('error')
      expect(sentMessages[0].code).toBe('UNSUPPORTED')
    })
  })
})
