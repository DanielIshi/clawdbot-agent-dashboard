/**
 * Issue Store - manages issue state
 */
import { create } from 'zustand'
import type { Issue, IssueState } from '../types/issue'
import { KANBAN_COLUMNS } from '../types/issue'

interface IssueStoreState {
  issues: Map<string, Issue>
  selectedIssueId: string | null

  // Computed getters
  getIssue: (id: string) => Issue | undefined
  getIssuesByState: (state: IssueState) => Issue[]
  getIssuesByProject: (projectId: string) => Issue[]
  getIssuesForKanban: () => Map<IssueState, Issue[]>
  getAllIssues: () => Issue[]

  // Actions
  setIssues: (issues: Issue[]) => void
  upsertIssue: (issue: Issue) => void
  updateIssueState: (issueId: string, state: IssueState) => void
  assignAgentToIssue: (issueId: string, agentId: string) => void
  unassignAgentFromIssue: (issueId: string) => void
  blockIssue: (issueId: string, reason: string) => void
  unblockIssue: (issueId: string) => void
  removeIssue: (issueId: string) => void
  selectIssue: (issueId: string | null) => void
  clearIssues: () => void
}

export const useIssueStore = create<IssueStoreState>((set, get) => ({
  issues: new Map(),
  selectedIssueId: null,

  getIssue: (id) => get().issues.get(id),

  getIssuesByState: (state) => {
    const issues = Array.from(get().issues.values())
    return issues.filter(i => i.state === state)
  },

  getIssuesByProject: (projectId) => {
    const issues = Array.from(get().issues.values())
    return issues.filter(i => i.projectId === projectId)
  },

  getIssuesForKanban: () => {
    const kanban = new Map<IssueState, Issue[]>()
    KANBAN_COLUMNS.forEach(col => kanban.set(col, []))

    const issues = Array.from(get().issues.values())
    issues.forEach(issue => {
      const column = kanban.get(issue.state)
      if (column) column.push(issue)
    })

    // Sort each column by priority then by number
    kanban.forEach((issues, state) => {
      kanban.set(state, issues.sort((a, b) => {
        const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 }
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        if (priorityDiff !== 0) return priorityDiff
        return a.number - b.number
      }))
    })

    return kanban
  },

  getAllIssues: () => Array.from(get().issues.values()),

  setIssues: (issues) => {
    const map = new Map<string, Issue>()
    issues.forEach(i => map.set(i.id, i))
    set({ issues: map })
  },

  upsertIssue: (issue) => set((state) => {
    const newIssues = new Map(state.issues)
    newIssues.set(issue.id, issue)
    return { issues: newIssues }
  }),

  updateIssueState: (issueId, newState) => set((state) => {
    const issue = state.issues.get(issueId)
    if (!issue) return state

    const newIssues = new Map(state.issues)
    newIssues.set(issueId, {
      ...issue,
      state: newState,
      updatedAt: new Date().toISOString()
    })
    return { issues: newIssues }
  }),

  assignAgentToIssue: (issueId, agentId) => set((state) => {
    const issue = state.issues.get(issueId)
    if (!issue) return state

    const newIssues = new Map(state.issues)
    newIssues.set(issueId, {
      ...issue,
      assignedAgentId: agentId,
      updatedAt: new Date().toISOString()
    })
    return { issues: newIssues }
  }),

  unassignAgentFromIssue: (issueId) => set((state) => {
    const issue = state.issues.get(issueId)
    if (!issue) return state

    const newIssues = new Map(state.issues)
    newIssues.set(issueId, {
      ...issue,
      assignedAgentId: null,
      updatedAt: new Date().toISOString()
    })
    return { issues: newIssues }
  }),

  blockIssue: (issueId, reason) => set((state) => {
    const issue = state.issues.get(issueId)
    if (!issue) return state

    const newIssues = new Map(state.issues)
    newIssues.set(issueId, {
      ...issue,
      isBlocked: true,
      blockReason: reason,
      updatedAt: new Date().toISOString()
    })
    return { issues: newIssues }
  }),

  unblockIssue: (issueId) => set((state) => {
    const issue = state.issues.get(issueId)
    if (!issue) return state

    const newIssues = new Map(state.issues)
    newIssues.set(issueId, {
      ...issue,
      isBlocked: false,
      blockReason: null,
      updatedAt: new Date().toISOString()
    })
    return { issues: newIssues }
  }),

  removeIssue: (issueId) => set((state) => {
    const newIssues = new Map(state.issues)
    newIssues.delete(issueId)
    return { issues: newIssues }
  }),

  selectIssue: (issueId) => set({ selectedIssueId: issueId }),

  clearIssues: () => set({ issues: new Map(), selectedIssueId: null })
}))

// Selectors for common queries
export const selectOpenIssues = (state: IssueStoreState) =>
  Array.from(state.issues.values()).filter(i => i.state !== 'done' && i.state !== 'cancelled')

export const selectBlockedIssues = (state: IssueStoreState) =>
  Array.from(state.issues.values()).filter(i => i.isBlocked)

export const selectIssueCount = (state: IssueStoreState) => state.issues.size

export const selectIssuesByColumn = (state: IssueStoreState, column: IssueState) =>
  Array.from(state.issues.values()).filter(i => i.state === column)
