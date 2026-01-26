/**
 * Agent Detail View Component - Issue #32
 */
import React, { useState, useEffect, useRef } from 'react'
import type { Agent } from './AgentMonitor'
import { AgentTimeline } from './AgentTimeline'

interface AgentDetailViewProps {
  agent: Agent
  onBack: () => void
}

export function AgentDetailView({ agent, onBack }: AgentDetailViewProps) {
  const [autoScroll, setAutoScroll] = useState(true)

  const getStatusIndicator = (agent: Agent): string => {
    const timeSinceActivity = Date.now() - agent.lastActivity
    
    if (agent.status === 'error') return '🔴'
    if (agent.status === 'done') return '✅'
    if (agent.status === 'paused') return '⏸️'
    if (timeSinceActivity < 60000) return '🟢'
    if (timeSinceActivity < 300000) return '🟡'
    return '⏸️'
  }

  return (
    <div 
      data-testid="detail-view" 
      className="bg-gray-900 min-h-screen p-4"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              ← Zurück
            </button>
            <h2 className="text-2xl font-bold text-white">{agent.name}</h2>
            <div className="flex items-center gap-2">
              <span className="text-xl">{getStatusIndicator(agent)}</span>
              <span className="text-sm text-green-400">🟢 Live</span>
            </div>
          </div>
          
          {agent.currentIssue && (
            <div className="text-blue-300 font-medium">
              {agent.currentIssue}
            </div>
          )}
        </div>

        {/* Agent Info */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Status</div>
              <div className="text-white capitalize">{agent.status}</div>
            </div>
            <div>
              <div className="text-gray-400">Projekt</div>
              <div className="text-white">{agent.project}</div>
            </div>
            <div>
              <div className="text-gray-400">Letzte Aktivität</div>
              <div className="text-white">
                {new Date(agent.lastActivity).toLocaleTimeString()}
              </div>
            </div>
            <div>
              <div className="text-gray-400">ID</div>
              <div className="text-white font-mono text-xs">{agent.id}</div>
            </div>
          </div>
        </div>

        {/* Current Thinking */}
        {agent.lastThinking && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="text-gray-400 text-sm mb-2">💭 Aktuelles Thinking</div>
            <div className="text-white">{agent.lastThinking}</div>
          </div>
        )}

        {/* Auto-scroll Control */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="auto-scroll"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="auto-scroll" className="text-sm text-gray-300">
            Auto-scroll
          </label>
        </div>

        {/* Timeline */}
        <AgentTimeline agent={agent} autoScroll={autoScroll} />
      </div>
    </div>
  )
}

export default AgentDetailView