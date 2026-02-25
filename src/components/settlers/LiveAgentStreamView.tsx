/**
 * Live Agent Stream View
 * MIT CHAT-INTERAKTION!
 */

import React, { useMemo, useState, useRef } from 'react'
import { useLiveSessionPolling, LiveAgentSession } from '../../hooks/useLiveSessionPolling'
import { useSessionLogPolling } from '../../hooks/useSessionLogPolling'

const QUARTER_COUNT = 4

interface ChatMessage {
  role: string
  text: string
  time?: string
}

const getAgentName = (session: LiveAgentSession) => session.agentName || session.name || 'Agent'
const getOrderTitle = (session: LiveAgentSession) => session.order || session.task || session.project || session.name || 'Auftrag'
const getProject = (session: LiveAgentSession) => session.project || 'Projekt'
const getPrompt = (session: LiveAgentSession) => session.prompt || ''

const roleColors: Record<string, string> = {
  user: 'text-green-400',
  assistant: 'text-blue-400', 
  thinking: 'text-yellow-400 italic',
  tool: 'text-orange-400',
  tool_done: 'text-emerald-400',
  summary: 'text-purple-400',
  system: 'text-gray-500'
}

const roleLabels: Record<string, string> = {
  user: '👤 DU',
  assistant: '🤖 AGENT', 
  thinking: '💭',
  tool: '🔧',
  tool_done: '✅',
  summary: '📊',
  system: 'ℹ️'
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
  const sessionNames = useMemo(() => topSessions.map(s => s.name || '').filter(Boolean), [topSessions])
  
  const chatMap = useSessionLogPolling(sessionNames)
  const tmuxMap = useTmuxOutputPolling(topSessions)
  const quarters = Array.from({ length: QUARTER_COUNT }, (_, i) => topSessions[i] || null)

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">🤖 Live Agent Team</h2>
          <p className="text-sm text-gray-400">Chat mit deinen Agenten</p>
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

          const chatData = chatMap.get(session.name || '')
          const tmuxOutput = tmuxMap.get(session.name || '')
          let chatMessages: ChatMessage[] = []
          try {
            chatData && chatData.includes('{') ? chatMessages = JSON.parse(chatData) : chatMessages = []
          } catch { chatMessages = [] }

          return (
            <AgentQuarter key={session.name || index} session={session} chatMessages={chatMessages} tmuxOutput={tmuxOutput} />
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

// Einzelne Agenten-Quarter mit Chat!
function AgentQuarter({ session, chatMessages, tmuxOutput }: { session: LiveAgentSession, chatMessages: ChatMessage[], tmuxOutput?: string }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const sendMessage = async () => {
    if (!message.trim() || sending) return
    
    setSending(true)
    try {
      await fetch(`/api/sessions/${session.name}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() })
      })
      setMessage('')
    } catch (e) {
      console.error('Send error:', e)
    }
    setSending(false)
  }

  const keyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col h-72">
      {/* Header */}
      <div className="border-b border-gray-700 pb-2 mb-2">
        <h3 className="text-sm font-semibold text-blue-300 truncate">
          {getOrderTitle(session)}
        </h3>
        <div className="text-xs text-gray-500 flex gap-2 mt-1">
          <span>{getAgentName(session)}</span>
          <span>•</span>
          <span>{getProject(session)}</span>
        </div>
        {/* Prompt anzeigen */}
        <div className="text-[10px] text-gray-600 mt-1 truncate">
          {getPrompt(session).substring(0, 60)}...
        </div>
      </div>

      {/* Chat-Output (Tmux bevorzugt, sonst Logs) */}
      <div className="flex-1 overflow-auto font-mono text-xs space-y-1 mb-2">
        {tmuxOutput && tmuxOutput.trim() ? (
          // Tmux Live-Output (raw terminal)
          <pre className="text-gray-300 text-[10px] whitespace-pre-wrap leading-tight">
            {tmuxOutput.split('\n').slice(-20).join('\n')}
          </pre>
        ) : chatMessages.length === 0 ? (
          <p className="text-gray-600 italic text-xs">Warte auf Activity...</p>
        ) : (
          // Parsed Chat-Output (Fallback)
          chatMessages.slice(-15).map((msg, i) => (
            <div key={i} className={roleColors[msg.role] || 'text-gray-300'}>
              <span className="text-gray-600 text-[9px] mr-1">
                {roleLabels[msg.role]}
              </span>
              {msg.text}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat-Eingabe */}
      <div className="flex gap-1">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={keyDown}
          placeholder="Nachricht an Agent..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !message.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded px-2 py-1 text-xs"
        >
          {sending ? '...' : '➤'}
        </button>
      </div>
    </div>
  )
}
