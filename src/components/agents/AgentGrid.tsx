/**
 * Agent Grid Component - displays all agents in a grid
 */
import { useAgentStore } from '../../stores/agentStore'
import type { Agent } from '../../types/agent'
import { AgentCard } from './AgentCard'

interface AgentGridProps {
  onAgentClick?: (agent: Agent) => void
}

export function AgentGrid({ onAgentClick }: AgentGridProps) {
  const agents = useAgentStore((s) => Array.from(s.agents.values()))

  const idle = agents.filter(a => a.status === 'idle')
  const working = agents.filter(a => a.status === 'working')
  const blocked = agents.filter(a => a.status === 'blocked')

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Agents
        <span className="text-sm font-normal text-gray-400 ml-2">
          ({agents.length} total)
        </span>
      </h2>

      {/* Status Summary */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
          <span className="text-gray-400">Idle: {idle.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-green-400">Working: {working.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span className="text-red-400">Blocked: {blocked.length}</span>
        </div>
      </div>

      {/* Agent Grid */}
      {agents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <p>No agents registered yet</p>
          <p className="text-sm mt-1">Agents will appear here when they connect</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Show blocked first, then working, then idle */}
          {[...blocked, ...working, ...idle].map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={onAgentClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default AgentGrid
