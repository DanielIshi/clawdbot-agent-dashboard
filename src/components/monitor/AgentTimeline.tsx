/**
 * Agent Timeline Component - Issue #32
 */
import React, { useEffect, useRef } from 'react'
import type { Agent } from './AgentMonitor'

interface TimelineEvent {
  id: string
  timestamp: number
  type: 'thinking' | 'edit' | 'exec' | 'write' | 'read' | 'result_success' | 'result_error'
  content: string
}

interface AgentTimelineProps {
  agent: Agent
  autoScroll: boolean
}

function getEventIcon(eventType: string): string {
  switch (eventType) {
    case 'thinking': return '💭'
    case 'edit': return '🔧'
    case 'exec': return '▶️'
    case 'write': return '📄'
    case 'read': return '📖'
    case 'result_success': return '✅'
    case 'result_error': return '❌'
    default: return '📄'
  }
}

export function AgentTimeline({ agent, autoScroll }: AgentTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)

  // Mock timeline events for demo
  const events: TimelineEvent[] = [
    {
      id: '1',
      timestamp: Date.now() - 1000,
      type: 'thinking',
      content: agent.lastThinking || 'Working on current task...'
    },
    {
      id: '2', 
      timestamp: Date.now() - 15000,
      type: 'exec',
      content: 'npm test'
    },
    {
      id: '3',
      timestamp: Date.now() - 30000,
      type: 'write',
      content: 'Created new component file'
    },
    {
      id: '4',
      timestamp: Date.now() - 45000,
      type: 'edit',
      content: 'Modified AgentCard.tsx'
    },
    {
      id: '5',
      timestamp: Date.now() - 60000,
      type: 'read',
      content: 'Reading test specifications'
    },
    {
      id: '6',
      timestamp: Date.now() - 75000,
      type: 'result_success',
      content: 'Tests passed successfully'
    },
    {
      id: '7',
      timestamp: Date.now() - 90000,
      type: 'result_error',
      content: 'Build failed with 3 errors'
    }
  ]

  // Sort events by timestamp (newest first)
  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp)

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight
    }
  }, [events, autoScroll])

  return (
    <div className="bg-gray-800 rounded-lg">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Event Timeline</h3>
        <p className="text-sm text-gray-400">Live events from {agent.name}</p>
      </div>
      
      <div
        ref={timelineRef}
        data-testid="timeline"
        className="max-h-96 overflow-y-auto p-4"
      >
        <div className="space-y-4">
          {sortedEvents.map(event => (
            <div key={event.id} className="flex gap-3">
              {/* Event Icon */}
              <div className="flex-shrink-0 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm">
                {getEventIcon(event.type)}
              </div>
              
              {/* Event Content */}
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-gray-400 capitalize">
                    {event.type.replace('_', ' ')}
                  </span>
                  <span 
                    data-testid="event-timestamp"
                    className="text-xs text-gray-500"
                  >
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm text-white bg-gray-700/50 rounded p-2">
                  {event.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AgentTimeline