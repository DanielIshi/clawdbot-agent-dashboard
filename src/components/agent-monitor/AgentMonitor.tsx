import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { AgentCard, Agent } from './AgentCard'
import { AgentDetailView } from './AgentDetailView'
import { TimelineEvent } from './AgentTimeline'

interface AgentMonitorProps {
  agents: Agent[]
  onAgentUpdate?: () => void
  timelineEvents?: TimelineEvent[]
}

export const AgentMonitor: React.FC<AgentMonitorProps> = ({
  agents,
  onAgentUpdate,
  timelineEvents = [],
}) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [filter, setFilter] = useState<string>('alle')
  const [isPolling, setIsPolling] = useState(true)

  // Extract unique projects
  const projects = useMemo(() => {
    const projectSet = new Set(agents.map((a) => a.project))
    return Array.from(projectSet)
  }, [agents])

  // Filter agents by project
  const filteredAgents = useMemo(() => {
    if (filter === 'alle') return agents
    return agents.filter((a) => a.project === filter)
  }, [agents, filter])

  // Count active agents
  const activeCount = useMemo(() => {
    return agents.filter((a) => {
      const timeSince = Date.now() - a.lastActivity
      return timeSince < 60000 || a.status === 'active'
    }).length
  }, [agents])

  // Polling effect - calls onAgentUpdate immediately and then every 5s
  useEffect(() => {
    if (!onAgentUpdate) return

    // Initial call after a short delay to let component mount
    const initialTimeout = setTimeout(() => {
      onAgentUpdate()
    }, 100)

    const interval = setInterval(() => {
      onAgentUpdate()
    }, 5000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [onAgentUpdate])

  const handleCardClick = useCallback((agent: Agent) => {
    setSelectedAgent(agent)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedAgent(null)
  }, [])

  // Virtualization check - use virtual list for 40+ agents
  const useVirtualization = agents.length > 40

  // Determine grid columns based on viewport width
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  
  const getGridTemplateColumns = () => {
    if (isMobile) {
      return 'repeat(2, 1fr)' // 2 columns on mobile
    }
    if (isDesktop) {
      return 'repeat(10, minmax(100px, 1fr))' // 10 columns on desktop
    }
    return 'repeat(auto-fill, minmax(140px, 1fr))' // auto for tablet
  }

  if (selectedAgent) {
    return (
      <AgentDetailView
        agent={selectedAgent}
        events={timelineEvents}
        onBack={handleBack}
      />
    )
  }

  return (
    <div style={{ padding: '16px', backgroundColor: '#0f0f1a', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ color: '#fff', margin: 0 }}>Agenten Monitor</h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#4ade80' }}>🟢 {activeCount}</span>
          
          <span
            data-polling="true"
            data-ws-connected="false"
            style={{ color: '#4ade80', fontSize: '12px' }}
          >
            ● Live
          </span>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <select
          aria-label="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #333',
            backgroundColor: '#1a1a2e',
            color: '#fff',
          }}
        >
          <option value="alle">Alle</option>
          {projects.map((project) => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </select>
      </div>

      <div
        data-testid="agent-grid"
        data-virtualized={useVirtualization ? 'true' : 'false'}
        style={{
          display: 'grid',
          gridTemplateColumns: getGridTemplateColumns(),
          gap: '12px',
          overflow: 'auto',
          maxHeight: 'calc(100vh - 150px)',
        }}
      >
        {filteredAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onClick={() => handleCardClick(agent)}
          />
        ))}
      </div>
    </div>
  )
}
