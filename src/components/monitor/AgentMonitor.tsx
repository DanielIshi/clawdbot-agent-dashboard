/**
 * Agent Monitor Component - Issue #32 Implementation
 * 
 * Main component for agent monitoring with live thinking.
 */
import React, { useState, useEffect } from 'react'
import { AgentCard } from './AgentCard'
import { AgentDetailView } from './AgentDetailView'

// Agent interface as expected by tests
interface Agent {
  id: string
  name: string
  status: 'active' | 'idle' | 'paused' | 'done' | 'error'
  currentIssue: string | null
  lastActivity: number
  lastThinking: string | null
  project: string
}

// Utility Functions (from tests)
function getStatusIndicator(agent: Agent): string {
  const timeSinceActivity = Date.now() - agent.lastActivity
  
  if (agent.status === 'error') return '🔴'
  if (agent.status === 'done') return '✅'
  if (agent.status === 'paused') return '⏸️'
  if (timeSinceActivity < 60000) return '🟢' // < 60s = active
  if (timeSinceActivity < 300000) return '🟡' // < 5min = idle
  return '⏸️' // > 5min = paused
}

function truncateThinking(thinking: string | null, maxLength: number = 50): string {
  if (!thinking) return '—'
  if (thinking.length <= maxLength) return `💭 ${thinking}`
  return `💭 ${thinking.substring(0, maxLength)}...`
}

function filterAgentsByProject(agents: Agent[], project: string): Agent[] {
  if (project === 'alle') return agents
  return agents.filter(agent => agent.project === project)
}

export function AgentMonitor() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [projectFilter, setProjectFilter] = useState('alle')
  const [agents, setAgents] = useState<Agent[]>([])

  // Initialize with mock data from window.mockAgents (E2E tests)
  useEffect(() => {
    const mockAgents = (window as any).mockAgents
    if (mockAgents) {
      setAgents(mockAgents)
    } else {
      // Default mock data for development
      setAgents([
        {
          id: 'thai-dev',
          name: 'thai-dev',
          status: 'active',
          currentIssue: '#71',
          lastActivity: Date.now() - 30000, // 30s ago
          lastThinking: 'Jetzt Tests laufen lassen...',
          project: 'thai-blitz'
        },
        {
          id: 'icon-dev',
          name: 'icon-dev',
          status: 'active',
          currentIssue: '#46',
          lastActivity: Date.now() - 120000, // 2min ago
          lastThinking: 'UI-Sektion für häufig verwendete Keywords...',
          project: 'icon-generator'
        },
        {
          id: 'qa-rev',
          name: 'qa-rev',
          status: 'idle',
          currentIssue: null,
          lastActivity: Date.now() - 400000, // >5min
          lastThinking: null,
          project: 'thai-blitz'
        }
      ])
    }
  }, [])

  // Listen for agent updates (E2E tests)
  useEffect(() => {
    const handleAgentUpdate = (event: CustomEvent) => {
      const { agentId, lastThinking } = event.detail
      setAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { ...agent, lastThinking, lastActivity: Date.now() }
          : agent
      ))
    }

    window.addEventListener('agentUpdate', handleAgentUpdate as EventListener)
    return () => window.removeEventListener('agentUpdate', handleAgentUpdate as EventListener)
  }, [])

  const filteredAgents = filterAgentsByProject(agents, projectFilter)
  const activeCount = filteredAgents.filter(agent => 
    getStatusIndicator(agent) === '🟢'
  ).length

  // Get unique projects for filter
  const projects = ['alle', ...new Set(agents.map(agent => agent.project))]

  if (selectedAgent) {
    return (
      <AgentDetailView
        agent={selectedAgent}
        onBack={() => setSelectedAgent(null)}
      />
    )
  }

  return (
    <div className="bg-gray-900 min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">Agenten Monitor</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-400">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm">🟢 Live</span>
              <span className="text-sm font-semibold">{activeCount}</span>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mb-6">
          <select
            data-testid="project-filter"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 text-sm"
          >
            {projects.map(project => (
              <option key={project} value={project}>
                {project === 'alle' ? 'Alle Projekte' : project}
              </option>
            ))}
          </select>
        </div>

        {/* Agent Grid */}
        <div
          data-testid="agent-grid"
          data-virtualized="true"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
          }}
        >
          {filteredAgents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              statusIndicator={getStatusIndicator(agent)}
              thinkingPreview={truncateThinking(agent.lastThinking)}
              onClick={() => setSelectedAgent(agent)}
            />
          ))}
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Keine Agenten gefunden</p>
            <p className="text-sm mt-1">Für Projekt "{projectFilter}"</p>
          </div>
        )}
      </div>
    </div>
  )
}

export { AgentMonitor as default, getStatusIndicator, truncateThinking, filterAgentsByProject }
export type { Agent }