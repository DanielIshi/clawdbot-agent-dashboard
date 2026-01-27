import React from 'react'

export interface TimelineEvent {
  timestamp: string
  type: 'thinking' | 'edit' | 'exec' | 'write' | 'read' | 'result'
  content: string
  status?: 'running' | 'success' | 'error'
}

interface AgentTimelineProps {
  events: TimelineEvent[]
}

const getEventIcon = (event: TimelineEvent): string => {
  switch (event.type) {
    case 'thinking':
      return '💭'
    case 'edit':
      return '🔧'
    case 'exec':
      return '▶️'
    case 'write':
      return '📄'
    case 'read':
      return '📖'
    case 'result':
      return event.status === 'error' ? '❌' : '✅'
    default:
      return '•'
  }
}

export const AgentTimeline: React.FC<AgentTimelineProps> = ({ events }) => {
  // Events are already sorted newest first in mock data
  return (
    <div data-testid="timeline" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {events.map((event, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            gap: '12px',
            padding: '8px',
            borderLeft: '2px solid #333',
            backgroundColor: '#1a1a2e',
          }}
        >
          <span
            data-testid="event-timestamp"
            style={{ color: '#666', fontSize: '12px', minWidth: '60px' }}
          >
            {event.timestamp}
          </span>
          <span style={{ fontSize: '14px' }}>{getEventIcon(event)}</span>
          <span style={{ color: '#ddd', fontSize: '13px', flex: 1 }}>{event.content}</span>
        </div>
      ))}
    </div>
  )
}
