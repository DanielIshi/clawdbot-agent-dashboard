/**
 * Issue #57 - AC4: Speech Bubble Manager
 *
 * Manages speech bubble visibility based on agent status
 * Integrates auto-hide logic (AC4)
 */

import React from 'react'
import type { AgentSprite, SpeechBubble } from './types'
import { SpeechBubbleComponent } from './SpeechBubble'
import { shouldShowBubble } from './speechBubbleLogic'
import { toIsometric } from './projection'

interface SpeechBubbleManagerProps {
  agents: AgentSprite[]
  bubbles: Map<string, string> // agentId → current text
}

/**
 * Manages rendering of all speech bubbles with auto-hide logic
 */
export const SpeechBubbleManager: React.FC<SpeechBubbleManagerProps> = ({
  agents,
  bubbles
}) => {
  // Convert agent sprites to speech bubbles
  const activeBubbles: SpeechBubble[] = agents
    .map(agent => {
      const text = bubbles.get(agent.id) || ''
      const visible = shouldShowBubble(agent.status, text)

      // Position bubble above agent sprite
      const agentIso = toIsometric(agent.position.x, agent.position.y)
      const bubblePosition = {
        isoX: agentIso.isoX,
        isoY: agentIso.isoY - 60 // Offset above sprite
      }

      return {
        agentId: agent.id,
        text,
        position: bubblePosition,
        visible,
        opacity: 1.0
      }
    })
    .filter(bubble => bubble.visible || bubble.text.length > 0) // Keep bubbles during fade-out

  return (
    <>
      {activeBubbles.map(bubble => (
        <SpeechBubbleComponent key={bubble.agentId} bubble={bubble} />
      ))}
    </>
  )
}
