/**
 * Multi-Agent Command Center Dashboard
 * Real-time agent coordination with WebSocket events
 * Responsive design with mobile support
 */
import React, { useState } from 'react'
import { ToastProvider, useToast } from './hooks/useToast'
import { Drawer, BottomNavigation } from './components/ui'
import { KanbanBoard } from './components/kanban'
import { AgentGrid } from './components/agents'
import { ActivityFeed } from './components/activity'
import { ConnectionStatus } from './components/ConnectionStatus'
import { AgentMonitor } from './components/monitor'
import { MetricsDashboard } from './components/MetricsDashboard'

// Navigation items
const navItems = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    key: 'agent-monitor',
    label: 'Agenten',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: 'metrics',
    label: 'Metriken',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showToast] = useToast()

  const status = 'disconnected' as const
  const agentCount = 0
  const issueCount = 0
  const blockedAgents = 0
  const blockedIssues = 0

  const activeIndex = navItems.findIndex((item) => item.key === currentView)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-16 lg:pb-0">
      {/* Mobile Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Command Center
          </h1>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Multi-Agent Command Center
            </h1>
            
            {/* Desktop Navigation */}
            <nav className="flex gap-2 ml-4">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setCurrentView(item.key)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    currentView === item.key 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
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
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        title="Navigation"
      >
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setCurrentView(item.key)
                setIsMobileMenuOpen(false)
              }}
              className={`w-full px-4 py-3 rounded-lg text-left transition-colors flex items-center gap-3 ${
                currentView === item.key 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </Drawer>

      {/* Main Content */}
      <main>
        {/* Connection Warning */}
        {status !== 'connected' && currentView === 'dashboard' && (
          <div className="m-4 lg:m-6 bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
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
          <div className="p-4">Agent Monitor disabled for debug</div>
        ) : currentView === 'metrics' ? (
          <MetricsDashboard />
        ) : (
          <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
            <div>Agent Grid disabled</div>
            <div>Kanban Board disabled</div>
            <ActivityFeed maxItems={15} />
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation
        items={navItems.map((item) => ({
          ...item,
          onClick: () => setCurrentView(item.key),
        }))}
        activeIndex={activeIndex}
      />

      {/* Desktop Footer */}
      <footer className="hidden lg:block bg-gray-900 border-t border-gray-800 px-6 py-3 text-center text-gray-500 text-sm">
        Multi-Agent Command Center • WebSocket Real-time Events • State Machine Workflow
      </footer>
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
