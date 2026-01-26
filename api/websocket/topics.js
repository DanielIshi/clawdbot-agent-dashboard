/**
 * Topic-based Pub/Sub System for WebSocket
 * Manages subscriptions and broadcasts events to relevant clients
 */

/**
 * Available topics for subscription
 */
export const Topics = {
  ALL: 'all',                    // All events
  ISSUES: 'issues',              // Issue-related events
  AGENTS: 'agents',              // Agent-related events
  SYSTEM: 'system',              // System events
  PROJECT: (id) => `project:${id}` // Project-specific events
}

/**
 * Maps event types to topics for routing
 */
const eventTypeToTopics = {
  'issue.created': [Topics.ALL, Topics.ISSUES],
  'issue.state_changed': [Topics.ALL, Topics.ISSUES],
  'issue.blocked': [Topics.ALL, Topics.ISSUES],
  'issue.unblocked': [Topics.ALL, Topics.ISSUES],
  'issue.assigned': [Topics.ALL, Topics.ISSUES, Topics.AGENTS],
  'issue.unassigned': [Topics.ALL, Topics.ISSUES, Topics.AGENTS],
  'agent.status_changed': [Topics.ALL, Topics.AGENTS],
  'agent.assigned': [Topics.ALL, Topics.AGENTS, Topics.ISSUES],
  'agent.unassigned': [Topics.ALL, Topics.AGENTS, Topics.ISSUES],
  'system.snapshot': [Topics.ALL, Topics.SYSTEM],
  'system.error': [Topics.ALL, Topics.SYSTEM]
}

/**
 * PubSub Manager - handles topic subscriptions and message broadcasting
 */
export class PubSubManager {
  constructor() {
    // Map<topic, Set<clientId>>
    this.subscriptions = new Map()
    // Map<clientId, WebSocket>
    this.clients = new Map()
    // Map<clientId, Set<topic>>
    this.clientTopics = new Map()
  }

  /**
   * Register a new WebSocket client
   * @param {string} clientId
   * @param {WebSocket} ws
   */
  registerClient(clientId, ws) {
    this.clients.set(clientId, ws)
    this.clientTopics.set(clientId, new Set())
    console.log(`[PubSub] Client registered: ${clientId}`)
  }

  /**
   * Unregister a client (on disconnect)
   * @param {string} clientId
   */
  unregisterClient(clientId) {
    // Remove from all subscriptions
    const topics = this.clientTopics.get(clientId)
    if (topics) {
      for (const topic of topics) {
        const subscribers = this.subscriptions.get(topic)
        if (subscribers) {
          subscribers.delete(clientId)
        }
      }
    }

    this.clients.delete(clientId)
    this.clientTopics.delete(clientId)
    console.log(`[PubSub] Client unregistered: ${clientId}`)
  }

  /**
   * Subscribe a client to a topic
   * @param {string} clientId
   * @param {string} topic
   * @returns {boolean} Success
   */
  subscribe(clientId, topic) {
    if (!this.clients.has(clientId)) {
      console.warn(`[PubSub] Unknown client tried to subscribe: ${clientId}`)
      return false
    }

    // Add to topic subscription
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set())
    }
    this.subscriptions.get(topic).add(clientId)

    // Track client's topics
    this.clientTopics.get(clientId).add(topic)

    console.log(`[PubSub] Client ${clientId} subscribed to: ${topic}`)
    return true
  }

  /**
   * Unsubscribe a client from a topic
   * @param {string} clientId
   * @param {string} topic
   * @returns {boolean} Success
   */
  unsubscribe(clientId, topic) {
    const subscribers = this.subscriptions.get(topic)
    if (subscribers) {
      subscribers.delete(clientId)
    }

    const clientTopics = this.clientTopics.get(clientId)
    if (clientTopics) {
      clientTopics.delete(topic)
    }

    console.log(`[PubSub] Client ${clientId} unsubscribed from: ${topic}`)
    return true
  }

  /**
   * Get topics that should receive an event
   * @param {string} eventType
   * @param {string} [projectId]
   * @returns {string[]}
   */
  getTopicsForEvent(eventType, projectId) {
    const topics = [...(eventTypeToTopics[eventType] || [Topics.ALL])]
    if (projectId) {
      topics.push(Topics.PROJECT(projectId))
    }
    return topics
  }

  /**
   * Publish an event to all subscribed clients
   * @param {Object} event - Event envelope to publish
   */
  publish(event) {
    const topics = this.getTopicsForEvent(event.event_type, event.project_id)
    const notifiedClients = new Set()

    for (const topic of topics) {
      const subscribers = this.subscriptions.get(topic)
      if (!subscribers) continue

      for (const clientId of subscribers) {
        // Avoid sending duplicate to same client
        if (notifiedClients.has(clientId)) continue
        notifiedClients.add(clientId)

        const ws = this.clients.get(clientId)
        if (ws && ws.readyState === 1) { // WebSocket.OPEN
          try {
            ws.send(JSON.stringify(event))
          } catch (err) {
            console.error(`[PubSub] Failed to send to ${clientId}:`, err.message)
          }
        }
      }
    }

    console.log(`[PubSub] Published ${event.event_type} to ${notifiedClients.size} clients`)
  }

  /**
   * Get stats about current subscriptions
   * @returns {Object}
   */
  getStats() {
    const stats = {
      totalClients: this.clients.size,
      topics: {}
    }

    for (const [topic, subscribers] of this.subscriptions) {
      stats.topics[topic] = subscribers.size
    }

    return stats
  }
}

// Singleton instance
export const pubsub = new PubSubManager()

export default { Topics, PubSubManager, pubsub }
