/**
 * System Invariants
 * Enforces business rules that must always be true
 */

/**
 * Invariant: An agent can only be assigned to at most one issue at a time
 * @param {Object} agent - Agent to check
 * @param {Object} targetIssue - Issue to assign
 * @param {Map<string, Object>} allIssues - All issues in the system
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAssignment(agent, targetIssue, allIssues) {
  // Check if agent already has an issue assigned
  if (agent.currentIssueId && agent.currentIssueId !== targetIssue.id) {
    const currentIssue = allIssues.get(agent.currentIssueId)
    return {
      valid: false,
      error: `Agent "${agent.name}" is already assigned to issue #${currentIssue?.number || agent.currentIssueId}. ` +
        `Complete or unassign the current issue first.`
    }
  }

  // Check if issue is already assigned to another agent
  if (targetIssue.assignedAgentId && targetIssue.assignedAgentId !== agent.id) {
    return {
      valid: false,
      error: `Issue #${targetIssue.number} is already assigned to agent "${targetIssue.assignedAgentId}". ` +
        `Unassign it first.`
    }
  }

  // Check if issue is blocked
  if (targetIssue.isBlocked) {
    return {
      valid: false,
      error: `Issue #${targetIssue.number} is blocked: ${targetIssue.blockReason}. ` +
        `Unblock the issue before assignment.`
    }
  }

  return { valid: true }
}

/**
 * Invariant: When blocking an agent or issue, a reason must be provided
 * @param {Object} entity - Agent or issue being blocked
 * @param {string} reason - Block reason
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBlock(entity, reason) {
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return {
      valid: false,
      error: 'Block reason is required. Provide a clear explanation of what is blocking progress.'
    }
  }

  if (reason.trim().length < 5) {
    return {
      valid: false,
      error: 'Block reason is too short. Provide a meaningful explanation (at least 5 characters).'
    }
  }

  return { valid: true }
}

/**
 * Invariant: Issue state transitions must follow the defined workflow
 * @param {string} currentState
 * @param {string} targetState
 * @param {Object} validTransitions - Map of valid transitions
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateStateTransition(currentState, targetState, validTransitions) {
  const allowed = validTransitions[currentState] || []

  if (!allowed.includes(targetState)) {
    return {
      valid: false,
      error: `Invalid state transition: ${currentState} -> ${targetState}. ` +
        `Allowed transitions: ${allowed.join(', ') || 'none'}`
    }
  }

  return { valid: true }
}

/**
 * Invariant: Agent must be in 'working' state to be blocked
 * @param {Object} agent
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAgentCanBlock(agent) {
  if (agent.status !== 'working') {
    return {
      valid: false,
      error: `Agent must be in 'working' state to be blocked. Current state: ${agent.status}`
    }
  }

  return { valid: true }
}

/**
 * Invariant: Issue must have an assigned agent to move past backlog
 * @param {Object} issue
 * @param {string} targetState
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateIssueHasAgent(issue, targetState) {
  const statesRequiringAgent = ['analysis', 'development', 'testing', 'review']

  if (statesRequiringAgent.includes(targetState) && !issue.assignedAgentId) {
    return {
      valid: false,
      error: `Issue must have an assigned agent to move to '${targetState}' state.`
    }
  }

  return { valid: true }
}

/**
 * Validate all invariants for an assignment operation
 * @param {Object} params
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAllAssignmentInvariants({ agent, issue, allIssues }) {
  const errors = []

  const assignmentCheck = validateAssignment(agent, issue, allIssues)
  if (!assignmentCheck.valid) {
    errors.push(assignmentCheck.error)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate all invariants for a state change operation
 * @param {Object} params
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAllStateChangeInvariants({ issue, targetState, validTransitions }) {
  const errors = []

  const transitionCheck = validateStateTransition(issue.state, targetState, validTransitions)
  if (!transitionCheck.valid) {
    errors.push(transitionCheck.error)
  }

  const agentCheck = validateIssueHasAgent(issue, targetState)
  if (!agentCheck.valid) {
    errors.push(agentCheck.error)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export default {
  validateAssignment,
  validateBlock,
  validateStateTransition,
  validateAgentCanBlock,
  validateIssueHasAgent,
  validateAllAssignmentInvariants,
  validateAllStateChangeInvariants
}
