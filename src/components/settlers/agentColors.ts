/**
 * Agent Color Mappings
 * Issue #55, AC2: Farb-Kodierung nach Agent-Typ
 *
 * - Codex: #4b8bff (blau, aus Konzept)
 * - Claude: #36c37c (grün, aus Konzept)
 * - GPT: #ff6b6b (rot)
 * - Ollama: #f4d03f (gelb)
 */

import type { AgentType } from './types'

export const AGENT_COLORS: Record<AgentType, string> = {
  codex: '#4b8bff',   // Blau (aus Konzept)
  claude: '#36c37c',  // Grün (aus Konzept)
  gpt: '#ff6b6b',     // Rot
  ollama: '#f4d03f'   // Gelb
}

/**
 * Gibt die Farbe für einen Agent-Typ zurück
 *
 * @param type - Agent-Typ (codex, claude, gpt, ollama)
 * @returns Hex-Farbe (z.B. "#4b8bff")
 *
 * @example
 * getAgentColor('claude') // => '#36c37c'
 */
export function getAgentColor(type: AgentType): string {
  return AGENT_COLORS[type]
}

/**
 * Erzeugt eine dunklere Variante der Agent-Farbe für Schatten
 *
 * @param type - Agent-Typ
 * @param darkness - Faktor (0-1), default 0.3
 * @returns Dunklere Hex-Farbe
 */
export function getAgentShadowColor(type: AgentType, darkness: number = 0.3): string {
  const color = AGENT_COLORS[type]

  // Hex zu RGB
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  // Dunkler machen
  const darkerR = Math.floor(r * (1 - darkness))
  const darkerG = Math.floor(g * (1 - darkness))
  const darkerB = Math.floor(b * (1 - darkness))

  // Zurück zu Hex
  return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`
}

/**
 * Erzeugt eine hellere Variante der Agent-Farbe für Highlights
 *
 * @param type - Agent-Typ
 * @param brightness - Faktor (0-1), default 0.3
 * @returns Hellere Hex-Farbe
 */
export function getAgentHighlightColor(type: AgentType, brightness: number = 0.3): string {
  const color = AGENT_COLORS[type]

  // Hex zu RGB
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  // Heller machen
  const brighterR = Math.min(255, Math.floor(r + (255 - r) * brightness))
  const brighterG = Math.min(255, Math.floor(g + (255 - g) * brightness))
  const brighterB = Math.min(255, Math.floor(b + (255 - b) * brightness))

  // Zurück zu Hex
  return `#${brighterR.toString(16).padStart(2, '0')}${brighterG.toString(16).padStart(2, '0')}${brighterB.toString(16).padStart(2, '0')}`
}
