/**
 * Agent Card Component for Monitor - Issue #32
 */
import React from 'react'
import type { Agent } from './AgentMonitor'

interface AgentCardProps {
  agent: Agent
  statusIndicator: string
  thinkingPreview: string
  onClick: () => void
}

const STATUS_CLASSES = {
  '🟢': 'status-active border-green-500 bg-green-500/10',
  '🟡': 'status-idle border-yellow-500 bg-yellow-500/10', 
  '⏸️': 'status-paused border-gray-500 bg-gray-500/10',
  '✅': 'status-done border-green-600 bg-green-600/10',
  '🔴': 'status-error border-red-500 bg-red-500/10'
}

export function AgentCard({ agent, statusIndicator, thinkingPreview, onClick }: AgentCardProps) {
  const statusClass = STATUS_CLASSES[statusIndicator as keyof typeof STATUS_CLASSES] || 'border-gray-500 bg-gray-500/10'

  return (
    <div
      data-testid="agent-card"
      onClick={onClick}
      className={`p-4 rounded-lg border-2 ${statusClass} cursor-pointer hover:scale-105 transition-transform duration-200 min-h-[120px] flex flex-col justify-between`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white text-sm truncate">{agent.name}</h3>
        <div
          data-testid="status-indicator"
          className={`text-lg ${statusClass}`}
        >
          {statusIndicator}
        </div>
      </div>

      {/* Current Issue */}
      <div className="mb-2 flex-grow">
        {agent.currentIssue ? (
          <div className="text-xs text-blue-300 font-medium">
            {agent.currentIssue}
          </div>
        ) : (
          <div className="text-xs text-gray-500">
            —
          </div>
        )}
      </div>

      {/* Thinking Preview */}
      <div
        data-testid="thinking-preview"
        className="text-xs text-gray-300 bg-gray-800/50 rounded px-2 py-1 min-h-[20px] flex items-center"
      >
        {thinkingPreview}
      </div>
    </div>
  )
}

export default AgentCard