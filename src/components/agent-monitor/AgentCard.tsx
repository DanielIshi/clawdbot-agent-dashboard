import React from 'react'

export interface Agent {
  id: string
  name: string
  status: 'active' | 'idle' | 'paused' | 'done' | 'error'
  currentIssue: string | null
  lastActivity: number
  lastThinking: string | null
  project: string
}

interface AgentCardProps {
  agent: Agent
  onClick?: () => void
}

const getStatusInfo = (agent: Agent): { emoji: string; className: string } => {
  const timeSinceActivity = Date.now() - agent.lastActivity
  const isRecentlyActive = timeSinceActivity < 60000 // < 60s
  const isIdle = timeSinceActivity >= 60000 && timeSinceActivity < 300000 // 60s - 5min

  if (agent.status === 'error') {
    return { emoji: '🔴', className: 'status-error' }
  }
  if (agent.status === 'done') {
    return { emoji: '✅', className: 'status-done' }
  }
  if (agent.status === 'paused') {
    return { emoji: '⏸️', className: 'status-paused' }
  }
  if (isRecentlyActive) {
    return { emoji: '🟢', className: 'status-active' }
  }
  if (isIdle) {
    return { emoji: '🟡', className: 'status-idle' }
  }
  return { emoji: '⏸️', className: 'status-paused' }
}

const truncateThinking = (text: string | null, maxLength: number = 50): string => {
  if (!text) return '—'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onClick }) => {
  const { emoji, className } = getStatusInfo(agent)
  const thinkingText = truncateThinking(agent.lastThinking)

  return (
    <div
      data-testid="agent-card"
      className={`agent-card ${className}`}
      onClick={onClick}
      style={{
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '12px',
        cursor: 'pointer',
        minHeight: '44px',
        minWidth: '44px',
        backgroundColor: '#1a1a2e',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span data-testid="status-indicator" className={className}>
          {emoji}
        </span>
        <span style={{ fontWeight: 'bold', color: '#fff' }}>{agent.name}</span>
      </div>
      
      {agent.currentIssue && (
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
          {agent.currentIssue}
        </div>
      )}
      
      <div
        data-testid="thinking-preview"
        style={{ fontSize: '11px', color: '#aaa', fontStyle: 'italic' }}
      >
        {agent.lastThinking ? `💭 ${thinkingText}` : '—'}
      </div>
    </div>
  )
}
