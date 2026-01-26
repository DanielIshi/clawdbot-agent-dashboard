/**
 * Tests für Event Envelope (Issue #5)
 * Akzeptanzkriterien:
 * - [x] UUID für event_id (global eindeutig)
 * - [x] Monoton steigende seq pro Topic
 * - [x] ISO-8601 UTC Timestamps
 * - [x] Idempotenz durch event_id
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createEventEnvelope, validateEnvelope, EventTypes } from './envelope.js'

describe('Event Envelope (Issue #5)', () => {
  let seqCounter = 0
  const getNextSeq = () => ++seqCounter

  beforeEach(() => {
    seqCounter = 0
  })

  describe('UUID für event_id', () => {
    it('sollte eine gültige UUID als event_id generieren', () => {
      const event = createEventEnvelope({
        event_type: EventTypes.ISSUE_CREATED,
        project_id: 'test-project',
        payload: { title: 'Test' },
        getNextSeq
      })

      // UUID v4 Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(event.event_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
    })

    it('sollte eindeutige event_ids für verschiedene Events generieren', () => {
      const event1 = createEventEnvelope({
        event_type: EventTypes.ISSUE_CREATED,
        project_id: 'test',
        payload: {},
        getNextSeq
      })
      const event2 = createEventEnvelope({
        event_type: EventTypes.ISSUE_CREATED,
        project_id: 'test',
        payload: {},
        getNextSeq
      })

      expect(event1.event_id).not.toBe(event2.event_id)
    })
  })

  describe('Monoton steigende seq', () => {
    it('sollte aufsteigende Sequenznummern vergeben', () => {
      const event1 = createEventEnvelope({
        event_type: EventTypes.ISSUE_CREATED,
        project_id: 'test',
        payload: {},
        getNextSeq
      })
      const event2 = createEventEnvelope({
        event_type: EventTypes.ISSUE_CREATED,
        project_id: 'test',
        payload: {},
        getNextSeq
      })
      const event3 = createEventEnvelope({
        event_type: EventTypes.ISSUE_CREATED,
        project_id: 'test',
        payload: {},
        getNextSeq
      })

      expect(event1.seq).toBe(1)
      expect(event2.seq).toBe(2)
      expect(event3.seq).toBe(3)
      expect(event3.seq).toBeGreaterThan(event2.seq)
      expect(event2.seq).toBeGreaterThan(event1.seq)
    })
  })

  describe('ISO-8601 UTC Timestamps', () => {
    it('sollte einen gültigen ISO-8601 Timestamp setzen', () => {
      const event = createEventEnvelope({
        event_type: EventTypes.ISSUE_CREATED,
        project_id: 'test',
        payload: {},
        getNextSeq
      })

      // ISO-8601 Format: 2024-01-26T12:00:00.000Z
      expect(event.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      )

      // Sollte als Date parsebar sein
      const date = new Date(event.timestamp)
      expect(date.getTime()).not.toBeNaN()
    })

    it('sollte UTC Zeitzone verwenden (Z suffix)', () => {
      const event = createEventEnvelope({
        event_type: EventTypes.ISSUE_CREATED,
        project_id: 'test',
        payload: {},
        getNextSeq
      })

      expect(event.timestamp.endsWith('Z')).toBe(true)
    })
  })

  describe('Event Validierung', () => {
    it('sollte gültiges Event akzeptieren', () => {
      const event = createEventEnvelope({
        event_type: EventTypes.ISSUE_CREATED,
        project_id: 'test',
        payload: { title: 'Test Issue' },
        getNextSeq
      })

      const result = validateEnvelope(event)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('sollte fehlendes event_type ablehnen', () => {
      const result = validateEnvelope({
        event_id: 'abc',
        timestamp: new Date().toISOString(),
        project_id: 'test',
        seq: 1,
        payload: {}
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing event_type')
    })

    it('sollte fehlendes payload ablehnen', () => {
      const result = validateEnvelope({
        event_id: 'abc',
        event_type: 'test',
        timestamp: new Date().toISOString(),
        project_id: 'test',
        seq: 1
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing or invalid payload')
    })
  })

  describe('Optionale Felder', () => {
    it('sollte agent_id hinzufügen wenn angegeben', () => {
      const event = createEventEnvelope({
        event_type: EventTypes.AGENT_STATUS_CHANGED,
        project_id: 'test',
        agent_id: 'agent-1',
        payload: {},
        getNextSeq
      })

      expect(event.agent_id).toBe('agent-1')
    })

    it('sollte issue_id hinzufügen wenn angegeben', () => {
      const event = createEventEnvelope({
        event_type: EventTypes.ISSUE_CREATED,
        project_id: 'test',
        issue_id: 'issue-1',
        payload: {},
        getNextSeq
      })

      expect(event.issue_id).toBe('issue-1')
    })

    it('sollte keine undefined Felder enthalten', () => {
      const event = createEventEnvelope({
        event_type: EventTypes.ISSUE_CREATED,
        project_id: 'test',
        payload: {},
        getNextSeq
      })

      expect(event).not.toHaveProperty('agent_id')
      expect(event).not.toHaveProperty('issue_id')
    })
  })

  describe('EventTypes Konstanten', () => {
    it('sollte alle Issue-Events definieren', () => {
      expect(EventTypes.ISSUE_CREATED).toBe('issue.created')
      expect(EventTypes.ISSUE_STATE_CHANGED).toBe('issue.state_changed')
      expect(EventTypes.ISSUE_BLOCKED).toBe('issue.blocked')
      expect(EventTypes.ISSUE_UNBLOCKED).toBe('issue.unblocked')
    })

    it('sollte alle Agent-Events definieren', () => {
      expect(EventTypes.AGENT_STATUS_CHANGED).toBe('agent.status_changed')
      expect(EventTypes.AGENT_ASSIGNED).toBe('agent.assigned')
      expect(EventTypes.AGENT_UNASSIGNED).toBe('agent.unassigned')
    })
  })
})
