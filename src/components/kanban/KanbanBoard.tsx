/**
 * Kanban Board Component - displays issues in workflow columns
 */
import { useIssueStore } from '../../stores/issueStore'
import { KANBAN_COLUMNS } from '../../types/issue'
import type { Issue } from '../../types/issue'
import { KanbanColumn } from './KanbanColumn'

interface KanbanBoardProps {
  onIssueClick?: (issue: Issue) => void
}

export function KanbanBoard({ onIssueClick }: KanbanBoardProps) {
  const kanbanData = useIssueStore((s) => s.getIssuesForKanban())

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        Kanban Board
      </h2>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map(state => (
          <KanbanColumn
            key={state}
            state={state}
            issues={kanbanData.get(state) || []}
            onIssueClick={onIssueClick}
          />
        ))}
      </div>
    </div>
  )
}

export default KanbanBoard
