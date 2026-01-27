import React, { useEffect, useRef, useState } from 'react'
import { Agent } from './AgentCard'
import { AgentTimeline, TimelineEvent } from './AgentTimeline'

interface AgentDetailViewProps {
  agent: Agent
  events: TimelineEvent[]
  onBack?: () => void
}

export const AgentDetailView: React.FC<AgentDetailViewProps> = ({ agent, events, onBack }) => {
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevEventsLength = useRef(events.length)

  useEffect(() => {
    if (autoScroll && events.length > prevEventsLength.current && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    prevEventsLength.current = events.length
  }, [events, autoScroll])

  return (
    <div
      data-testid="detail-view"
      style={{
        width: '100%',
        backgroundColor: '#0f0f1a',
        padding: '16px',
        minHeight: '100vh',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#4a9eff',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '12px',
            minHeight: '44px',
          }}
        >
          ← Zurück
        </button>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888' }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            aria-label="auto-scroll"
          />
          Auto-scroll
        </label>
      </div>

      <h2 style={{ color: '#fff', marginBottom: '16px' }}>{agent.name}</h2>
      
      <div style={{ marginBottom: '8px', color: '#888' }}>
        {agent.currentIssue && <span>Issue: {agent.currentIssue}</span>}
        {agent.project && <span style={{ marginLeft: '16px' }}>Project: {agent.project}</span>}
      </div>

      <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
        <AgentTimeline events={events} />
        <div ref={scrollRef} />
      </div>
    </div>
  )
}
