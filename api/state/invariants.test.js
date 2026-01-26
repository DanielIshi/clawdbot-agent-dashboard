/**
 * Tests für System Invariants (Issue #15, #16)
 *
 * Issue #15 - Max 1 Issue pro Agent:
 * - [x] Assign-Request ablehnen wenn Agent bereits assigned
 * - [x] Fehler bei Verletzung
 *
 * Issue #16 - Blocked erfordert Block-Reason:
 * - [x] Blocked-Transition ohne Reason ablehnen
 * - [x] Block-Reason nicht-leer validieren
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateAssignment,
  validateBlock,
  validateStateTransition,
  validateAgentCanBlock,
  validateIssueHasAgent,
  validateAllAssignmentInvariants
} from './invariants.js'
import { createAgent } from './agentStateMachine.js'
import { createIssue, ISSUE_TRANSITIONS } from './issueStateMachine.js'

describe('Agent Invariant: Max 1 Issue pro Agent (Issue #15)', () => {
  let agent
  let issue1
  let issue2
  let allIssues

  beforeEach(() => {
    agent = createAgent('agent-1', 'Test Agent')
    issue1 = createIssue('issue-1', 1, 'Issue 1', 'project-1')
    issue2 = createIssue('issue-2', 2, 'Issue 2', 'project-1')
    allIssues = new Map([
      ['issue-1', issue1],
      ['issue-2', issue2]
    ])
  })

  describe('validateAssignment', () => {
    it('sollte Assignment erlauben wenn Agent frei ist', () => {
      const result = validateAssignment(agent, issue1, allIssues)
      expect(result.valid).toBe(true)
    })

    it('sollte Assignment ablehnen wenn Agent bereits ein Issue hat', () => {
      agent.currentIssueId = 'issue-1'
      const result = validateAssignment(agent, issue2, allIssues)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('already assigned')
      expect(result.error).toContain('#1') // Sollte Issue-Nummer enthalten
    })

    it('sollte Re-Assignment zum gleichen Issue erlauben', () => {
      agent.currentIssueId = 'issue-1'
      const result = validateAssignment(agent, issue1, allIssues)
      expect(result.valid).toBe(true)
    })

    it('sollte Assignment ablehnen wenn Issue bereits assigned ist', () => {
      issue1.assignedAgentId = 'agent-2'
      const result = validateAssignment(agent, issue1, allIssues)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('already assigned')
    })

    it('sollte Assignment zu geblocktem Issue ablehnen', () => {
      issue1.isBlocked = true
      issue1.blockReason = 'Waiting for API'

      const result = validateAssignment(agent, issue1, allIssues)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('blocked')
    })
  })

  describe('validateAllAssignmentInvariants', () => {
    it('sollte alle Invarianten prüfen', () => {
      agent.currentIssueId = 'issue-1'
      issue2.isBlocked = true
      issue2.blockReason = 'Blocked'

      const result = validateAllAssignmentInvariants({
        agent,
        issue: issue2,
        allIssues
      })

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})

describe('Issue Invariant: Block-Reason Pflicht (Issue #16)', () => {
  let agent
  let issue

  beforeEach(() => {
    agent = createAgent('agent-1', 'Test Agent')
    issue = createIssue('issue-1', 1, 'Test Issue', 'project-1')
  })

  describe('validateBlock', () => {
    it('sollte Block ohne Reason ablehnen', () => {
      const result = validateBlock(agent, undefined)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('sollte Block mit leerem String ablehnen', () => {
      const result = validateBlock(agent, '')
      expect(result.valid).toBe(false)
    })

    it('sollte Block mit Whitespace-only ablehnen', () => {
      const result = validateBlock(agent, '   ')
      expect(result.valid).toBe(false)
    })

    it('sollte Block mit zu kurzem Reason ablehnen', () => {
      const result = validateBlock(agent, 'abc')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('too short')
    })

    it('sollte Block mit gültigem Reason erlauben', () => {
      const result = validateBlock(agent, 'Waiting for external API response')
      expect(result.valid).toBe(true)
    })

    it('sollte mindestens 5 Zeichen erfordern', () => {
      const result4 = validateBlock(agent, 'Test')
      const result5 = validateBlock(agent, 'Tests')

      expect(result4.valid).toBe(false)
      expect(result5.valid).toBe(true)
    })
  })

  describe('validateAgentCanBlock', () => {
    it('sollte Block nur für working Agent erlauben', () => {
      agent.status = 'working'
      const result = validateAgentCanBlock(agent)
      expect(result.valid).toBe(true)
    })

    it('sollte Block für idle Agent ablehnen', () => {
      agent.status = 'idle'
      const result = validateAgentCanBlock(agent)
      expect(result.valid).toBe(false)
    })

    it('sollte Block für bereits blocked Agent ablehnen', () => {
      agent.status = 'blocked'
      const result = validateAgentCanBlock(agent)
      expect(result.valid).toBe(false)
    })
  })
})

describe('State Transition Validierung', () => {
  describe('validateStateTransition', () => {
    const transitions = {
      backlog: ['analysis', 'cancelled'],
      analysis: ['development', 'backlog', 'cancelled'],
      done: []
    }

    it('sollte gültige Transition erlauben', () => {
      const result = validateStateTransition('backlog', 'analysis', transitions)
      expect(result.valid).toBe(true)
    })

    it('sollte ungültige Transition ablehnen', () => {
      const result = validateStateTransition('backlog', 'done', transitions)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid state transition')
    })

    it('sollte Transition aus Terminal-State ablehnen', () => {
      const result = validateStateTransition('done', 'backlog', transitions)
      expect(result.valid).toBe(false)
    })
  })
})

describe('Issue Agent Requirement', () => {
  let issue

  beforeEach(() => {
    issue = createIssue('issue-1', 1, 'Test', 'project-1')
  })

  describe('validateIssueHasAgent', () => {
    it('sollte Analysis ohne Agent ablehnen', () => {
      const result = validateIssueHasAgent(issue, 'analysis')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('assigned agent')
    })

    it('sollte Development ohne Agent ablehnen', () => {
      const result = validateIssueHasAgent(issue, 'development')
      expect(result.valid).toBe(false)
    })

    it('sollte Analysis mit Agent erlauben', () => {
      issue.assignedAgentId = 'agent-1'
      const result = validateIssueHasAgent(issue, 'analysis')
      expect(result.valid).toBe(true)
    })

    it('sollte Backlog ohne Agent erlauben', () => {
      const result = validateIssueHasAgent(issue, 'backlog')
      expect(result.valid).toBe(true)
    })

    it('sollte Done ohne Agent erlauben', () => {
      const result = validateIssueHasAgent(issue, 'done')
      expect(result.valid).toBe(true)
    })
  })
})
