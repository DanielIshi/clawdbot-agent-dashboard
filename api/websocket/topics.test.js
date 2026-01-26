/**
 * Tests für Topic Pub/Sub System (Issue #4)
 * Akzeptanzkriterien:
 * - [x] Topic-Pattern mit Platzhaltern
 * - [x] Multi-Topic Subscriptions
 * - [x] Gezielte Event-Zustellung
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { PubSubManager, Topics } from './topics.js'

describe('Topic Pub/Sub System (Issue #4)', () => {
  let pubsub
  let mockWs1
  let mockWs2

  beforeEach(() => {
    pubsub = new PubSubManager()

    // Mock WebSockets
    mockWs1 = {
      readyState: 1, // OPEN
      messages: [],
      send(data) { this.messages.push(JSON.parse(data)) }
    }
    mockWs2 = {
      readyState: 1,
      messages: [],
      send(data) { this.messages.push(JSON.parse(data)) }
    }
  })

  describe('Client Registration', () => {
    it('sollte Client registrieren', () => {
      pubsub.registerClient('client-1', mockWs1)

      const stats = pubsub.getStats()
      expect(stats.totalClients).toBe(1)
    })

    it('sollte mehrere Clients registrieren', () => {
      pubsub.registerClient('client-1', mockWs1)
      pubsub.registerClient('client-2', mockWs2)

      const stats = pubsub.getStats()
      expect(stats.totalClients).toBe(2)
    })

    it('sollte Client deregistrieren', () => {
      pubsub.registerClient('client-1', mockWs1)
      pubsub.unregisterClient('client-1')

      const stats = pubsub.getStats()
      expect(stats.totalClients).toBe(0)
    })
  })

  describe('Topic Subscription', () => {
    beforeEach(() => {
      pubsub.registerClient('client-1', mockWs1)
      pubsub.registerClient('client-2', mockWs2)
    })

    it('sollte Topic Subscription erlauben', () => {
      const result = pubsub.subscribe('client-1', Topics.ISSUES)
      expect(result).toBe(true)

      const stats = pubsub.getStats()
      expect(stats.topics[Topics.ISSUES]).toBe(1)
    })

    it('sollte Multi-Topic Subscription erlauben', () => {
      pubsub.subscribe('client-1', Topics.ISSUES)
      pubsub.subscribe('client-1', Topics.AGENTS)
      pubsub.subscribe('client-1', Topics.SYSTEM)

      const stats = pubsub.getStats()
      expect(stats.topics[Topics.ISSUES]).toBe(1)
      expect(stats.topics[Topics.AGENTS]).toBe(1)
      expect(stats.topics[Topics.SYSTEM]).toBe(1)
    })

    it('sollte mehrere Clients auf gleichem Topic erlauben', () => {
      pubsub.subscribe('client-1', Topics.ISSUES)
      pubsub.subscribe('client-2', Topics.ISSUES)

      const stats = pubsub.getStats()
      expect(stats.topics[Topics.ISSUES]).toBe(2)
    })

    it('sollte Subscription für unbekannten Client ablehnen', () => {
      const result = pubsub.subscribe('unknown-client', Topics.ISSUES)
      expect(result).toBe(false)
    })

    it('sollte Unsubscribe funktionieren', () => {
      pubsub.subscribe('client-1', Topics.ISSUES)
      pubsub.unsubscribe('client-1', Topics.ISSUES)

      const stats = pubsub.getStats()
      expect(stats.topics[Topics.ISSUES] || 0).toBe(0)
    })
  })

  describe('Project-specific Topics', () => {
    it('sollte Project-Topic Pattern unterstützen', () => {
      const projectTopic = Topics.PROJECT('project-123')
      expect(projectTopic).toBe('project:project-123')
    })

    it('sollte auf Project-Topic subscriben können', () => {
      pubsub.registerClient('client-1', mockWs1)
      const result = pubsub.subscribe('client-1', Topics.PROJECT('my-project'))
      expect(result).toBe(true)
    })
  })

  describe('Event Publishing', () => {
    beforeEach(() => {
      pubsub.registerClient('client-1', mockWs1)
      pubsub.registerClient('client-2', mockWs2)
    })

    it('sollte Event an alle "all" Subscriber senden', () => {
      pubsub.subscribe('client-1', Topics.ALL)
      pubsub.subscribe('client-2', Topics.ALL)

      pubsub.publish({
        event_type: 'issue.created',
        project_id: 'test',
        payload: { title: 'Test' }
      })

      expect(mockWs1.messages).toHaveLength(1)
      expect(mockWs2.messages).toHaveLength(1)
    })

    it('sollte Event nur an relevante Subscriber senden', () => {
      pubsub.subscribe('client-1', Topics.ISSUES)
      pubsub.subscribe('client-2', Topics.AGENTS)

      pubsub.publish({
        event_type: 'issue.created',
        project_id: 'test',
        payload: {}
      })

      expect(mockWs1.messages).toHaveLength(1)
      expect(mockWs2.messages).toHaveLength(0)
    })

    it('sollte keine Duplikate senden bei Multi-Topic Match', () => {
      pubsub.subscribe('client-1', Topics.ALL)
      pubsub.subscribe('client-1', Topics.ISSUES)

      pubsub.publish({
        event_type: 'issue.created',
        project_id: 'test',
        payload: {}
      })

      // Sollte nur 1 Message erhalten, nicht 2
      expect(mockWs1.messages).toHaveLength(1)
    })

    it('sollte Event an Project-Topic senden', () => {
      pubsub.subscribe('client-1', Topics.PROJECT('project-123'))
      pubsub.subscribe('client-2', Topics.PROJECT('project-456'))

      pubsub.publish({
        event_type: 'issue.created',
        project_id: 'project-123',
        payload: {}
      })

      expect(mockWs1.messages).toHaveLength(1)
      expect(mockWs2.messages).toHaveLength(0)
    })

    it('sollte nicht an geschlossene Connections senden', () => {
      mockWs1.readyState = 3 // CLOSED
      pubsub.subscribe('client-1', Topics.ALL)

      pubsub.publish({
        event_type: 'test',
        project_id: 'test',
        payload: {}
      })

      expect(mockWs1.messages).toHaveLength(0)
    })
  })

  describe('Event Type to Topic Routing', () => {
    it('sollte issue Events zu ISSUES Topic routen', () => {
      const topics = pubsub.getTopicsForEvent('issue.created', 'test')
      expect(topics).toContain(Topics.ALL)
      expect(topics).toContain(Topics.ISSUES)
    })

    it('sollte agent Events zu AGENTS Topic routen', () => {
      const topics = pubsub.getTopicsForEvent('agent.status_changed', 'test')
      expect(topics).toContain(Topics.ALL)
      expect(topics).toContain(Topics.AGENTS)
    })

    it('sollte assign Events zu beiden Topics routen', () => {
      const topics = pubsub.getTopicsForEvent('issue.assigned', 'test')
      expect(topics).toContain(Topics.ISSUES)
      expect(topics).toContain(Topics.AGENTS)
    })

    it('sollte Project-Topic einschließen wenn project_id vorhanden', () => {
      const topics = pubsub.getTopicsForEvent('issue.created', 'my-project')
      expect(topics).toContain(Topics.PROJECT('my-project'))
    })
  })

  describe('Cleanup bei Disconnect', () => {
    it('sollte alle Subscriptions bei Unregister entfernen', () => {
      pubsub.registerClient('client-1', mockWs1)
      pubsub.subscribe('client-1', Topics.ALL)
      pubsub.subscribe('client-1', Topics.ISSUES)
      pubsub.subscribe('client-1', Topics.AGENTS)

      pubsub.unregisterClient('client-1')

      const stats = pubsub.getStats()
      expect(stats.totalClients).toBe(0)
      expect(stats.topics[Topics.ALL] || 0).toBe(0)
      expect(stats.topics[Topics.ISSUES] || 0).toBe(0)
    })
  })
})

describe('Topics Konstanten', () => {
  it('sollte alle Standard-Topics definieren', () => {
    expect(Topics.ALL).toBe('all')
    expect(Topics.ISSUES).toBe('issues')
    expect(Topics.AGENTS).toBe('agents')
    expect(Topics.SYSTEM).toBe('system')
  })

  it('sollte PROJECT als Funktion haben', () => {
    expect(typeof Topics.PROJECT).toBe('function')
    expect(Topics.PROJECT('test')).toBe('project:test')
  })
})
