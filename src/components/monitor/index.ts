/**
 * Agent Monitor Components - Issue #32 exports
 */
export { AgentMonitor } from './AgentMonitor'
export { AgentMonitor as default } from './AgentMonitor'
export { AgentCard } from './AgentCard'
export { AgentDetailView } from './AgentDetailView'
export { AgentTimeline } from './AgentTimeline'

// Re-export utilities
export { 
  getStatusIndicator, 
  truncateThinking, 
  filterAgentsByProject 
} from './AgentMonitor'

export type { Agent } from './AgentMonitor'