/**
 * Tests für Issue State Machine (Issue #14)
 * Akzeptanzkriterien:
 * - [x] Nur gültige Transitions
 * - [x] Issue in genau einem State
 * - [x] done/cancelled sind Terminal-States
 * - [x] Keine Reaktivierung nach Terminal
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { IssueStateMachine, IssueState, StateToColumn, createIssue } from './issueStateMachine.js'

describe('Issue State Machine (Issue #14)', () => {
  let issue
  let sm

  beforeEach(() => {
    issue = createIssue('issue-1', 42, 'Test Issue', 'project-1', 'P1')
    sm = new IssueStateMachine(issue)
  })

  describe('Initial State', () => {
    it('sollte neues Issue mit State "backlog" erstellen', () => {
      expect(issue.state).toBe(IssueState.BACKLOG)
    })

    it('sollte Issue mit allen Pflichtfeldern erstellen', () => {
      expect(issue.id).toBe('issue-1')
      expect(issue.number).toBe(42)
      expect(issue.title).toBe('Test Issue')
      expect(issue.projectId).toBe('project-1')
      expect(issue.priority).toBe('P1')
      expect(issue.assignedAgentId).toBeNull()
      expect(issue.isBlocked).toBe(false)
    })
  })

  describe('Workflow Forward Transitions', () => {
    it('sollte backlog -> analysis erlauben', () => {
      expect(sm.canTransition(IssueState.ANALYSIS)).toBe(true)
      sm.transition(IssueState.ANALYSIS)
      expect(issue.state).toBe(IssueState.ANALYSIS)
    })

    it('sollte analysis -> development erlauben', () => {
      sm.transition(IssueState.ANALYSIS)
      expect(sm.canTransition(IssueState.DEVELOPMENT)).toBe(true)
      sm.transition(IssueState.DEVELOPMENT)
      expect(issue.state).toBe(IssueState.DEVELOPMENT)
    })

    it('sollte development -> testing erlauben', () => {
      sm.transition(IssueState.ANALYSIS)
      sm.transition(IssueState.DEVELOPMENT)
      expect(sm.canTransition(IssueState.TESTING)).toBe(true)
      sm.transition(IssueState.TESTING)
      expect(issue.state).toBe(IssueState.TESTING)
    })

    it('sollte testing -> review erlauben', () => {
      sm.transition(IssueState.ANALYSIS)
      sm.transition(IssueState.DEVELOPMENT)
      sm.transition(IssueState.TESTING)
      expect(sm.canTransition(IssueState.REVIEW)).toBe(true)
      sm.transition(IssueState.REVIEW)
      expect(issue.state).toBe(IssueState.REVIEW)
    })

    it('sollte review -> done erlauben', () => {
      sm.transition(IssueState.ANALYSIS)
      sm.transition(IssueState.DEVELOPMENT)
      sm.transition(IssueState.TESTING)
      sm.transition(IssueState.REVIEW)
      expect(sm.canTransition(IssueState.DONE)).toBe(true)
      sm.transition(IssueState.DONE)
      expect(issue.state).toBe(IssueState.DONE)
    })
  })

  describe('Workflow Backward Transitions (Rework)', () => {
    it('sollte analysis -> backlog erlauben', () => {
      sm.transition(IssueState.ANALYSIS)
      expect(sm.canTransition(IssueState.BACKLOG)).toBe(true)
      sm.transition(IssueState.BACKLOG)
      expect(issue.state).toBe(IssueState.BACKLOG)
    })

    it('sollte development -> analysis erlauben', () => {
      sm.transition(IssueState.ANALYSIS)
      sm.transition(IssueState.DEVELOPMENT)
      expect(sm.canTransition(IssueState.ANALYSIS)).toBe(true)
    })

    it('sollte review -> development erlauben', () => {
      sm.transition(IssueState.ANALYSIS)
      sm.transition(IssueState.DEVELOPMENT)
      sm.transition(IssueState.TESTING)
      sm.transition(IssueState.REVIEW)
      expect(sm.canTransition(IssueState.DEVELOPMENT)).toBe(true)
    })
  })

  describe('Ungültige Transitions', () => {
    it('sollte backlog -> done verbieten (Skip)', () => {
      expect(sm.canTransition(IssueState.DONE)).toBe(false)
      expect(() => sm.transition(IssueState.DONE)).toThrow()
    })

    it('sollte backlog -> testing verbieten (Skip)', () => {
      expect(sm.canTransition(IssueState.TESTING)).toBe(false)
    })

    it('sollte backlog -> review verbieten (Skip)', () => {
      expect(sm.canTransition(IssueState.REVIEW)).toBe(false)
    })
  })

  describe('Terminal States (done/cancelled)', () => {
    it('sollte done als Terminal-State behandeln', () => {
      sm.transition(IssueState.ANALYSIS)
      sm.transition(IssueState.DEVELOPMENT)
      sm.transition(IssueState.TESTING)
      sm.transition(IssueState.REVIEW)
      sm.transition(IssueState.DONE)

      expect(sm.getValidTransitions()).toHaveLength(0)
      expect(sm.isTerminal()).toBe(true)
    })

    it('sollte keine Transitions aus done erlauben', () => {
      sm.transition(IssueState.ANALYSIS)
      sm.transition(IssueState.DEVELOPMENT)
      sm.transition(IssueState.TESTING)
      sm.transition(IssueState.REVIEW)
      sm.transition(IssueState.DONE)

      expect(sm.canTransition(IssueState.BACKLOG)).toBe(false)
      expect(sm.canTransition(IssueState.DEVELOPMENT)).toBe(false)
    })

    it('sollte cancelled -> backlog erlauben (Reopen)', () => {
      sm.transition(IssueState.CANCELLED)
      expect(sm.canTransition(IssueState.BACKLOG)).toBe(true)
      sm.transition(IssueState.BACKLOG)
      expect(issue.state).toBe(IssueState.BACKLOG)
    })
  })

  describe('Cancellation', () => {
    it('sollte cancelled von jedem nicht-terminal State erlauben', () => {
      expect(sm.canTransition(IssueState.CANCELLED)).toBe(true)

      sm.transition(IssueState.ANALYSIS)
      expect(sm.canTransition(IssueState.CANCELLED)).toBe(true)

      sm.transition(IssueState.DEVELOPMENT)
      expect(sm.canTransition(IssueState.CANCELLED)).toBe(true)
    })

    it('sollte Assignment bei Cancellation löschen', () => {
      issue.assignedAgentId = 'agent-1'
      sm.cancel()
      expect(issue.assignedAgentId).toBeNull()
    })
  })

  describe('Convenience Methods', () => {
    it('advance sollte zum nächsten State gehen', () => {
      sm.advance() // backlog -> analysis
      expect(issue.state).toBe(IssueState.ANALYSIS)

      sm.advance() // analysis -> development
      expect(issue.state).toBe(IssueState.DEVELOPMENT)
    })

    it('retreat sollte zum vorherigen State gehen', () => {
      sm.transition(IssueState.ANALYSIS)
      sm.transition(IssueState.DEVELOPMENT)

      sm.retreat() // development -> analysis
      expect(issue.state).toBe(IssueState.ANALYSIS)
    })

    it('cancel sollte zu cancelled wechseln', () => {
      sm.transition(IssueState.ANALYSIS)
      sm.cancel()
      expect(issue.state).toBe(IssueState.CANCELLED)
    })

    it('reopen sollte von cancelled zu backlog wechseln', () => {
      sm.cancel()
      sm.reopen()
      expect(issue.state).toBe(IssueState.BACKLOG)
    })
  })

  describe('Kanban Column Mapping', () => {
    it('sollte korrekten Column-Namen für jeden State liefern', () => {
      expect(StateToColumn[IssueState.BACKLOG]).toBe('Backlog')
      expect(StateToColumn[IssueState.ANALYSIS]).toBe('Analysis')
      expect(StateToColumn[IssueState.DEVELOPMENT]).toBe('In Progress')
      expect(StateToColumn[IssueState.TESTING]).toBe('Testing')
      expect(StateToColumn[IssueState.REVIEW]).toBe('Review')
      expect(StateToColumn[IssueState.DONE]).toBe('Done')
    })

    it('sollte column Property korrekt zurückgeben', () => {
      expect(sm.column).toBe('Backlog')
      sm.transition(IssueState.ANALYSIS)
      expect(sm.column).toBe('Analysis')
    })
  })

  describe('isActive', () => {
    it('sollte true für aktive States zurückgeben', () => {
      expect(sm.isActive()).toBe(true)
      sm.transition(IssueState.ANALYSIS)
      expect(sm.isActive()).toBe(true)
    })

    it('sollte false für done zurückgeben', () => {
      sm.transition(IssueState.ANALYSIS)
      sm.transition(IssueState.DEVELOPMENT)
      sm.transition(IssueState.TESTING)
      sm.transition(IssueState.REVIEW)
      sm.transition(IssueState.DONE)
      expect(sm.isActive()).toBe(false)
    })

    it('sollte false für cancelled zurückgeben', () => {
      sm.cancel()
      expect(sm.isActive()).toBe(false)
    })
  })
})
