/**
 * SessionCard Component
 * Issue #58: AC2 - Session-Liste mit Status
 *          AC3 - Live-Output-Vorschau (Text-Truncation 60 chars)
 *
 * Zeigt Session mit:
 * - Session-ID
 * - Status-Badge
 * - Live-Output-Vorschau (truncated, monospace)
 * - Click-Event für Detail-Ansicht
 */

import React from 'react'
import type { Session } from './types'
import { StatusBadge } from './StatusBadge'

interface SessionCardProps {
  session: Session
  onClick: (session: Session) => void
}

/**
 * Truncates text to maxLength characters (adds "..." if truncated)
 */
function truncateText(text: string, maxLength: number = 60): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength) + '...'
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, onClick }) => {
  return (
    <div
      data-testid="session-card"
      onClick={() => onClick(session)}
      className="
        bg-white border border-gray-300 rounded-lg p-4 mb-3
        cursor-pointer transition-all duration-200
        hover:border-blue-500 hover:shadow-md
      "
    >
      {/* Header: Session ID + Status Badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          data-testid="session-id"
          className="text-sm font-semibold text-gray-800"
        >
          {session.id}
        </span>
        <StatusBadge status={session.status} />
      </div>

      {/* Output Vorschau (truncated, monospace) */}
      <div
        data-testid="session-output"
        className="text-xs text-gray-600"
        style={{ fontFamily: 'monospace' }}
      >
        {truncateText(session.output, 60)}
      </div>
    </div>
  )
}
