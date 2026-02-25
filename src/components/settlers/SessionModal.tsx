/**
 * SessionModal Component
 * Issue #58: AC4 - Session-Click Detail-Ansicht
 *
 * Fullscreen/Overlay Modal mit:
 * - Session-ID Header
 * - Close-Button
 * - Vollständiger Output (nicht truncated)
 * - Click-Outside zum Schließen
 */

import React from 'react'
import type { Session } from './types'
import { StatusBadge } from './StatusBadge'

interface SessionModalProps {
  session: Session
  isOpen: boolean
  onClose: () => void
}

export const SessionModal: React.FC<SessionModalProps> = ({ session, isOpen, onClose }) => {
  if (!isOpen) {
    return null
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Nur bei Click auf Overlay (nicht Content) schließen
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      data-testid="modal-overlay"
      onClick={handleOverlayClick}
      className="
        fixed inset-0 z-50 flex items-center justify-center
        bg-black bg-opacity-50
      "
    >
      <div
        data-testid="session-modal"
        className="
          bg-white rounded-lg shadow-2xl
          w-full max-w-4xl max-h-[90vh]
          overflow-hidden
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800">{session.id}</h2>
            <StatusBadge status={session.status} />
          </div>

          <button
            data-testid="modal-close"
            onClick={onClose}
            className="
              text-gray-500 hover:text-gray-700
              transition-colors duration-200
            "
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content (scrollable) */}
        <div
          data-testid="modal-content"
          className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-100px)]"
        >
          <pre
            data-testid="modal-output"
            className="
              text-sm text-gray-800 whitespace-pre-wrap
              bg-gray-50 p-4 rounded border border-gray-200
            "
            style={{ fontFamily: 'monospace' }}
          >
            {session.output}
          </pre>
        </div>
      </div>
    </div>
  )
}
