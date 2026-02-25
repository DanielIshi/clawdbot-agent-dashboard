/**
 * Tests für Agent Color Mappings
 * Issue #55, AC2: Farb-Kodierung nach Agent-Typ
 */

import { describe, it, expect } from 'vitest'
import { getAgentColor, getAgentShadowColor, getAgentHighlightColor, AGENT_COLORS } from '../../src/components/settlers/agentColors'

describe('Agent Color Mappings', () => {
  describe('getAgentColor()', () => {
    it('sollte korrekte Farbe für Codex zurückgeben (blau)', () => {
      expect(getAgentColor('codex')).toBe('#4b8bff')
    })

    it('sollte korrekte Farbe für Claude zurückgeben (grün)', () => {
      expect(getAgentColor('claude')).toBe('#36c37c')
    })

    it('sollte korrekte Farbe für GPT zurückgeben (rot)', () => {
      expect(getAgentColor('gpt')).toBe('#ff6b6b')
    })

    it('sollte korrekte Farbe für Ollama zurückgeben (gelb)', () => {
      expect(getAgentColor('ollama')).toBe('#f4d03f')
    })
  })

  describe('AGENT_COLORS Mapping', () => {
    it('sollte alle 4 Agent-Typen haben', () => {
      const types = Object.keys(AGENT_COLORS)
      expect(types).toHaveLength(4)
      expect(types).toContain('codex')
      expect(types).toContain('claude')
      expect(types).toContain('gpt')
      expect(types).toContain('ollama')
    })

    it('sollte nur gültige Hex-Farben enthalten', () => {
      Object.values(AGENT_COLORS).forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })

    it('sollte alle Farben unterschiedlich sein', () => {
      const colors = Object.values(AGENT_COLORS)
      const uniqueColors = new Set(colors)
      expect(uniqueColors.size).toBe(colors.length)
    })
  })

  describe('getAgentShadowColor()', () => {
    it('sollte dunklere Farbe als Original erzeugen', () => {
      const original = getAgentColor('claude')
      const shadow = getAgentShadowColor('claude')

      // Beide sollten gültige Hex-Farben sein
      expect(shadow).toMatch(/^#[0-9a-f]{6}$/i)

      // Shadow sollte dunkler sein (kleinere RGB-Werte)
      const origR = parseInt(original.slice(1, 3), 16)
      const shadowR = parseInt(shadow.slice(1, 3), 16)
      expect(shadowR).toBeLessThan(origR)
    })

    it('sollte mit custom darkness-Faktor funktionieren', () => {
      const light = getAgentShadowColor('codex', 0.1)  // 10% dunkler
      const dark = getAgentShadowColor('codex', 0.5)   // 50% dunkler

      const lightR = parseInt(light.slice(1, 3), 16)
      const darkR = parseInt(dark.slice(1, 3), 16)

      expect(darkR).toBeLessThan(lightR)
    })
  })

  describe('getAgentHighlightColor()', () => {
    it('sollte hellere Farbe als Original erzeugen', () => {
      const original = getAgentColor('gpt')
      const highlight = getAgentHighlightColor('gpt')

      // Beide sollten gültige Hex-Farben sein
      expect(highlight).toMatch(/^#[0-9a-f]{6}$/i)

      // Highlight sollte heller sein (größere RGB-Werte)
      const origR = parseInt(original.slice(1, 3), 16)
      const highlightR = parseInt(highlight.slice(1, 3), 16)
      expect(highlightR).toBeGreaterThan(origR)
    })

    it('sollte RGB-Werte nicht über 255 gehen', () => {
      const highlight = getAgentHighlightColor('ollama', 0.9) // Sehr hell

      const r = parseInt(highlight.slice(1, 3), 16)
      const g = parseInt(highlight.slice(3, 5), 16)
      const b = parseInt(highlight.slice(5, 7), 16)

      expect(r).toBeLessThanOrEqual(255)
      expect(g).toBeLessThanOrEqual(255)
      expect(b).toBeLessThanOrEqual(255)
    })

    it('sollte mit custom brightness-Faktor funktionieren', () => {
      const lessB right = getAgentHighlightColor('claude', 0.1)  // 10% heller
      const moreBright = getAgentHighlightColor('claude', 0.5)   // 50% heller

      const lessR = parseInt(lessBright.slice(1, 3), 16)
      const moreR = parseInt(moreBright.slice(1, 3), 16)

      expect(moreR).toBeGreaterThanOrEqual(lessR)
    })
  })
})
