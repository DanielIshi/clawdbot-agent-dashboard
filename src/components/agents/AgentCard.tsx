/**
 * Agent Card Component - displays a single agent status
 */
import type { Agent } from '../../types/agent'
import { useIssueStore } from '../../stores/issueStore'

interface AgentCardProps {
  agent: Agent
  onClick?: (agent: Agent) => void
}

const STATUS_STYLES = {
  idle: {
    bg: 'bg-gray-700',
    border: 'border-gray-600',
    dot: 'bg-gray-400',
    label: 'text-gray-400'
  },
  working: {
    bg: 'bg-green-900/30',
    border: 'border-green-500',
    dot: 'bg-green-500 animate-pulse',
    label: 'text-green-400'
  },
  blocked: {
    bg: 'bg-red-900/30',
    border: 'border-red-500',
    dot: 'bg-red-500',
    label: 'text-red-400'
  }
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const currentIssue = useIssueStore((s) =>
    agent.currentIssueId ? s.issues.get(agent.currentIssueId) : null
  )

  const styles = STATUS_STYLES[agent.status]

  return (
    <div
      className={`p-4 rounded-lg ${styles.bg} border-2 ${styles.border} cursor-pointer hover:scale-[1.02] transition-transform`}
      onClick={() => onClick?.(agent)}
    >
      {/* Header: Name + Status */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white truncate">{agent.name}</h3>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${styles.dot}`}></span>
          <span className={`text-sm font-medium ${styles.label} capitalize`}>
            {agent.status}
          </span>
        </div>
      </div>

      {/* Current Issue */}
      {currentIssue ? (
        <div className="bg-gray-800/50 rounded p-2 mb-2">
          <div className="text-xs text-gray-400 mb-1">Working on:</div>
          <div className="text-sm text-white">
            <span className="text-gray-400">#{currentIssue.number}</span>{' '}
            {currentIssue.title.slice(0, 40)}...
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500 mb-2">
          No current assignment
        </div>
      )}

      {/* Block Reason */}
      {agent.status === 'blocked' && agent.blockReason && (
        <div className="bg-red-900/40 rounded p-2 text-xs text-red-300">
          <div className="font-medium mb-1">Blocked:</div>
          {agent.blockReason}
        </div>
      )}

      {/* Last Activity */}
      <div className="text-xs text-gray-500 mt-2">
        Last activity: {new Date(agent.lastActivity).toLocaleTimeString()}
      </div>
    </div>
  )
}

export default AgentCard
