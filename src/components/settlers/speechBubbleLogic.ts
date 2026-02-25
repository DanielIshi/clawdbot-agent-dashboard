/**
 * Issue #57 - AC4: Speech Bubble Auto-Hide Logic
 *
 * Determines when a speech bubble should be visible based on agent status
 *
 * Rules:
 * - Idle agents → hide bubble (after 500ms fade)
 * - Working agents → show bubble
 * - Blocked agents → show bubble
 *
 * @param status - Current agent status
 * @param text - Current bubble text
 * @returns true if bubble should be visible
 */

import type { AgentStatus } from './types'

export function shouldShowBubble(status: AgentStatus, text: string): boolean {
  // Always hide if agent is idle (AC4)
  if (status === 'idle') {
    return false
  }

  // Show bubble for working and blocked agents
  return true
}
