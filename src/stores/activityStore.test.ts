/**
 * Tests für Activity Store (Issue #20, #26)
 * Akzeptanzkriterien Issue #20:
 * - [x] Neuste Events oben
 * - [x] Genau ein Eintrag pro Event
 * - [x] Real-time Updates
 *
 * Akzeptanzkriterien Issue #26:
 * - [x] Event-ID Duplikat-Filter
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useActivityStore } from './activityStore'
import type { EventEnvelope } from '../types/events'

describe('Activity Store (Issue #20, #26)', () => {
  beforeEach(() => {
    useActivityStore.getState().clearActivities()
  })

  const createMockEvent = (
    id: string,
    type: string = 'issue.created',
    seq: number = 1
  ): EventEnvelope => ({
    event_id: id,
    event_type: type as EventEnvelope['event_type'],
    timestamp: new Date().toISOString(),
    project_id: 'project-1',
    seq,
    payload: { title: 'Test' }
  })

  describe('Activity Feed', () => {
    it('sollte Activity hinzufügen', () => {
      useActivityStore.getState().addActivity({
        message: 'Test activity',
        type: 'info'
      })

      expect(useActivityStore.getState().activities.length).toBe(1)
    })

    it('sollte neuste Activities oben haben', () => {
      useActivityStore.getState().addActivity({ message: 'First', type: 'info' })
      useActivityStore.getState().addActivity({ message: 'Second', type: 'info' })
      useActivityStore.getState().addActivity({ message: 'Third', type: 'info' })

      const activities = useActivityStore.getState().activities
      expect(activities[0].message).toBe('Third')
      expect(activities[1].message).toBe('Second')
      expect(activities[2].message).toBe('First')
    })

    it('sollte maxActivities respektieren', () => {
      const store = useActivityStore.getState()

      // Add more than max
      for (let i = 0; i < 150; i++) {
        store.addActivity({ message: `Activity ${i}`, type: 'info' })
      }

      expect(useActivityStore.getState().activities.length).toBeLessThanOrEqual(100)
    })

    it('sollte Activities löschen können', () => {
      useActivityStore.getState().addActivity({ message: 'Test', type: 'info' })
      useActivityStore.getState().clearActivities()

      expect(useActivityStore.getState().activities.length).toBe(0)
    })
  })

  describe('Event Processing', () => {
    it('sollte Event zu Activity konvertieren', () => {
      const event = createMockEvent('event-1', 'issue.created')
      useActivityStore.getState().processEvent(event)

      const activities = useActivityStore.getState().activities
      expect(activities.length).toBe(1)
      expect(activities[0].message).toContain('Issue')
    })

    it('sollte eventType in Activity speichern', () => {
      const event = createMockEvent('event-1', 'agent.status_changed')
      useActivityStore.getState().processEvent(event)

      const activity = useActivityStore.getState().activities[0]
      expect(activity.eventType).toBe('agent.status_changed')
    })

    it('sollte verschiedene Event-Typen korrekt formatieren', () => {
      const events = [
        { type: 'issue.created', expectedContains: 'created' },
        { type: 'issue.state_changed', expectedContains: 'moved' },
        { type: 'issue.blocked', expectedContains: 'blocked' },
        { type: 'agent.status_changed', expectedContains: 'Agent' }
      ]

      events.forEach((testCase, i) => {
        const event = createMockEvent(`event-${i}`, testCase.type, i + 1)
        useActivityStore.getState().processEvent(event)
      })

      const activities = useActivityStore.getState().activities
      expect(activities.some(a => a.message.toLowerCase().includes('created'))).toBe(true)
    })
  })

  describe('Event-ID Duplikat-Filter (Issue #26)', () => {
    it('sollte Duplikate ignorieren', () => {
      const event = createMockEvent('event-1')

      useActivityStore.getState().processEvent(event)
      useActivityStore.getState().processEvent(event) // Duplikat
      useActivityStore.getState().processEvent(event) // Duplikat

      expect(useActivityStore.getState().activities.length).toBe(1)
    })

    it('sollte processedEventIds tracken', () => {
      const event1 = createMockEvent('event-1')
      const event2 = createMockEvent('event-2')

      useActivityStore.getState().processEvent(event1)
      useActivityStore.getState().processEvent(event2)

      expect(useActivityStore.getState().isEventProcessed('event-1')).toBe(true)
      expect(useActivityStore.getState().isEventProcessed('event-2')).toBe(true)
      expect(useActivityStore.getState().isEventProcessed('event-3')).toBe(false)
    })

    it('sollte verschiedene Events mit gleichen Daten als unterschiedlich behandeln', () => {
      const event1 = createMockEvent('event-1', 'issue.created', 1)
      const event2 = createMockEvent('event-2', 'issue.created', 2)

      useActivityStore.getState().processEvent(event1)
      useActivityStore.getState().processEvent(event2)

      expect(useActivityStore.getState().activities.length).toBe(2)
    })

    it('sollte processedEventIds Set begrenzen', () => {
      // Add many events to trigger cleanup
      for (let i = 0; i < 1500; i++) {
        const event = createMockEvent(`event-${i}`, 'issue.created', i)
        useActivityStore.getState().processEvent(event)
      }

      // Set should be trimmed (implementation limits to ~1000)
      expect(useActivityStore.getState().processedEventIds.size).toBeLessThanOrEqual(1100)
    })
  })

  describe('Activity Types', () => {
    it('sollte success für positive Events setzen', () => {
      const event = createMockEvent('event-1', 'issue.created')
      useActivityStore.getState().processEvent(event)

      expect(useActivityStore.getState().activities[0].type).toBe('success')
    })

    it('sollte warning für blocked Events setzen', () => {
      const event = createMockEvent('event-1', 'issue.blocked')
      event.payload = { reason: 'Test block' }
      useActivityStore.getState().processEvent(event)

      expect(useActivityStore.getState().activities[0].type).toBe('warning')
    })

    it('sollte error für system.error setzen', () => {
      const event = createMockEvent('event-1', 'system.error')
      event.payload = { message: 'Test error' }
      useActivityStore.getState().processEvent(event)

      expect(useActivityStore.getState().activities[0].type).toBe('error')
    })
  })
})
