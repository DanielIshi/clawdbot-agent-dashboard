/**
 * Issue State Machine
 * Manages issue workflow: backlog -> analysis -> development -> testing -> review -> done
 */

/**
 * Valid issue states
 */
export const IssueState = {
  BACKLOG: 'backlog',
  ANALYSIS: 'analysis',
  DEVELOPMENT: 'development',
  TESTING: 'testing',
  REVIEW: 'review',
  DONE: 'done',
  CANCELLED: 'cancelled'
}

/**
 * Valid transitions between issue states
 * Format: { fromState: [toStates] }
 */
const transitions = {
  [IssueState.BACKLOG]: [IssueState.ANALYSIS, IssueState.CANCELLED],
  [IssueState.ANALYSIS]: [IssueState.DEVELOPMENT, IssueState.BACKLOG, IssueState.CANCELLED],
  [IssueState.DEVELOPMENT]: [IssueState.TESTING, IssueState.ANALYSIS, IssueState.CANCELLED],
  [IssueState.TESTING]: [IssueState.REVIEW, IssueState.DEVELOPMENT, IssueState.CANCELLED],
  [IssueState.REVIEW]: [IssueState.DONE, IssueState.DEVELOPMENT, IssueState.CANCELLED],
  [IssueState.DONE]: [], // Terminal state - no transitions allowed
  [IssueState.CANCELLED]: [IssueState.BACKLOG] // Can be reopened
}

/**
 * Kanban column mapping
 */
export const StateToColumn = {
  [IssueState.BACKLOG]: 'Backlog',
  [IssueState.ANALYSIS]: 'Analysis',
  [IssueState.DEVELOPMENT]: 'In Progress',
  [IssueState.TESTING]: 'Testing',
  [IssueState.REVIEW]: 'Review',
  [IssueState.DONE]: 'Done',
  [IssueState.CANCELLED]: 'Cancelled'
}

/**
 * Creates a new issue object
 * @param {string} id
 * @param {number} number
 * @param {string} title
 * @param {string} projectId
 * @param {string} [priority='P2']
 * @returns {Object}
 */
export function createIssue(id, number, title, projectId, priority = 'P2') {
  return {
    id,
    number,
    title,
    projectId,
    state: IssueState.BACKLOG,
    assignedAgentId: null,
    isBlocked: false,
    blockReason: null,
    priority,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Issue State Machine class
 * Wraps an issue and provides transition logic
 */
export class IssueStateMachine {
  constructor(issue) {
    this.issue = issue
  }

  /**
   * Get current state
   * @returns {string}
   */
  get state() {
    return this.issue.state
  }

  /**
   * Get current Kanban column
   * @returns {string}
   */
  get column() {
    return StateToColumn[this.issue.state]
  }

  /**
   * Get valid transitions from current state
   * @returns {string[]}
   */
  getValidTransitions() {
    return transitions[this.issue.state] || []
  }

  /**
   * Check if transition to target state is valid
   * @param {string} targetState
   * @returns {boolean}
   */
  canTransition(targetState) {
    const validTargets = transitions[this.issue.state]
    return validTargets && validTargets.includes(targetState)
  }

  /**
   * Transition to a new state
   * @param {string} targetState
   * @returns {boolean} Success
   * @throws {Error} If transition is invalid
   */
  transition(targetState) {
    if (!this.canTransition(targetState)) {
      throw new Error(
        `Invalid issue transition: ${this.issue.state} -> ${targetState}. ` +
        `Valid transitions: ${this.getValidTransitions().join(', ')}`
      )
    }

    this.issue.state = targetState
    this.issue.updatedAt = new Date().toISOString()

    // Clear assignment when done or cancelled
    if (targetState === IssueState.DONE || targetState === IssueState.CANCELLED) {
      this.issue.assignedAgentId = null
    }

    return true
  }

  /**
   * Move forward in workflow
   * @returns {boolean}
   */
  advance() {
    const order = [
      IssueState.BACKLOG,
      IssueState.ANALYSIS,
      IssueState.DEVELOPMENT,
      IssueState.TESTING,
      IssueState.REVIEW,
      IssueState.DONE
    ]

    const currentIndex = order.indexOf(this.issue.state)
    if (currentIndex < 0 || currentIndex >= order.length - 1) {
      throw new Error(`Cannot advance from ${this.issue.state}`)
    }

    const nextState = order[currentIndex + 1]
    return this.transition(nextState)
  }

  /**
   * Move backward in workflow
   * @returns {boolean}
   */
  retreat() {
    const order = [
      IssueState.BACKLOG,
      IssueState.ANALYSIS,
      IssueState.DEVELOPMENT,
      IssueState.TESTING,
      IssueState.REVIEW
    ]

    const currentIndex = order.indexOf(this.issue.state)
    if (currentIndex <= 0) {
      throw new Error(`Cannot retreat from ${this.issue.state}`)
    }

    const prevState = order[currentIndex - 1]
    return this.transition(prevState)
  }

  /**
   * Cancel the issue
   * @returns {boolean}
   */
  cancel() {
    return this.transition(IssueState.CANCELLED)
  }

  /**
   * Reopen a cancelled issue
   * @returns {boolean}
   */
  reopen() {
    if (this.issue.state !== IssueState.CANCELLED) {
      throw new Error(`Can only reopen cancelled issues. Current state: ${this.issue.state}`)
    }
    return this.transition(IssueState.BACKLOG)
  }

  /**
   * Check if issue is in a terminal state
   * @returns {boolean}
   */
  isTerminal() {
    return this.issue.state === IssueState.DONE
  }

  /**
   * Check if issue is active (not done or cancelled)
   * @returns {boolean}
   */
  isActive() {
    return this.issue.state !== IssueState.DONE && this.issue.state !== IssueState.CANCELLED
  }

  /**
   * Get state summary
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.issue.id,
      number: this.issue.number,
      title: this.issue.title,
      state: this.issue.state,
      column: this.column,
      isBlocked: this.issue.isBlocked,
      validTransitions: this.getValidTransitions()
    }
  }
}

export default { IssueState, IssueStateMachine, StateToColumn, createIssue }
