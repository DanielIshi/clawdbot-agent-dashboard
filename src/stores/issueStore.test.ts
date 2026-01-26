/**
 * Tests für Issue Store (Issue #18)
 * Akzeptanzkriterien:
 * - [x] Issue-Cards mit Titel, Priority, Assignee
 * - [x] Blocked-Issues visuell hervorheben
 * - [x] Real-time Updates via WebSocket
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useIssueStore, selectOpenIssues, selectBlockedIssues } from './issueStore'
import type { Issue } from '../types/issue'

describe('Issue Store (Issue #18)', () => {
  beforeEach(() => {
    useIssueStore.getState().clearIssues()
  })

  const createMockIssue = (
    id: string,
    state: Issue['state'] = 'backlog',
    priority: Issue['priority'] = 'P2'
  ): Issue => ({
    id,
    number: parseInt(id.split('-')[1]) || 1,
    title: `Test Issue ${id}`,
    projectId: 'project-1',
    state,
    assignedAgentId: null,
    isBlocked: false,
    blockReason: null,
    priority,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  describe('CRUD Operations', () => {
    it('sollte Issue hinzufügen', () => {
      const issue = createMockIssue('issue-1')
      useIssueStore.getState().upsertIssue(issue)

      expect(useIssueStore.getState().issues.size).toBe(1)
      expect(useIssueStore.getState().getIssue('issue-1')).toEqual(issue)
    })

    it('sollte mehrere Issues setzen', () => {
      const issues = [
        createMockIssue('issue-1'),
        createMockIssue('issue-2'),
        createMockIssue('issue-3')
      ]
      useIssueStore.getState().setIssues(issues)

      expect(useIssueStore.getState().issues.size).toBe(3)
    })

    it('sollte Issue entfernen', () => {
      useIssueStore.getState().upsertIssue(createMockIssue('issue-1'))
      useIssueStore.getState().removeIssue('issue-1')

      expect(useIssueStore.getState().issues.size).toBe(0)
    })
  })

  describe('State Updates', () => {
    it('sollte Issue-State aktualisieren', () => {
      useIssueStore.getState().upsertIssue(createMockIssue('issue-1', 'backlog'))
      useIssueStore.getState().updateIssueState('issue-1', 'analysis')

      const issue = useIssueStore.getState().getIssue('issue-1')
      expect(issue?.state).toBe('analysis')
    })

    it('sollte updatedAt bei State-Change aktualisieren', () => {
      const issue = createMockIssue('issue-1')
      const originalUpdatedAt = issue.updatedAt
      useIssueStore.getState().upsertIssue(issue)

      useIssueStore.getState().updateIssueState('issue-1', 'analysis')

      const updated = useIssueStore.getState().getIssue('issue-1')
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime()
      )
    })
  })

  describe('Agent Assignment', () => {
    it('sollte Agent zu Issue zuweisen', () => {
      useIssueStore.getState().upsertIssue(createMockIssue('issue-1'))
      useIssueStore.getState().assignAgentToIssue('issue-1', 'agent-1')

      const issue = useIssueStore.getState().getIssue('issue-1')
      expect(issue?.assignedAgentId).toBe('agent-1')
    })

    it('sollte Agent von Issue entfernen', () => {
      const issue = createMockIssue('issue-1')
      issue.assignedAgentId = 'agent-1'
      useIssueStore.getState().upsertIssue(issue)

      useIssueStore.getState().unassignAgentFromIssue('issue-1')

      expect(useIssueStore.getState().getIssue('issue-1')?.assignedAgentId).toBeNull()
    })
  })

  describe('Blocking', () => {
    it('sollte Issue blocken', () => {
      useIssueStore.getState().upsertIssue(createMockIssue('issue-1'))
      useIssueStore.getState().blockIssue('issue-1', 'Waiting for API')

      const issue = useIssueStore.getState().getIssue('issue-1')
      expect(issue?.isBlocked).toBe(true)
      expect(issue?.blockReason).toBe('Waiting for API')
    })

    it('sollte Issue unblocken', () => {
      const issue = createMockIssue('issue-1')
      issue.isBlocked = true
      issue.blockReason = 'Blocked'
      useIssueStore.getState().upsertIssue(issue)

      useIssueStore.getState().unblockIssue('issue-1')

      const updated = useIssueStore.getState().getIssue('issue-1')
      expect(updated?.isBlocked).toBe(false)
      expect(updated?.blockReason).toBeNull()
    })
  })

  describe('Kanban Board', () => {
    beforeEach(() => {
      useIssueStore.getState().setIssues([
        createMockIssue('issue-1', 'backlog', 'P0'),
        createMockIssue('issue-2', 'backlog', 'P2'),
        createMockIssue('issue-3', 'analysis', 'P1'),
        createMockIssue('issue-4', 'development', 'P1'),
        createMockIssue('issue-5', 'done', 'P2')
      ])
    })

    it('sollte Issues nach Kanban-Spalten gruppieren', () => {
      const kanban = useIssueStore.getState().getIssuesForKanban()

      expect(kanban.get('backlog')?.length).toBe(2)
      expect(kanban.get('analysis')?.length).toBe(1)
      expect(kanban.get('development')?.length).toBe(1)
      expect(kanban.get('done')?.length).toBe(1)
      expect(kanban.get('testing')?.length).toBe(0)
    })

    it('sollte Issues nach Priorität sortieren', () => {
      const kanban = useIssueStore.getState().getIssuesForKanban()
      const backlog = kanban.get('backlog')!

      // P0 sollte vor P2 kommen
      expect(backlog[0].priority).toBe('P0')
      expect(backlog[1].priority).toBe('P2')
    })
  })

  describe('Selectors', () => {
    beforeEach(() => {
      const issue1 = createMockIssue('issue-1', 'development')
      issue1.isBlocked = true
      issue1.blockReason = 'Blocked'

      useIssueStore.getState().setIssues([
        issue1,
        createMockIssue('issue-2', 'backlog'),
        createMockIssue('issue-3', 'done'),
        createMockIssue('issue-4', 'cancelled')
      ])
    })

    it('sollte offene Issues filtern', () => {
      const state = useIssueStore.getState()
      const open = selectOpenIssues(state)

      expect(open.length).toBe(2) // backlog und development
      expect(open.every(i => i.state !== 'done' && i.state !== 'cancelled')).toBe(true)
    })

    it('sollte geblockte Issues filtern', () => {
      const state = useIssueStore.getState()
      const blocked = selectBlockedIssues(state)

      expect(blocked.length).toBe(1)
      expect(blocked[0].isBlocked).toBe(true)
    })

    it('sollte Issues nach State filtern', () => {
      const state = useIssueStore.getState()
      const backlog = state.getIssuesByState('backlog')

      expect(backlog.length).toBe(1)
      expect(backlog[0].state).toBe('backlog')
    })

    it('sollte Issues nach Project filtern', () => {
      const state = useIssueStore.getState()
      const projectIssues = state.getIssuesByProject('project-1')

      expect(projectIssues.length).toBe(4)
    })
  })
})
