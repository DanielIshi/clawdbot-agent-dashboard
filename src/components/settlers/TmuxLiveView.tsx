/**
 * Tmux Live View - Raw Terminal Output
 * Zeigt die rohe Tmux-Ausgabe der Agenten im Terminal-Stil
 */

import React, { useMemo, useEffect, useState } from 'react'
import { useLiveSessionPolling, LiveAgentSession } from '../../hooks/useLiveSessionPolling'

const QUARTER_COUNT = 4

const getAgentName = (session: LiveAgentSession) => session.agentName || session.name || 'Agent'
const getOrderTitle = (session: LiveAgentSession) => session.order || session.task || session.project || session.name || 'Auftrag'
const getProject = (session: LiveAgentSession) => session.project || 'Projekt'

export const TmuxLiveView: React.FC = () => {
  const { sessions, loading, error } = useLiveSessionPolling()

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aDate = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
      const bDate = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
      return bDate - aDate
    })
  }, [sessions])

  const topSessions = useMemo(() => sortedSessions.slice(0, QUARTER_COUNT), [sortedSessions])
  const tmuxMap = useTmuxOutputPolling(topSessions)
  const quarters = Array.from({ length: QUARTER_COUNT }, (_, i) => topSessions[i] || null)

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">🖥️ Tmux Live Terminal</h2>
          <p className="text-sm text-gray-400">Rohe Terminal-Ausgabe der Agenten (3s refresh)</p>
        </div>
        {loading && <span className="text-xs text-gray-400">Lade...</span>}
      </div>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-200">
          Fehler: {error}
        </div>
      )}

      <div className="grid grid-cols-2 grid-rows-2 gap-4">
        {quarters.map((session, index) => {
          if (!session) {
            return (
              <div key={`empty-${index}`} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col justify-center items-center text-gray-500">
                <p className="text-sm">Kein Agent aktiv</p>
              </div>
            )
          }

          const tmuxOutput = tmuxMap.get(session.name || '')

          return (
            <TmuxQuarter key={session.name || index} session={session} tmuxOutput={tmuxOutput} />
          )
        })}
      </div>
    </div>
  )
}

// Hook for Tmux output polling
function useTmuxOutputPolling(sessions: LiveAgentSession[]): Map<string, string> {
  const [outputMap, setOutputMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (sessions.length === 0) return

    const fetchTmux = async () => {
      const results = await Promise.all(
        sessions.map(async (s) => {
          if (!s.name) return [s.name || '', ''] as const
          try {
            const res = await fetch(`/api/sessions/${encodeURIComponent(s.name)}/tmux-output`)
            const data = await res.json()
            return [s.name, data.output || ''] as const
          } catch {
            return [s.name, ''] as const
          }
        })
      )
      setOutputMap(new Map(results))
    }

    fetchTmux()
    const interval = setInterval(fetchTmux, 3000)
    return () => clearInterval(interval)
  }, [sessions])

  return outputMap
}

// Einzelnes Tmux-Quarter (Terminal-Ansicht)
function TmuxQuarter({ session, tmuxOutput }: { session: LiveAgentSession, tmuxOutput?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col h-96">
      {/* Header */}
      <div className="border-b border-gray-700 pb-2 mb-2">
        <h3 className="text-sm font-semibold text-green-300 truncate">
          🖥️ {getOrderTitle(session)}
        </h3>
        <div className="text-xs text-gray-500 flex gap-2 mt-1">
          <span>{getAgentName(session)}</span>
          <span>•</span>
          <span>{getProject(session)}</span>
        </div>
      </div>

      {/* Tmux Terminal Output */}
      <div className="flex-1 overflow-auto bg-black rounded border border-gray-700 p-2">
        {tmuxOutput && tmuxOutput.trim() ? (
          <pre className="text-green-400 text-[10px] font-mono whitespace-pre-wrap leading-tight">
            {tmuxOutput}
          </pre>
        ) : (
          <p className="text-gray-600 italic text-xs">Warte auf Tmux-Output...</p>
        )}
      </div>

      {/* Status Footer */}
      <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between items-center text-[10px] text-gray-500">
        <span>Live Terminal (3s)</span>
        {session.lastActivity && (
          <span>
            Letzte Aktivität: {new Date(session.lastActivity).toLocaleTimeString('de-DE')}
          </span>
        )}
      </div>
    </div>
  )
}
