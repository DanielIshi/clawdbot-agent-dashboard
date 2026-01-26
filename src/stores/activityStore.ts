/**
 * Activity Store - manages activity feed / event history
 */
import { create } from 'zustand'
import type { EventEnvelope } from '../types/events'

interface ActivityItem {
  id: string
  timestamp: Date
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  projectId?: string
  agentId?: string
  issueId?: string
  eventType?: string
}

interface ActivityState {
  activities: ActivityItem[]
  processedEventIds: Set<string>
  maxActivities: number

  // Actions
  addActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => void
  processEvent: (event: EventEnvelope) => void
  clearActivities: () => void
  isEventProcessed: (eventId: string) => boolean
}

// Generate human-readable message from event
function eventToMessage(event: EventEnvelope): { message: string; type: ActivityItem['type'] } {
  const payload = event.payload as Record<string, unknown>

  switch (event.event_type) {
    case 'issue.created': {
      const issue = payload.issue as { number?: number; title?: string }
      return {
        message: `Issue #${issue?.number} created: ${issue?.title?.slice(0, 40)}...`,
        type: 'success'
      }
    }

    case 'issue.state_changed': {
      const issue = payload.issue as { number?: number }
      return {
        message: `Issue #${issue?.number} moved: ${payload.previous_state} → ${payload.new_state}`,
        type: 'info'
      }
    }

    case 'issue.blocked': {
      const issue = payload.issue as { number?: number }
      return {
        message: `Issue #${issue?.number} blocked: ${payload.reason}`,
        type: 'warning'
      }
    }

    case 'issue.unblocked': {
      const issue = payload.issue as { number?: number }
      return {
        message: `Issue #${issue?.number} unblocked`,
        type: 'success'
      }
    }

    case 'issue.assigned': {
      const issue = payload.issue as { number?: number }
      const agent = payload.agent as { name?: string }
      return {
        message: `Issue #${issue?.number} assigned to ${agent?.name}`,
        type: 'info'
      }
    }

    case 'issue.unassigned': {
      const issue = payload.issue as { number?: number }
      return {
        message: `Issue #${issue?.number} unassigned`,
        type: 'info'
      }
    }

    case 'issue.completed': {
      const issue = payload.issue as { number?: number; title?: string }
      return {
        message: `✓ Issue #${issue?.number} completed: ${issue?.title?.slice(0, 30)}...`,
        type: 'success'
      }
    }

    case 'agent.status_changed': {
      const agent = payload.agent as { name?: string }
      const reason = payload.reason as string | undefined
      let msg = `Agent ${agent?.name}: ${payload.previous_status || 'new'} → ${payload.new_status}`
      if (reason) msg += ` (${reason})`
      return {
        message: msg,
        type: payload.new_status === 'blocked' ? 'warning' : 'info'
      }
    }

    case 'system.error': {
      return {
        message: `System error: ${payload.message || 'Unknown error'}`,
        type: 'error'
      }
    }

    case 'system.alert': {
      const level = payload.level as string
      const levelIcon = level === 'critical' ? '🚨' : level === 'error' ? '❌' : level === 'warning' ? '⚠️' : 'ℹ️'
      return {
        message: `${levelIcon} ${payload.message}`,
        type: level === 'critical' || level === 'error' ? 'error' : level === 'warning' ? 'warning' : 'info'
      }
    }

    default:
      return {
        message: `Event: ${event.event_type}`,
        type: 'info'
      }
  }
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  processedEventIds: new Set(),
  maxActivities: 100,

  addActivity: (activity) => set((state) => {
    const newActivity: ActivityItem = {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: new Date()
    }

    const activities = [newActivity, ...state.activities].slice(0, state.maxActivities)
    return { activities }
  }),

  processEvent: (event) => {
    const state = get()

    // Deduplicate by event_id
    if (state.processedEventIds.has(event.event_id)) {
      return
    }

    const { message, type } = eventToMessage(event)

    set((s) => {
      const newProcessedIds = new Set(s.processedEventIds)
      newProcessedIds.add(event.event_id)

      // Limit processed IDs set size
      if (newProcessedIds.size > 1000) {
        const idsArray = Array.from(newProcessedIds)
        idsArray.splice(0, 500) // Remove oldest 500
        const trimmedSet = new Set(idsArray)
        trimmedSet.add(event.event_id)
        return { processedEventIds: trimmedSet }
      }

      return { processedEventIds: newProcessedIds }
    })

    get().addActivity({
      message,
      type,
      projectId: event.project_id,
      agentId: event.agent_id,
      issueId: event.issue_id,
      eventType: event.event_type
    })
  },

  clearActivities: () => set({ activities: [], processedEventIds: new Set() }),

  isEventProcessed: (eventId) => get().processedEventIds.has(eventId)
}))
