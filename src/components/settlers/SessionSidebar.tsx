/**
 * SessionSidebar Component
 * Issue #58: Session Sidebar mit Live-Logs
 *
 * AC1: Sidebar-Layout (Rechts, 300px Desktop, 100% Mobile)
 * AC2: Session-Liste (sortiert nach lastActivity)
 * AC7: Empty-State
 * AC8: Mobile-Collapse (Toggle-Button, Slide-In)
 */

import React, { useState, useMemo } from 'react'
import type { Session } from './types'
import { useSessionPolling } from '../../hooks/useSessionPolling'
import { SessionCard } from './SessionCard'
import { SessionModal } from './SessionModal'

/**
 * Empty-State Component (AC7)
 */
export const SessionEmptyState: React.FC = () => {
  return (
    <div
      data-testid="session-empty-state"
      className="text-center py-8 px-4"
    >
      <div className="text-gray-400 mb-2">
        <svg
          className="w-16 h-16 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <p className="text-gray-600 font-semibold mb-1">
        Keine aktiven Sessions
      </p>
      <p className="text-sm text-gray-500">
        Starte einen Agent, um Sessions hier zu sehen
      </p>
    </div>
  )
}

export const SessionSidebar: React.FC = () => {
  const { sessions, loading, error } = useSessionPolling()
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [isOpen, setIsOpen] = useState(false) // Mobile Toggle-State

  /**
   * Sessions sortiert nach lastActivity (neueste zuerst)
   * AC2: Sortierung
   */
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    })
  }, [sessions])

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session)
  }

  const handleModalClose = () => {
    setSelectedSession(null)
  }

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      {/* Mobile Toggle-Button (AC8) */}
      <button
        data-testid="sidebar-toggle"
        onClick={toggleSidebar}
        className="
          fixed top-4 right-4 z-40
          md:hidden
          bg-blue-500 text-white p-3 rounded-full shadow-lg
          hover:bg-blue-600 transition-colors duration-200
        "
        aria-label="Toggle Sidebar"
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
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Sidebar Container (AC1, AC8) */}
      <div
        data-testid="session-sidebar"
        className={`
          fixed top-0 right-0 h-full bg-gray-100 border-l border-gray-300 z-30
          overflow-y-auto
          transition-transform duration-300 ease-in-out

          /* Desktop: 300px, immer sichtbar */
          md:w-[300px] md:translate-x-0

          /* Mobile: 100%, toggle-bar */
          w-full
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-300 px-4 py-3 z-10">
          <h2 className="text-lg font-bold text-gray-800">Live Sessions</h2>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Loading-State */}
          {loading && sessions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
              <p>Loading sessions...</p>
            </div>
          )}

          {/* Error-State */}
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Empty-State (AC7) */}
          {!loading && sessions.length === 0 && !error && (
            <SessionEmptyState />
          )}

          {/* Session-Liste (AC2) */}
          {sortedSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onClick={handleSessionClick}
            />
          ))}
        </div>
      </div>

      {/* Session-Modal (AC4) */}
      {selectedSession && (
        <SessionModal
          session={selectedSession}
          isOpen={!!selectedSession}
          onClose={handleModalClose}
        />
      )}
    </>
  )
}
