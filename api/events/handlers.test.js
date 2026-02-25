/**
 * Tests für Event-Handler (Issues #7-11)
 * Test-First (TDD): Diese Tests werden ERST fehlschlagen, dann implementieren wir die Handler
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EventTypes } from './envelope.js'

// Import handlers (will fail initially - that's OK for TDD!)
import {
  handleIssueStateChanged,
  handleIssueBlocked,
  handleIssueUnblocked,
  handleIssueCompleted,
  handleAgentStatusChanged,
  handleAgentAssigned,
  handleAgentUnassigned
} from './handlers.js'

describe('Event Handlers (Issues #7-11)', () => {
  let mockState
  let mockBroadcast
  let mockEventLog
  let broadcasts

  beforeEach(() => {
    broadcasts = []

    // Mock state
    mockState = {
      agents: new Map(),
      issues: new Map()
    }

    // Mock broadcast function
    mockBroadcast = vi.fn((event) => broadcasts.push(event))

    // Mock event log
    mockEventLog = {
      append: vi.fn(),
      getNextSeq: vi.fn(() => broadcasts.length + 1)
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== Issue #7: issue.state_changed ====================

  describe('Issue #7: issue.state_changed', () => {
    describe('AC1: Payload-Validierung', () => {
      it('should reject event without issue_id', async () => {
        const event = {
          event_type: EventTypes.ISSUE_STATE_CHANGED,
          payload: {
            // missing issue_id
            from_state: 'backlog',
            to_state: 'wip',
            changed_by: 'user'
          }
        }

        await expect(
          handleIssueStateChanged(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/issue_id.*required/i)
      })

      it('should reject event without from_state', async () => {
        const event = {
          event_type: EventTypes.ISSUE_STATE_CHANGED,
          payload: {
            issue_id: 'issue-1',
            // missing from_state
            to_state: 'wip',
            changed_by: 'user'
          }
        }

        await expect(
          handleIssueStateChanged(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/from_state.*required/i)
      })

      it('should reject event without to_state', async () => {
        const event = {
          event_type: EventTypes.ISSUE_STATE_CHANGED,
          payload: {
            issue_id: 'issue-1',
            from_state: 'backlog',
            // missing to_state
            changed_by: 'user'
          }
        }

        await expect(
          handleIssueStateChanged(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/to_state.*required/i)
      })

      it('should reject event with invalid changed_by', async () => {
        const event = {
          event_type: EventTypes.ISSUE_STATE_CHANGED,
          payload: {
            issue_id: 'issue-1',
            from_state: 'backlog',
            to_state: 'wip',
            changed_by: 'invalid' // must be 'user', 'agent', or 'system'
          }
        }

        await expect(
          handleIssueStateChanged(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/changed_by.*must be.*user.*agent.*system/i)
      })

      it('should accept valid payload', async () => {
        const issue = {
          id: 'issue-1',
          number: 42,
          title: 'Test Issue',
          projectId: 'project-1',
          state: 'backlog',
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_STATE_CHANGED,
          payload: {
            issue_id: 'issue-1',
            from_state: 'backlog',
            to_state: 'wip',
            changed_by: 'user'
          }
        }

        const result = await handleIssueStateChanged(event, mockState, mockBroadcast, mockEventLog)

        expect(result).toBeDefined()
        expect(result.success).toBe(true)
      })
    })

    describe('AC2: State-Transition-Validierung', () => {
      it('should allow valid transition: backlog → wip', async () => {
        const issue = {
          id: 'issue-1',
          state: 'backlog',
          projectId: 'project-1',
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_STATE_CHANGED,
          payload: {
            issue_id: 'issue-1',
            from_state: 'backlog',
            to_state: 'wip',
            changed_by: 'user'
          }
        }

        const result = await handleIssueStateChanged(event, mockState, mockBroadcast, mockEventLog)
        expect(result.success).toBe(true)
        expect(mockState.issues.get('issue-1').state).toBe('wip')
      })

      it('should reject invalid transition: done → wip (cannot reactivate)', async () => {
        const issue = {
          id: 'issue-1',
          state: 'done',
          projectId: 'project-1',
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_STATE_CHANGED,
          payload: {
            issue_id: 'issue-1',
            from_state: 'done',
            to_state: 'wip',
            changed_by: 'user'
          }
        }

        await expect(
          handleIssueStateChanged(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/invalid.*transition/i)
      })

      it('should return validTransitions on rejection', async () => {
        const issue = {
          id: 'issue-1',
          state: 'done',
          projectId: 'project-1',
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_STATE_CHANGED,
          payload: {
            issue_id: 'issue-1',
            from_state: 'done',
            to_state: 'wip',
            changed_by: 'user'
          }
        }

        try {
          await handleIssueStateChanged(event, mockState, mockBroadcast, mockEventLog)
          expect.fail('Should have thrown error')
        } catch (error) {
          expect(error.validTransitions).toBeDefined()
          expect(Array.isArray(error.validTransitions)).toBe(true)
        }
      })
    })

    describe('AC3: Issue-State in DB aktualisieren', () => {
      it('should update issue.state', async () => {
        const issue = {
          id: 'issue-1',
          state: 'backlog',
          projectId: 'project-1',
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_STATE_CHANGED,
          payload: {
            issue_id: 'issue-1',
            from_state: 'backlog',
            to_state: 'wip',
            changed_by: 'agent'
          }
        }

        await handleIssueStateChanged(event, mockState, mockBroadcast, mockEventLog)

        const updatedIssue = mockState.issues.get('issue-1')
        expect(updatedIssue.state).toBe('wip')
        expect(updatedIssue.updatedAt).toBeDefined()
        expect(updatedIssue.stateChangedBy).toBe('agent')
      })
    })

    describe('AC4: Event broadcasten', () => {
      it('should broadcast event via WebSocket', async () => {
        const issue = {
          id: 'issue-1',
          state: 'backlog',
          projectId: 'project-1',
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_STATE_CHANGED,
          payload: {
            issue_id: 'issue-1',
            from_state: 'backlog',
            to_state: 'wip',
            changed_by: 'user'
          }
        }

        await handleIssueStateChanged(event, mockState, mockBroadcast, mockEventLog)

        expect(mockBroadcast).toHaveBeenCalledTimes(1)
        expect(broadcasts[0].event_type).toBe(EventTypes.ISSUE_STATE_CHANGED)
        expect(broadcasts[0].payload.issue).toBeDefined()
      })
    })

    describe('AC5: Feed-Eintrag erstellen', () => {
      it('should create feed entry in event log', async () => {
        const issue = {
          id: 'issue-1',
          number: 42,
          title: 'Test Issue',
          state: 'backlog',
          projectId: 'project-1',
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_STATE_CHANGED,
          payload: {
            issue_id: 'issue-1',
            from_state: 'backlog',
            to_state: 'wip',
            changed_by: 'user'
          }
        }

        await handleIssueStateChanged(event, mockState, mockBroadcast, mockEventLog)

        expect(mockEventLog.append).toHaveBeenCalled()
      })
    })

    describe('AC6: Idempotenz', () => {
      it('should skip transition if already in target state (No-Op)', async () => {
        const issue = {
          id: 'issue-1',
          state: 'wip', // already in target state
          projectId: 'project-1',
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_STATE_CHANGED,
          payload: {
            issue_id: 'issue-1',
            from_state: 'wip',
            to_state: 'wip', // same as current
            changed_by: 'user'
          }
        }

        const result = await handleIssueStateChanged(event, mockState, mockBroadcast, mockEventLog)

        expect(result.success).toBe(true)
        expect(result.noop).toBe(true) // No operation performed
        expect(mockBroadcast).not.toHaveBeenCalled() // No broadcast on no-op
      })
    })
  })

  // ==================== Issue #8: issue.blocked / issue.unblocked ====================

  describe('Issue #8: issue.blocked / issue.unblocked', () => {
    describe('AC1: Payload-Validierung für issue.blocked', () => {
      it('should reject without block_reason', async () => {
        const event = {
          event_type: EventTypes.ISSUE_BLOCKED,
          payload: {
            issue_id: 'issue-1',
            // missing block_reason
            block_category: 'dependency',
            blocked_by: 'user'
          }
        }

        await expect(
          handleIssueBlocked(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/block_reason.*required/i)
      })

      it('should reject block_reason shorter than 10 characters', async () => {
        const event = {
          event_type: EventTypes.ISSUE_BLOCKED,
          payload: {
            issue_id: 'issue-1',
            block_reason: 'short', // < 10 chars
            block_category: 'dependency',
            blocked_by: 'user'
          }
        }

        await expect(
          handleIssueBlocked(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/block_reason.*10.*characters/i)
      })

      it('should reject invalid block_category', async () => {
        const event = {
          event_type: EventTypes.ISSUE_BLOCKED,
          payload: {
            issue_id: 'issue-1',
            block_reason: 'Waiting for external API approval',
            block_category: 'invalid_category',
            blocked_by: 'user'
          }
        }

        await expect(
          handleIssueBlocked(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/block_category.*dependency.*question.*technical.*resource/i)
      })

      it('should accept valid block payload', async () => {
        const issue = {
          id: 'issue-1',
          state: 'wip',
          projectId: 'project-1',
          isBlocked: false,
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_BLOCKED,
          payload: {
            issue_id: 'issue-1',
            block_reason: 'Waiting for database migration approval',
            block_category: 'dependency',
            blocked_by: 'agent'
          }
        }

        const result = await handleIssueBlocked(event, mockState, mockBroadcast, mockEventLog)
        expect(result.success).toBe(true)
      })
    })

    describe('AC2: Block Reason ist Pflichtfeld (Invariant)', () => {
      it('should enforce block_reason as mandatory field', async () => {
        const event = {
          event_type: EventTypes.ISSUE_BLOCKED,
          payload: {
            issue_id: 'issue-1',
            block_category: 'technical',
            blocked_by: 'user'
            // no block_reason
          }
        }

        await expect(
          handleIssueBlocked(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/invariant/i)
      })
    })

    describe('AC3: Issue wird als blocked markiert', () => {
      it('should mark issue as blocked with all fields', async () => {
        const issue = {
          id: 'issue-1',
          state: 'wip',
          projectId: 'project-1',
          isBlocked: false,
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_BLOCKED,
          payload: {
            issue_id: 'issue-1',
            block_reason: 'Waiting for security review from InfoSec team',
            block_category: 'dependency',
            expected_unblock_eta: '2026-02-26T10:00:00Z',
            blocked_by: 'system'
          }
        }

        await handleIssueBlocked(event, mockState, mockBroadcast, mockEventLog)

        const blockedIssue = mockState.issues.get('issue-1')
        expect(blockedIssue.isBlocked).toBe(true)
        expect(blockedIssue.blockReason).toBe('Waiting for security review from InfoSec team')
        expect(blockedIssue.blockCategory).toBe('dependency')
        expect(blockedIssue.blockedAt).toBeDefined()
        expect(blockedIssue.expectedUnblockEta).toBe('2026-02-26T10:00:00Z')
        expect(blockedIssue.updatedAt).toBeDefined()
      })
    })

    describe('AC4: Zugewiesener Agent wird ebenfalls blocked', () => {
      it('should block assigned agent when issue is blocked', async () => {
        const agent = {
          id: 'agent-1',
          name: 'Test Agent',
          status: 'working',
          currentIssueId: 'issue-1',
          createdAt: new Date().toISOString()
        }
        const issue = {
          id: 'issue-1',
          number: 42,
          title: 'Test Issue',
          state: 'wip',
          projectId: 'project-1',
          assignedAgentId: 'agent-1',
          isBlocked: false,
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_BLOCKED,
          payload: {
            issue_id: 'issue-1',
            block_reason: 'External API is down, cannot proceed',
            block_category: 'technical',
            blocked_by: 'system'
          }
        }

        await handleIssueBlocked(event, mockState, mockBroadcast, mockEventLog)

        const blockedAgent = mockState.agents.get('agent-1')
        expect(blockedAgent.status).toBe('blocked')
        expect(blockedAgent.blockReason).toContain('Issue #42 blocked')
        expect(blockedAgent.currentIssueId).toBe('issue-1') // still assigned!
        expect(blockedAgent.updatedAt).toBeDefined()
      })
    })

    describe('AC5: Unblock setzt resume_state', () => {
      it('should resume to specified state on unblock', async () => {
        const issue = {
          id: 'issue-1',
          state: 'wip',
          projectId: 'project-1',
          isBlocked: true,
          blockReason: 'Was waiting for approval',
          blockCategory: 'dependency',
          blockedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_UNBLOCKED,
          payload: {
            issue_id: 'issue-1',
            resume_state: 'wip',
            unblock_reason: 'Approval received',
            unblocked_by: 'user'
          }
        }

        await handleIssueUnblocked(event, mockState, mockBroadcast, mockEventLog)

        const unblockedIssue = mockState.issues.get('issue-1')
        expect(unblockedIssue.isBlocked).toBe(false)
        expect(unblockedIssue.state).toBe('wip')
        expect(unblockedIssue.blockReason).toBeNull()
        expect(unblockedIssue.blockCategory).toBeNull()
        expect(unblockedIssue.unblockedAt).toBeDefined()
      })
    })

    describe('AC6: Agent wird automatisch unblocked', () => {
      it('should unblock agent when issue is unblocked', async () => {
        const agent = {
          id: 'agent-1',
          status: 'blocked',
          blockReason: 'Issue #42 blocked: External dependency',
          currentIssueId: 'issue-1',
          createdAt: new Date().toISOString()
        }
        const issue = {
          id: 'issue-1',
          state: 'wip',
          projectId: 'project-1',
          assignedAgentId: 'agent-1',
          isBlocked: true,
          blockReason: 'External dependency',
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_UNBLOCKED,
          payload: {
            issue_id: 'issue-1',
            resume_state: 'wip',
            unblocked_by: 'system'
          }
        }

        await handleIssueUnblocked(event, mockState, mockBroadcast, mockEventLog)

        const unblockedAgent = mockState.agents.get('agent-1')
        expect(unblockedAgent.status).toBe('working') // resumes working
        expect(unblockedAgent.blockReason).toBeNull()
      })
    })

    describe('AC7: Link zu externem Incident speichern', () => {
      it('should store external incident URL', async () => {
        const issue = {
          id: 'issue-1',
          state: 'wip',
          projectId: 'project-1',
          isBlocked: false,
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_BLOCKED,
          payload: {
            issue_id: 'issue-1',
            block_reason: 'Production outage affecting deployment',
            block_category: 'technical',
            blocked_by: 'system',
            external_incident_url: 'https://incident.example.com/INC-12345'
          }
        }

        await handleIssueBlocked(event, mockState, mockBroadcast, mockEventLog)

        const blockedIssue = mockState.issues.get('issue-1')
        expect(blockedIssue.externalIncidentUrl).toBe('https://incident.example.com/INC-12345')
      })

      it('should validate HTTPS URLs only', async () => {
        const issue = {
          id: 'issue-1',
          state: 'wip',
          projectId: 'project-1',
          isBlocked: false,
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_BLOCKED,
          payload: {
            issue_id: 'issue-1',
            block_reason: 'Test block reason for URL validation',
            block_category: 'technical',
            blocked_by: 'user',
            external_incident_url: 'http://insecure.com/incident' // HTTP not HTTPS
          }
        }

        // Should not reject, but log warning
        const result = await handleIssueBlocked(event, mockState, mockBroadcast, mockEventLog)
        expect(result.warnings).toBeDefined()
        expect(result.warnings[0]).toMatch(/https/i)
      })
    })
  })

  // ==================== Issue #9: issue.completed ====================

  describe('Issue #9: issue.completed', () => {
    describe('AC1: Payload-Validierung', () => {
      it('should reject without issue_id', async () => {
        const event = {
          event_type: EventTypes.ISSUE_COMPLETED,
          payload: {
            final_state: 'done',
            completed_by: 'agent'
          }
        }

        await expect(
          handleIssueCompleted(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/issue_id.*required/i)
      })

      it('should reject without final_state', async () => {
        const event = {
          event_type: EventTypes.ISSUE_COMPLETED,
          payload: {
            issue_id: 'issue-1',
            completed_by: 'agent'
          }
        }

        await expect(
          handleIssueCompleted(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/final_state.*required/i)
      })

      it('should reject without completed_by', async () => {
        const event = {
          event_type: EventTypes.ISSUE_COMPLETED,
          payload: {
            issue_id: 'issue-1',
            final_state: 'done'
          }
        }

        await expect(
          handleIssueCompleted(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/completed_by.*required/i)
      })
    })

    describe('AC2: final_state = done oder cancelled', () => {
      it('should reject invalid final_state', async () => {
        const event = {
          event_type: EventTypes.ISSUE_COMPLETED,
          payload: {
            issue_id: 'issue-1',
            final_state: 'in_progress', // invalid
            completed_by: 'user'
          }
        }

        await expect(
          handleIssueCompleted(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/final_state must be 'done' or 'cancelled'/i)
      })

      it('should accept final_state = done', async () => {
        const issue = {
          id: 'issue-1',
          state: 'review',
          projectId: 'project-1',
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_COMPLETED,
          payload: {
            issue_id: 'issue-1',
            final_state: 'done',
            completed_by: 'agent'
          }
        }

        const result = await handleIssueCompleted(event, mockState, mockBroadcast, mockEventLog)
        expect(result.success).toBe(true)
      })

      it('should accept final_state = cancelled', async () => {
        const issue = {
          id: 'issue-1',
          state: 'backlog',
          projectId: 'project-1',
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_COMPLETED,
          payload: {
            issue_id: 'issue-1',
            final_state: 'cancelled',
            completed_by: 'user'
          }
        }

        const result = await handleIssueCompleted(event, mockState, mockBroadcast, mockEventLog)
        expect(result.success).toBe(true)
      })
    })

    describe('AC3: Artifacts speichern', () => {
      it('should store all artifact fields', async () => {
        const issue = {
          id: 'issue-1',
          state: 'review',
          projectId: 'project-1',
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_COMPLETED,
          payload: {
            issue_id: 'issue-1',
            final_state: 'done',
            completed_by: 'agent',
            artifacts: {
              commit: 'abc123def456',
              build_id: 'build-789',
              test_report_url: 'https://ci.example.com/report/123',
              pr_url: 'https://github.com/user/repo/pull/42'
            }
          }
        }

        await handleIssueCompleted(event, mockState, mockBroadcast, mockEventLog)

        const completedIssue = mockState.issues.get('issue-1')
        expect(completedIssue.artifacts).toBeDefined()
        expect(completedIssue.artifacts.commit).toBe('abc123def456')
        expect(completedIssue.artifacts.build_id).toBe('build-789')
        expect(completedIssue.artifacts.test_report_url).toBe('https://ci.example.com/report/123')
        expect(completedIssue.artifacts.pr_url).toBe('https://github.com/user/repo/pull/42')
      })

      it('should validate commit SHA format (optional)', async () => {
        const issue = {
          id: 'issue-1',
          state: 'review',
          projectId: 'project-1',
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_COMPLETED,
          payload: {
            issue_id: 'issue-1',
            final_state: 'done',
            completed_by: 'agent',
            artifacts: {
              commit: 'not-a-valid-sha' // too short
            }
          }
        }

        // Should not reject, but log warning
        const result = await handleIssueCompleted(event, mockState, mockBroadcast, mockEventLog)
        expect(result.warnings).toBeDefined()
      })
    })

    describe('AC4: Agent unassignen', () => {
      it('should unassign agent and set status to idle', async () => {
        const agent = {
          id: 'agent-1',
          status: 'working',
          currentIssueId: 'issue-1',
          completionCount: 5,
          createdAt: new Date().toISOString()
        }
        const issue = {
          id: 'issue-1',
          state: 'review',
          projectId: 'project-1',
          assignedAgentId: 'agent-1',
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_COMPLETED,
          payload: {
            issue_id: 'issue-1',
            final_state: 'done',
            completed_by: 'agent'
          }
        }

        await handleIssueCompleted(event, mockState, mockBroadcast, mockEventLog)

        const idleAgent = mockState.agents.get('agent-1')
        expect(idleAgent.status).toBe('idle')
        expect(idleAgent.currentIssueId).toBeNull()
        expect(idleAgent.lastCompletedIssue).toBe('issue-1')
        expect(idleAgent.completionCount).toBe(6)

        const completedIssue = mockState.issues.get('issue-1')
        expect(completedIssue.assignedAgentId).toBeNull()
      })
    })

    describe('AC5: Issue darf nicht reaktiviert werden', () => {
      it('should prevent reactivation of completed issue', async () => {
        const issue = {
          id: 'issue-1',
          state: 'done',
          projectId: 'project-1',
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_STATE_CHANGED,
          payload: {
            issue_id: 'issue-1',
            from_state: 'done',
            to_state: 'wip',
            changed_by: 'user'
          }
        }

        await expect(
          handleIssueStateChanged(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/cannot reactivate completed issue/i)
      })
    })

    describe('AC6: Completion-Timestamp und Dauer', () => {
      it('should set completedAt and calculate duration', async () => {
        const createdTime = new Date('2026-02-25T10:00:00Z')
        const issue = {
          id: 'issue-1',
          state: 'review',
          projectId: 'project-1',
          createdAt: createdTime.toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_COMPLETED,
          payload: {
            issue_id: 'issue-1',
            final_state: 'done',
            completed_by: 'agent'
          }
        }

        await handleIssueCompleted(event, mockState, mockBroadcast, mockEventLog)

        const completedIssue = mockState.issues.get('issue-1')
        expect(completedIssue.completedAt).toBeDefined()
        expect(completedIssue.durationSeconds).toBeGreaterThan(0)
      })

      it('should use provided duration_seconds if available', async () => {
        const issue = {
          id: 'issue-1',
          state: 'review',
          projectId: 'project-1',
          createdAt: new Date().toISOString()
        }
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_COMPLETED,
          payload: {
            issue_id: 'issue-1',
            final_state: 'done',
            completed_by: 'agent',
            duration_seconds: 3600 // 1 hour
          }
        }

        await handleIssueCompleted(event, mockState, mockBroadcast, mockEventLog)

        const completedIssue = mockState.issues.get('issue-1')
        expect(completedIssue.durationSeconds).toBe(3600)
      })
    })
  })

  // ==================== Issue #10: agent.status_changed ====================

  describe('Issue #10: agent.status_changed', () => {
    describe('AC1: Payload-Validierung', () => {
      it('should reject without agent_id', async () => {
        const event = {
          event_type: EventTypes.AGENT_STATUS_CHANGED,
          payload: {
            from_status: 'idle',
            to_status: 'working'
          }
        }

        await expect(
          handleAgentStatusChanged(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/agent_id.*required/i)
      })

      it('should reject invalid to_status', async () => {
        const event = {
          event_type: EventTypes.AGENT_STATUS_CHANGED,
          payload: {
            agent_id: 'agent-1',
            from_status: 'idle',
            to_status: 'invalid_status'
          }
        }

        await expect(
          handleAgentStatusChanged(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/to_status.*idle.*working.*blocked/i)
      })
    })

    describe('AC2: Status-Transitions validieren', () => {
      it('should allow valid transition: idle → working', async () => {
        const agent = {
          id: 'agent-1',
          status: 'idle',
          currentIssueId: 'issue-1', // has issue assigned
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)

        const event = {
          event_type: EventTypes.AGENT_STATUS_CHANGED,
          payload: {
            agent_id: 'agent-1',
            from_status: 'idle',
            to_status: 'working'
          }
        }

        const result = await handleAgentStatusChanged(event, mockState, mockBroadcast, mockEventLog)
        expect(result.success).toBe(true)
      })

      it('should allow transition: working → blocked', async () => {
        const agent = {
          id: 'agent-1',
          status: 'working',
          currentIssueId: 'issue-1',
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)

        const event = {
          event_type: EventTypes.AGENT_STATUS_CHANGED,
          payload: {
            agent_id: 'agent-1',
            from_status: 'working',
            to_status: 'blocked',
            reason: 'Issue blocked'
          }
        }

        const result = await handleAgentStatusChanged(event, mockState, mockBroadcast, mockEventLog)
        expect(result.success).toBe(true)
      })
    })

    describe('AC3: working erfordert issue_id != null (Invariant)', () => {
      it('should reject working status without assigned issue', async () => {
        const agent = {
          id: 'agent-1',
          status: 'idle',
          currentIssueId: null, // no issue assigned!
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)

        const event = {
          event_type: EventTypes.AGENT_STATUS_CHANGED,
          payload: {
            agent_id: 'agent-1',
            from_status: 'idle',
            to_status: 'working'
          }
        }

        await expect(
          handleAgentStatusChanged(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/cannot set status to 'working' without assigned issue.*invariant/i)
      })
    })

    describe('AC4: Health-Status tracken', () => {
      it('should update agent health status', async () => {
        const agent = {
          id: 'agent-1',
          status: 'working',
          currentIssueId: 'issue-1',
          health: {
            status: 'healthy',
            lastHeartbeat: new Date().toISOString(),
            errorCount: 0
          },
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)

        const event = {
          event_type: EventTypes.AGENT_STATUS_CHANGED,
          payload: {
            agent_id: 'agent-1',
            from_status: 'working',
            to_status: 'working',
            health: {
              status: 'degraded',
              lastHeartbeat: new Date().toISOString(),
              errorCount: 3
            }
          }
        }

        await handleAgentStatusChanged(event, mockState, mockBroadcast, mockEventLog)

        const updatedAgent = mockState.agents.get('agent-1')
        expect(updatedAgent.health.status).toBe('degraded')
        expect(updatedAgent.health.errorCount).toBe(3)
      })

      it('should trigger system alert on unhealthy with high error count', async () => {
        const agent = {
          id: 'agent-1',
          status: 'working',
          currentIssueId: 'issue-1',
          health: {
            status: 'healthy',
            errorCount: 0
          },
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)

        const event = {
          event_type: EventTypes.AGENT_STATUS_CHANGED,
          payload: {
            agent_id: 'agent-1',
            from_status: 'working',
            to_status: 'working',
            health: {
              status: 'unhealthy',
              lastHeartbeat: new Date().toISOString(),
              errorCount: 6 // > 5
            }
          }
        }

        await handleAgentStatusChanged(event, mockState, mockBroadcast, mockEventLog)

        // Should have broadcast a system alert
        const systemAlerts = broadcasts.filter(b => b.event_type === EventTypes.SYSTEM_ALERT)
        expect(systemAlerts.length).toBeGreaterThan(0)
      })
    })

    describe('AC5: Activity-Text speichern', () => {
      it('should store activity text', async () => {
        const agent = {
          id: 'agent-1',
          status: 'working',
          currentIssueId: 'issue-1',
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)

        const event = {
          event_type: EventTypes.AGENT_STATUS_CHANGED,
          payload: {
            agent_id: 'agent-1',
            from_status: 'working',
            to_status: 'working',
            activity: 'Reviewing pull request #42'
          }
        }

        await handleAgentStatusChanged(event, mockState, mockBroadcast, mockEventLog)

        const updatedAgent = mockState.agents.get('agent-1')
        expect(updatedAgent.currentActivity).toBe('Reviewing pull request #42')
        expect(updatedAgent.activityUpdatedAt).toBeDefined()
      })

      it('should truncate activity to 200 characters', async () => {
        const agent = {
          id: 'agent-1',
          status: 'working',
          currentIssueId: 'issue-1',
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)

        const longActivity = 'A'.repeat(250) // 250 chars

        const event = {
          event_type: EventTypes.AGENT_STATUS_CHANGED,
          payload: {
            agent_id: 'agent-1',
            from_status: 'working',
            to_status: 'working',
            activity: longActivity
          }
        }

        await handleAgentStatusChanged(event, mockState, mockBroadcast, mockEventLog)

        const updatedAgent = mockState.agents.get('agent-1')
        expect(updatedAgent.currentActivity.length).toBeLessThanOrEqual(200)
      })
    })

    describe('AC6: Automatische Status-Sync bei Block', () => {
      it('should sync agent status when issue is blocked', async () => {
        const agent = {
          id: 'agent-1',
          status: 'working',
          currentIssueId: 'issue-1',
          createdAt: new Date().toISOString()
        }
        const issue = {
          id: 'issue-1',
          number: 42,
          state: 'wip',
          projectId: 'project-1',
          assignedAgentId: 'agent-1',
          isBlocked: false,
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.ISSUE_BLOCKED,
          payload: {
            issue_id: 'issue-1',
            block_reason: 'External dependency unavailable',
            block_category: 'dependency',
            blocked_by: 'system'
          }
        }

        await handleIssueBlocked(event, mockState, mockBroadcast, mockEventLog)

        // Agent should automatically receive status change
        const blockedAgent = mockState.agents.get('agent-1')
        expect(blockedAgent.status).toBe('blocked')
        expect(blockedAgent.blockReason).toContain('Issue #42')
      })
    })
  })

  // ==================== Issue #11: agent.assigned / agent.unassigned ====================

  describe('Issue #11: agent.assigned / agent.unassigned', () => {
    describe('AC1: Payload-Validierung', () => {
      it('should reject without agent_id', async () => {
        const event = {
          event_type: EventTypes.AGENT_ASSIGNED,
          payload: {
            issue_id: 'issue-1',
            assignment_reason: 'manual',
            assigned_by: 'user'
          }
        }

        await expect(
          handleAgentAssigned(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/agent_id.*required/i)
      })

      it('should reject without issue_id', async () => {
        const event = {
          event_type: EventTypes.AGENT_ASSIGNED,
          payload: {
            agent_id: 'agent-1',
            assignment_reason: 'manual',
            assigned_by: 'user'
          }
        }

        await expect(
          handleAgentAssigned(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/issue_id.*required/i)
      })

      it('should reject if agent does not exist', async () => {
        const event = {
          event_type: EventTypes.AGENT_ASSIGNED,
          payload: {
            agent_id: 'non-existent',
            issue_id: 'issue-1',
            assignment_reason: 'manual',
            assigned_by: 'user'
          }
        }

        await expect(
          handleAgentAssigned(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/agent not found/i)
      })

      it('should reject if issue does not exist', async () => {
        const agent = {
          id: 'agent-1',
          status: 'idle',
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)

        const event = {
          event_type: EventTypes.AGENT_ASSIGNED,
          payload: {
            agent_id: 'agent-1',
            issue_id: 'non-existent',
            assignment_reason: 'manual',
            assigned_by: 'user'
          }
        }

        await expect(
          handleAgentAssigned(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/issue not found/i)
      })
    })

    describe('AC2: Max 1 Issue pro Agent (Invariant!)', () => {
      it('should reject assignment if agent already has issue', async () => {
        const agent = {
          id: 'agent-1',
          status: 'working',
          currentIssueId: 'issue-1', // already assigned!
          createdAt: new Date().toISOString()
        }
        const issue1 = {
          id: 'issue-1',
          state: 'wip',
          projectId: 'project-1',
          assignedAgentId: 'agent-1',
          createdAt: new Date().toISOString()
        }
        const issue2 = {
          id: 'issue-2',
          state: 'backlog',
          projectId: 'project-1',
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)
        mockState.issues.set('issue-1', issue1)
        mockState.issues.set('issue-2', issue2)

        const event = {
          event_type: EventTypes.AGENT_ASSIGNED,
          payload: {
            agent_id: 'agent-1',
            issue_id: 'issue-2',
            assignment_reason: 'manual',
            assigned_by: 'user'
          }
        }

        await expect(
          handleAgentAssigned(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/agent already has assigned issue.*invariant.*max 1 issue per agent/i)
      })
    })

    describe('AC3: Assigned → Status = working', () => {
      it('should set agent status to working on assignment', async () => {
        const agent = {
          id: 'agent-1',
          status: 'idle',
          currentIssueId: null,
          createdAt: new Date().toISOString()
        }
        const issue = {
          id: 'issue-1',
          state: 'backlog',
          projectId: 'project-1',
          assignedAgentId: null,
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.AGENT_ASSIGNED,
          payload: {
            agent_id: 'agent-1',
            issue_id: 'issue-1',
            assignment_reason: 'manual',
            assigned_by: 'user'
          }
        }

        await handleAgentAssigned(event, mockState, mockBroadcast, mockEventLog)

        const assignedAgent = mockState.agents.get('agent-1')
        expect(assignedAgent.status).toBe('working')
        expect(assignedAgent.currentIssueId).toBe('issue-1')
        expect(assignedAgent.assignedAt).toBeDefined()

        const assignedIssue = mockState.issues.get('issue-1')
        expect(assignedIssue.assignedAgentId).toBe('agent-1')
      })
    })

    describe('AC4: Unassigned → Status = idle (oder working)', () => {
      it('should set agent status to idle on unassignment', async () => {
        const agent = {
          id: 'agent-1',
          status: 'working',
          currentIssueId: 'issue-1',
          createdAt: new Date().toISOString()
        }
        const issue = {
          id: 'issue-1',
          state: 'review',
          projectId: 'project-1',
          assignedAgentId: 'agent-1',
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.AGENT_UNASSIGNED,
          payload: {
            agent_id: 'agent-1',
            issue_id: 'issue-1',
            unassigned_by: 'user',
            next_status: 'idle'
          }
        }

        await handleAgentUnassigned(event, mockState, mockBroadcast, mockEventLog)

        const unassignedAgent = mockState.agents.get('agent-1')
        expect(unassignedAgent.status).toBe('idle')
        expect(unassignedAgent.currentIssueId).toBeNull()

        const unassignedIssue = mockState.issues.get('issue-1')
        expect(unassignedIssue.assignedAgentId).toBeNull()
      })

      it('should validate next_status=working requires another assigned issue', async () => {
        const agent = {
          id: 'agent-1',
          status: 'working',
          currentIssueId: 'issue-1',
          createdAt: new Date().toISOString()
        }
        const issue = {
          id: 'issue-1',
          state: 'review',
          projectId: 'project-1',
          assignedAgentId: 'agent-1',
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.AGENT_UNASSIGNED,
          payload: {
            agent_id: 'agent-1',
            issue_id: 'issue-1',
            unassigned_by: 'system',
            next_status: 'working' // but no other issue assigned!
          }
        }

        await expect(
          handleAgentUnassigned(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/next_status.*working.*requires.*another.*issue/i)
      })
    })

    describe('AC5: Load-Balancing Reason tracken', () => {
      it('should track auto_load_balance assignments', async () => {
        const agent = {
          id: 'agent-1',
          status: 'idle',
          currentIssueId: null,
          autoAssignmentCount: 3,
          createdAt: new Date().toISOString()
        }
        const issue = {
          id: 'issue-1',
          state: 'backlog',
          projectId: 'project-1',
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.AGENT_ASSIGNED,
          payload: {
            agent_id: 'agent-1',
            issue_id: 'issue-1',
            assignment_reason: 'auto_load_balance',
            assigned_by: 'system'
          }
        }

        await handleAgentAssigned(event, mockState, mockBroadcast, mockEventLog)

        const assignedAgent = mockState.agents.get('agent-1')
        expect(assignedAgent.lastAssignmentReason).toBe('auto_load_balance')
        expect(assignedAgent.autoAssignmentCount).toBe(4)
      })
    })

    describe('AC6: Assignment blockiert wenn Agent blocked', () => {
      it('should reject assignment to blocked agent', async () => {
        const agent = {
          id: 'agent-1',
          status: 'blocked',
          blockReason: 'System maintenance',
          currentIssueId: null,
          createdAt: new Date().toISOString()
        }
        const issue = {
          id: 'issue-1',
          state: 'backlog',
          projectId: 'project-1',
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-1', agent)
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.AGENT_ASSIGNED,
          payload: {
            agent_id: 'agent-1',
            issue_id: 'issue-1',
            assignment_reason: 'manual',
            assigned_by: 'user'
          }
        }

        await expect(
          handleAgentAssigned(event, mockState, mockBroadcast, mockEventLog)
        ).rejects.toThrow(/cannot assign issue to blocked agent/i)
      })
    })

    describe('AC7: Failover-Assignment', () => {
      it('should track failover assignments', async () => {
        const agent = {
          id: 'agent-2',
          status: 'idle',
          currentIssueId: null,
          createdAt: new Date().toISOString()
        }
        const issue = {
          id: 'issue-1',
          state: 'wip',
          projectId: 'project-1',
          assignedAgentId: 'agent-1', // was assigned to agent-1
          failoverCount: 0,
          createdAt: new Date().toISOString()
        }
        mockState.agents.set('agent-2', agent)
        mockState.issues.set('issue-1', issue)

        const event = {
          event_type: EventTypes.AGENT_ASSIGNED,
          payload: {
            agent_id: 'agent-2',
            issue_id: 'issue-1',
            assignment_reason: 'failover',
            assigned_by: 'system'
          }
        }

        await handleAgentAssigned(event, mockState, mockBroadcast, mockEventLog)

        const reassignedIssue = mockState.issues.get('issue-1')
        expect(reassignedIssue.previousAgentId).toBe('agent-1')
        expect(reassignedIssue.failoverCount).toBe(1)
        expect(reassignedIssue.assignedAgentId).toBe('agent-2')

        // Should trigger system alert
        const systemAlerts = broadcasts.filter(b => b.event_type === EventTypes.SYSTEM_ALERT)
        expect(systemAlerts.length).toBeGreaterThan(0)
        expect(systemAlerts[0].payload.message).toMatch(/failover assignment detected/i)
      })
    })
  })
})
