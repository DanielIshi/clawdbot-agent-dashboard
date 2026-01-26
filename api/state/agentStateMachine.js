/**
 * Agent State Machine
 * Manages agent status transitions: idle <-> working <-> blocked
 */

/**
 * Valid agent statuses
 */
export const AgentStatus = {
  IDLE: 'idle',
  WORKING: 'working',
  BLOCKED: 'blocked'
}

/**
 * Valid transitions between agent states
 * Format: { fromState: [toStates] }
 */
const transitions = {
  [AgentStatus.IDLE]: [AgentStatus.WORKING],
  [AgentStatus.WORKING]: [AgentStatus.IDLE, AgentStatus.BLOCKED],
  [AgentStatus.BLOCKED]: [AgentStatus.WORKING, AgentStatus.IDLE]
}

/**
 * Creates a new agent object
 * @param {string} id
 * @param {string} name
 * @returns {Object}
 */
export function createAgent(id, name) {
  return {
    id,
    name,
    status: AgentStatus.IDLE,
    currentIssueId: null,
    blockReason: null,
    lastActivity: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Agent State Machine class
 * Wraps an agent and provides transition logic
 */
export class AgentStateMachine {
  constructor(agent) {
    this.agent = agent
  }

  /**
   * Get current status
   * @returns {string}
   */
  get status() {
    return this.agent.status
  }

  /**
   * Get valid transitions from current state
   * @returns {string[]}
   */
  getValidTransitions() {
    return transitions[this.agent.status] || []
  }

  /**
   * Check if transition to target state is valid
   * @param {string} targetStatus
   * @returns {boolean}
   */
  canTransition(targetStatus) {
    const validTargets = transitions[this.agent.status]
    return validTargets && validTargets.includes(targetStatus)
  }

  /**
   * Transition to a new state
   * @param {string} targetStatus
   * @param {string} [reason] - Required when transitioning to blocked
   * @returns {boolean} Success
   * @throws {Error} If transition is invalid
   */
  transition(targetStatus, reason) {
    if (!this.canTransition(targetStatus)) {
      throw new Error(
        `Invalid agent transition: ${this.agent.status} -> ${targetStatus}. ` +
        `Valid transitions: ${this.getValidTransitions().join(', ')}`
      )
    }

    // Clear block reason when leaving blocked state
    if (this.agent.status === AgentStatus.BLOCKED && targetStatus !== AgentStatus.BLOCKED) {
      this.agent.blockReason = null
    }

    // Set block reason when entering blocked state
    if (targetStatus === AgentStatus.BLOCKED) {
      if (!reason) {
        throw new Error('Block reason is required when transitioning to blocked state')
      }
      this.agent.blockReason = reason
    }

    // Clear current issue when going to idle
    if (targetStatus === AgentStatus.IDLE) {
      this.agent.currentIssueId = null
    }

    this.agent.status = targetStatus
    this.agent.lastActivity = new Date().toISOString()
    this.agent.updatedAt = new Date().toISOString()

    return true
  }

  /**
   * Start working on an issue
   * @param {string} issueId
   * @returns {boolean}
   */
  startWork(issueId) {
    if (this.agent.status !== AgentStatus.IDLE) {
      throw new Error(`Agent must be idle to start work. Current status: ${this.agent.status}`)
    }

    this.agent.currentIssueId = issueId
    return this.transition(AgentStatus.WORKING)
  }

  /**
   * Finish current work
   * @returns {boolean}
   */
  finishWork() {
    if (this.agent.status !== AgentStatus.WORKING) {
      throw new Error(`Agent must be working to finish. Current status: ${this.agent.status}`)
    }

    this.agent.currentIssueId = null
    return this.transition(AgentStatus.IDLE)
  }

  /**
   * Block agent with reason
   * @param {string} reason
   * @returns {boolean}
   */
  block(reason) {
    if (this.agent.status !== AgentStatus.WORKING) {
      throw new Error(`Agent must be working to block. Current status: ${this.agent.status}`)
    }

    return this.transition(AgentStatus.BLOCKED, reason)
  }

  /**
   * Unblock agent and resume working
   * @returns {boolean}
   */
  unblock() {
    if (this.agent.status !== AgentStatus.BLOCKED) {
      throw new Error(`Agent must be blocked to unblock. Current status: ${this.agent.status}`)
    }

    return this.transition(AgentStatus.WORKING)
  }

  /**
   * Get state summary
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.agent.id,
      name: this.agent.name,
      status: this.agent.status,
      currentIssueId: this.agent.currentIssueId,
      blockReason: this.agent.blockReason,
      validTransitions: this.getValidTransitions()
    }
  }
}

export default { AgentStatus, AgentStateMachine, createAgent }
