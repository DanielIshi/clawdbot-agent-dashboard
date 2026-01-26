/**
 * Kanban Column Component - displays a single column in the Kanban board
 */
import type { Issue, IssueState } from '../../types/issue'
import { STATE_TO_COLUMN } from '../../types/issue'
import { IssueCard } from './IssueCard'

interface KanbanColumnProps {
  state: IssueState
  issues: Issue[]
  onIssueClick?: (issue: Issue) => void
}

const COLUMN_COLORS: Record<IssueState, string> = {
  backlog: 'border-gray-500',
  analysis: 'border-purple-500',
  development: 'border-blue-500',
  testing: 'border-yellow-500',
  review: 'border-orange-500',
  done: 'border-green-500',
  cancelled: 'border-red-500'
}

export function KanbanColumn({ state, issues, onIssueClick }: KanbanColumnProps) {
  const columnName = STATE_TO_COLUMN[state]
  const borderColor = COLUMN_COLORS[state]

  const blockedCount = issues.filter(i => i.isBlocked).length

  return (
    <div className={`flex flex-col bg-gray-800 rounded-lg border-t-4 ${borderColor} min-w-[280px] max-w-[320px]`}>
      {/* Column Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">{columnName}</h3>
          <div className="flex items-center gap-2">
            <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full text-xs">
              {issues.length}
            </span>
            {blockedCount > 0 && (
              <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-xs">
                {blockedCount} blocked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Issues */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
        {issues.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No issues
          </div>
        ) : (
          issues.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onClick={onIssueClick}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default KanbanColumn
