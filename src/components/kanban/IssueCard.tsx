/**
 * Issue Card Component - displays a single issue in the Kanban board
 */
import type { Issue } from '../../types/issue'
import { PRIORITY_COLORS } from '../../types/issue'
import { useAgentStore } from '../../stores/agentStore'

interface IssueCardProps {
  issue: Issue
  onClick?: (issue: Issue) => void
}

export function IssueCard({ issue, onClick }: IssueCardProps) {
  const agent = useAgentStore((s) => issue.assignedAgentId ? s.agents.get(issue.assignedAgentId) : null)

  const priorityColor = PRIORITY_COLORS[issue.priority] || 'bg-gray-500'

  return (
    <div
      className={`p-3 rounded-lg bg-gray-700 hover:bg-gray-650 cursor-pointer transition-colors
        ${issue.isBlocked ? 'border-2 border-red-500' : 'border border-gray-600'}
      `}
      onClick={() => onClick?.(issue)}
    >
      {/* Header: Number + Priority */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs font-mono">#{issue.number}</span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColor} text-white`}>
          {issue.priority}
        </span>
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-white mb-2 line-clamp-2">
        {issue.title}
      </h4>

      {/* Footer: Agent + Blocked status */}
      <div className="flex items-center justify-between text-xs">
        {agent ? (
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${
              agent.status === 'working' ? 'bg-green-500' :
              agent.status === 'blocked' ? 'bg-red-500' : 'bg-gray-500'
            }`}></span>
            <span className="text-gray-300 truncate max-w-[100px]">{agent.name}</span>
          </div>
        ) : (
          <span className="text-gray-500">Unassigned</span>
        )}

        {issue.isBlocked && (
          <span className="text-red-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
            Blocked
          </span>
        )}
      </div>

      {/* Block reason tooltip */}
      {issue.isBlocked && issue.blockReason && (
        <div className="mt-2 p-2 bg-red-900/30 rounded text-xs text-red-300 line-clamp-2">
          {issue.blockReason}
        </div>
      )}
    </div>
  )
}

export default IssueCard
