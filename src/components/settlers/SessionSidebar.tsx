/**
 * Session Sidebar Component
 * Issue #58, AC1-8: Sidebar mit Live-Logs
 */

import React from 'react'
import type { Session } from './types'

interface SessionSidebarProps {
  sessions?: Session[]
  isOpen?: boolean
  onToggle?: () => void
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions = [],
  isOpen = true,
  onToggle
}) => {
  return (
    <div
      data-testid="session-sidebar"
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: isOpen ? '300px' : '0',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        overflow: 'auto',
        transition: 'width 0.3s'
      }}
    >
      {isOpen && (
        <div style={{ padding: '16px' }}>
          {sessions.length === 0 ? (
            <div data-testid="empty-state" style={{ textAlign: 'center', color: 'white' }}>
              <div>🤖</div>
              <div>Keine aktiven Sessions</div>
              <div style={{ fontSize: '12px', color: 'gray' }}>
                Starte einen Agent, um Sessions zu sehen
              </div>
            </div>
          ) : (
            sessions.map((session, index) => (
              <div
                key={index}
                data-testid="session-card"
                style={{
                  padding: '12px',
                  margin: '8px 0',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{session.name}</div>
                <div style={{ fontSize: '12px', color: 'gray' }}>{session.project}</div>
                <div
                  data-testid="status-badge"
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    backgroundColor:
                      session.status === 'active'
                        ? '#36c37c'
                        : session.status === 'done'
                        ? '#4b8bff'
                        : '#ff6b6b'
                  }}
                >
                  {session.status}
                </div>
                <div
                  data-testid="session-output"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginTop: '8px'
                  }}
                >
                  {session.lastOutput ? session.lastOutput.slice(0, 60) + (session.lastOutput.length > 60 ? '...' : '') : 'No recent activity'}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
