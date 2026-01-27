/**
 * Multi-Agent Command Center Dashboard
 * Real-time agent coordination with WebSocket events
 */
import React from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { useAgentStore } from './stores/agentStore'
import { useIssueStore } from './stores/issueStore'
// Connection store used internally by useWebSocket
import { KanbanBoard } from './components/kanban'
import { AgentGrid } from './components/agents'
import { ActivityFeed } from './components/activity'
import { ConnectionStatus } from './components/ConnectionStatus'
import { AgentMonitor } from './components/monitor'

// Stable reference to avoid re-renders
const WS_TOPICS: string[] = ['all']
const WS_OPTIONS = {
  clientName: 'dashboard',
  topics: WS_TOPICS
}

function App() {
  const [currentView, setCurrentView] = React.useState('dashboard')
  
  // Initialize WebSocket connection (URL auto-detected based on environment)
  // DEBUG: Temporarily disabled to isolate the issue
  // const { status, requestSnapshot } = useWebSocket(WS_OPTIONS)
  const status = 'disconnected' as const
  const requestSnapshot = () => {}

  // Get counts for header stats - DEBUG: hardcoded to isolate issue
  const agentCount = 0 // useAgentStore((s) => s.agents.size)
  const issueCount = 0 // useIssueStore((s) => s.issues.size)
  const blockedAgents = 0 // useAgentStore((s) => ...)
  const blockedIssues = 0 // useIssueStore((s) => ...)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Multi-Agent Command Center
            </h1>
            
            {/* Navigation Tabs */}
            <nav className="flex gap-2 ml-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  currentView === 'dashboard' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('agent-monitor')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  currentView === 'agent-monitor' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Agenten Monitor
              </button>
            </nav>
            
            <ConnectionStatus />
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{agentCount}</div>
              <div className="text-xs text-gray-500">Agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{issueCount}</div>
              <div className="text-xs text-gray-500">Issues</div>
            </div>
            {(blockedAgents > 0 || blockedIssues > 0) && (
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {blockedAgents + blockedIssues}
                </div>
                <div className="text-xs text-red-400">Blocked</div>
              </div>
            )}
            <button
              onClick={requestSnapshot}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Connection Warning */}
        {status !== 'connected' && currentView === 'dashboard' && (
          <div className="m-6 bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-yellow-200 font-medium">
                {status === 'connecting' && 'Connecting to server...'}
                {status === 'reconnecting' && 'Connection lost. Attempting to reconnect...'}
                {status === 'disconnected' && 'Disconnected from server. Please check if the API is running.'}
              </p>
              <p className="text-yellow-400 text-sm mt-1">
                Start the API server with: <code className="bg-yellow-900/50 px-1 rounded">cd api && npm start</code>
              </p>
            </div>
          </div>
        )}

        {currentView === 'agent-monitor' ? (
          <div>Agent Monitor disabled for debug</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* DEBUG: Components disabled to isolate issue */}
            <div>Agent Grid disabled</div>
            <div>Kanban Board disabled</div>

            {/* DEBUG: Testing ActivityFeed */}
            <ActivityFeed maxItems={15} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 px-6 py-3 text-center text-gray-500 text-sm">
        Multi-Agent Command Center • WebSocket Real-time Events • State Machine Workflow
      </footer>
    </div>
  )
}

export default App
