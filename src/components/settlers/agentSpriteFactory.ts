/**
 * Agent-Sprite Factory (API-Integration)
 * Issue #55, AC8: Agent-Sprite von API-Daten abgeleitet
 */

import type { AgentSprite, AgentType, AgentStatus, AnimationType } from './types'
import { getAgentColor } from './agentColors'

/**
 * API Agent-Daten Interface
 */
export interface ApiAgent {
  id: string
  name: string
  type: AgentType
  status: AgentStatus
  currentIssueId?: string
}

/**
 * Erstellt AgentSprite aus API-Daten
 *
 * AC8 Mapping:
 * - Sprite-ID = Agent-ID
 * - Sprite-Name = Agent-Name
 * - Sprite-Type = Agent-Type
 * - Sprite-Color = Typ-basierte Farbe (aus agentColors)
 * - Sprite-Animation = Status-basierte Animation
 * - Position: Default (0,0) oder aus currentIssueId abgeleitet (TODO: Issue #4)
 *
 * @param apiAgent - Agent-Daten von API
 * @returns AgentSprite
 */
export function createAgentSpriteFromApi(apiAgent: ApiAgent): AgentSprite {
  // Map Status → Animation Type
  const animationType: AnimationType = mapStatusToAnimation(apiAgent.status)

  // Map Type → Color
  const color = getAgentColor(apiAgent.type)

  // Default Position (später aus currentIssueId ableiten)
  const position = {
    x: Math.floor(Math.random() * 10),  // Random 0-9
    y: Math.floor(Math.random() * 10)
  }

  return {
    id: apiAgent.id,
    name: apiAgent.name,
    type: apiAgent.type,
    position,
    status: apiAgent.status,
    color,
    animation: {
      type: animationType,
      frame: 0,
      progress: 0,
      startTime: Date.now()
    }
  }
}

/**
 * Mappt Agent-Status zu Animation-Typ
 */
function mapStatusToAnimation(status: AgentStatus): AnimationType {
  switch (status) {
    case 'idle':
      return 'idle'
    case 'working':
      return 'working'
    case 'blocked':
      return 'idle'  // Blocked = idle Animation
    default:
      return 'idle'
  }
}
