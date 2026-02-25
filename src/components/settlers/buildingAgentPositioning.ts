/**
 * Agent-zu-Building-Zuordnung
 * Issue #56, AC8: Agent-Positionierung an Gebäuden
 *
 * Weist Agents zu Buildings zu und berechnet Positionen (max 4 Agents pro Building)
 */

import type { Building, AgentSprite, GridCoordinates } from './types'

/**
 * Maximale Anzahl Agents pro Building
 */
export function getMaxAgentsPerBuilding(): number {
  return 4
}

/**
 * Berechnet Offset für Agent an einem Building
 *
 * Positioniert Agents an den 4 Seiten des Buildings:
 * - Index 0: Nord (oben)
 * - Index 1: Süd (unten)
 * - Index 2: Ost (rechts)
 * - Index 3: West (links)
 *
 * @param agentIndex - Index des Agents (0-3)
 * @param building - Building-Objekt
 * @returns Grid-Offset {x, y}
 */
export function getAgentOffsetForBuilding(
  agentIndex: number,
  building: Building
): GridCoordinates {
  const MAX_AGENTS = getMaxAgentsPerBuilding()

  // Overflow: Wiederhole Positionen (Modulo)
  const index = agentIndex % MAX_AGENTS

  // 4 Seiten des Buildings (N, S, E, W)
  const offsets: GridCoordinates[] = [
    { x: 0, y: -1 },  // Nord (oben)
    { x: 0, y: 1 },   // Süd (unten)
    { x: 1, y: 0 },   // Ost (rechts)
    { x: -1, y: 0 }   // West (links)
  ]

  return offsets[index]
}

/**
 * Weist Agents zu einem Building zu und berechnet finale Positionen
 *
 * @param agents - Array von AgentSprites
 * @param building - Building-Objekt
 * @returns Array von Agents mit aktualisierten Positionen (max 4)
 */
export function assignAgentsToBuilding(
  agents: AgentSprite[],
  building: Building
): AgentSprite[] {
  const MAX_AGENTS = getMaxAgentsPerBuilding()

  // Limitiere auf maximal 4 Agents
  const limitedAgents = agents.slice(0, MAX_AGENTS)

  // Berechne finale Positionen
  return limitedAgents.map((agent, index) => {
    const offset = getAgentOffsetForBuilding(index, building)

    return {
      ...agent,
      position: {
        x: building.position.x + offset.x,
        y: building.position.y + offset.y
      }
    }
  })
}
