/**
 * Agent Sorting & Depth Management
 * Issue #55, AC7: Z-Index/Depth-Sorting
 */

import type { AgentSprite } from './types'

/**
 * Sortiert Agents nach Y-Koordinate (niedrig → hoch)
 * für korrektes Depth-Sorting (weiter hinten = zuerst zeichnen)
 *
 * AC7 Spec:
 * - Agent mit höherer Y-Koordinate wird VOR Agent mit niedriger Y gezeichnet
 * - Korrektes Overlap (weiter hinten = weiter unten im Bild)
 *
 * @param agents - Array von AgentSprites
 * @returns Sortiertes Array (niedrigstes Y zuerst)
 */
export function sortAgentsByDepth(agents: AgentSprite[]): AgentSprite[] {
  return [...agents].sort((a, b) => a.position.y - b.position.y)
}
