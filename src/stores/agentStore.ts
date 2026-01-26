/**
 * Agent Store - manages agent state
 */
import { create } from 'zustand'
import type { Agent, AgentStatus } from '../types/agent'

interface AgentState {
  agents: Map<string, Agent>
  selectedAgentId: string | null

  // Computed getters (via selectors)
  getAgent: (id: string) => Agent | undefined
  getAgentsByStatus: (status: AgentStatus) => Agent[]
  getAllAgents: () => Agent[]

  // Actions
  setAgents: (agents: Agent[]) => void
  upsertAgent: (agent: Agent) => void
  updateAgentStatus: (agentId: string, status: AgentStatus, reason?: string) => void
  assignIssueToAgent: (agentId: string, issueId: string) => void
  unassignIssueFromAgent: (agentId: string) => void
  removeAgent: (agentId: string) => void
  selectAgent: (agentId: string | null) => void
  clearAgents: () => void
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: new Map(),
  selectedAgentId: null,

  getAgent: (id) => get().agents.get(id),

  getAgentsByStatus: (status) => {
    const agents = Array.from(get().agents.values())
    return agents.filter(a => a.status === status)
  },

  getAllAgents: () => Array.from(get().agents.values()),

  setAgents: (agents) => {
    const map = new Map<string, Agent>()
    agents.forEach(a => map.set(a.id, a))
    set({ agents: map })
  },

  upsertAgent: (agent) => set((state) => {
    const newAgents = new Map(state.agents)
    newAgents.set(agent.id, agent)
    return { agents: newAgents }
  }),

  updateAgentStatus: (agentId, status, reason) => set((state) => {
    const agent = state.agents.get(agentId)
    if (!agent) return state

    const newAgents = new Map(state.agents)
    newAgents.set(agentId, {
      ...agent,
      status,
      blockReason: status === 'blocked' ? (reason || null) : null,
      lastActivity: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    return { agents: newAgents }
  }),

  assignIssueToAgent: (agentId, issueId) => set((state) => {
    const agent = state.agents.get(agentId)
    if (!agent) return state

    const newAgents = new Map(state.agents)
    newAgents.set(agentId, {
      ...agent,
      currentIssueId: issueId,
      lastActivity: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    return { agents: newAgents }
  }),

  unassignIssueFromAgent: (agentId) => set((state) => {
    const agent = state.agents.get(agentId)
    if (!agent) return state

    const newAgents = new Map(state.agents)
    newAgents.set(agentId, {
      ...agent,
      currentIssueId: null,
      lastActivity: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    return { agents: newAgents }
  }),

  removeAgent: (agentId) => set((state) => {
    const newAgents = new Map(state.agents)
    newAgents.delete(agentId)
    return { agents: newAgents }
  }),

  selectAgent: (agentId) => set({ selectedAgentId: agentId }),

  clearAgents: () => set({ agents: new Map(), selectedAgentId: null })
}))

// Selectors for common queries
export const selectIdleAgents = (state: AgentState) =>
  Array.from(state.agents.values()).filter(a => a.status === 'idle')

export const selectWorkingAgents = (state: AgentState) =>
  Array.from(state.agents.values()).filter(a => a.status === 'working')

export const selectBlockedAgents = (state: AgentState) =>
  Array.from(state.agents.values()).filter(a => a.status === 'blocked')

export const selectAgentCount = (state: AgentState) => state.agents.size
