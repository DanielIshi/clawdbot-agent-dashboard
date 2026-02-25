/**
 * Live Agent Stream View
 * Feature #64: Live Agent Stream View mit Split-Screen
 */

import React, { useMemo } from 'react'
import { useLiveSessionPolling, LiveAgentSession } from '../../hooks/useLiveSessionPolling'
import { useSessionLogPolling } from '../../hooks/useSessionLogPolling'

const QUARTER_COUNT = 4

const getAgentName = (session: LiveAgentSession) => {
  return session.agentName || session.name || 'Unbekannter Agent'
}

const getOrderTitle = (session: LiveAgentSession) => {
  return session.order || session.task || session.project || session.name || 'Unbekannter Auftrag'
}

const getTask = (session: LiveAgentSession) => {
  return session.task || session.tool || session.status || 'Unbekannt'
}

const getProject = (session: LiveAgentSession) => {
  return session.project || 'Unbekanntes Projekt'
}

const getFallbackOutput = (session: LiveAgentSession) => {
  return session.lastOutput || session.output || 'Noch keine Ausgabe'
}

export const LiveAgentStreamView: React.FC = () => {
  const { sessions, loading, error } = useLiveSessionPolling()

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aDate = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
      const bDate = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
      return bDate - aDate
    })
  }, [sessions])

  const topSessions = useMemo(() => sortedSessions.slice(0, QUARTER_COUNT), [sortedSessions])
  const sessionNames = useMemo(
    () => topSessions.map((session) => session.name || '').filter(Boolean),
    [topSessions]
  )
  const outputMap = useSessionLogPolling(sessionNames)

  const quarters = Array.from({ length: QUARTER_COUNT }, (_, index) => topSessions[index] || null)

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Live Agent Stream</h2>
          <p className="text-sm text-gray-400">Split-Screen Output in Echtzeit</p>
        </div>
        {loading && (
          <span className="text-xs text-gray-400">Lade Sessions...</span>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-200">
          Fehler beim Laden: {error}
        </div>
      )}

      <div
        data-testid="live-agent-stream"
        className="grid grid-cols-2 grid-rows-2 gap-4"
      >
        {quarters.map((session, index) => {
          if (!session) {
            return (
              <div
                key={`empty-${index}`}
                data-testid="live-agent-quarter"
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col justify-center items-center text-gray-500"
              >
                <p className="text-sm">Kein Agent aktiv</p>
              </div>
            )
          }

          const agentName = getAgentName(session)
          const orderTitle = getOrderTitle(session)
          const task = getTask(session)
          const project = getProject(session)
          const output = outputMap.get(session.name || '') || getFallbackOutput(session)

          return (
            <div
              key={session.name || index}
              data-testid="live-agent-quarter"
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col"
            >
              <div className="mb-3">
                <h3
                  data-testid="order-title"
                  className="text-sm font-semibold text-blue-300"
                >
                  {orderTitle}
                </h3>
                <div className="mt-2 space-y-1 text-xs text-gray-400">
                  <div>
                    <span className="text-gray-500">Agent:</span>{' '}
                    <span data-testid="agent-name" className="text-gray-200">{agentName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Auftrag:</span>{' '}
                    <span data-testid="agent-task" className="text-gray-200">{task}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Projekt:</span>{' '}
                    <span data-testid="agent-project" className="text-gray-200">{project}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <pre
                  data-testid="live-agent-output"
                  className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed"
                >
                  {output}
                </pre>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
