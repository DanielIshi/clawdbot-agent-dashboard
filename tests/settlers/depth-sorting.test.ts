/**
 * Tests für Z-Index/Depth-Sorting
 * Issue #55, AC7: Korrekte Render-Reihenfolge nach Y-Koordinate
 */

import { describe, it, expect } from 'vitest'
import type { AgentSprite } from '../../src/components/settlers/types'
import { sortAgentsByDepth } from '../../src/components/settlers/agentSorting'

describe('AC7: Z-Index/Depth-Sorting', () => {
  it('sollte Agents nach Y-Koordinate sortieren (niedrig → hoch)', () => {
    const agents: AgentSprite[] = [
      {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'codex',
        position: { x: 5, y: 8 },  // Vorne (höchstes Y)
        status: 'idle',
        color: '#4b8bff',
        animation: { type: 'idle', frame: 0, progress: 0, startTime: Date.now() }
      },
      {
        id: 'agent-2',
        name: 'Agent 2',
        type: 'claude',
        position: { x: 5, y: 2 },  // Hinten (niedrigstes Y)
        status: 'idle',
        color: '#36c37c',
        animation: { type: 'idle', frame: 0, progress: 0, startTime: Date.now() }
      },
      {
        id: 'agent-3',
        name: 'Agent 3',
        type: 'gpt',
        position: { x: 5, y: 5 },  // Mitte
        status: 'idle',
        color: '#ff6b6b',
        animation: { type: 'idle', frame: 0, progress: 0, startTime: Date.now() }
      }
    ]

    const sorted = sortAgentsByDepth(agents)

    // Erwartet: y=2, y=5, y=8 (niedrig → hoch)
    expect(sorted[0].position.y).toBe(2)
    expect(sorted[1].position.y).toBe(5)
    expect(sorted[2].position.y).toBe(8)
  })

  it('sollte Agent mit höherer Y-Koordinate NACH Agent mit niedriger Y zeichnen', () => {
    const agents: AgentSprite[] = [
      {
        id: 'front',
        name: 'Front Agent',
        type: 'codex',
        position: { x: 0, y: 10 },  // Vorne
        status: 'idle',
        color: '#4b8bff',
        animation: { type: 'idle', frame: 0, progress: 0, startTime: Date.now() }
      },
      {
        id: 'back',
        name: 'Back Agent',
        type: 'claude',
        position: { x: 0, y: 1 },  // Hinten
        status: 'idle',
        color: '#36c37c',
        animation: { type: 'idle', frame: 0, progress: 0, startTime: Date.now() }
      }
    ]

    const sorted = sortAgentsByDepth(agents)

    // Agent "hinten" (y=1) sollte ZUERST im Array sein (wird zuerst gezeichnet)
    expect(sorted[0].id).toBe('back')
    expect(sorted[1].id).toBe('front')
  })

  it('sollte bei gleicher Y-Koordinate Reihenfolge beibehalten', () => {
    const agents: AgentSprite[] = [
      {
        id: 'agent-a',
        name: 'A',
        type: 'codex',
        position: { x: 3, y: 5 },
        status: 'idle',
        color: '#4b8bff',
        animation: { type: 'idle', frame: 0, progress: 0, startTime: Date.now() }
      },
      {
        id: 'agent-b',
        name: 'B',
        type: 'claude',
        position: { x: 7, y: 5 },  // Gleiche Y-Koordinate
        status: 'idle',
        color: '#36c37c',
        animation: { type: 'idle', frame: 0, progress: 0, startTime: Date.now() }
      }
    ]

    const sorted = sortAgentsByDepth(agents)

    // Bei gleicher Y-Koordinate: Original-Reihenfolge erhalten
    expect(sorted[0].id).toBe('agent-a')
    expect(sorted[1].id).toBe('agent-b')
    expect(sorted[0].position.y).toBe(sorted[1].position.y)
  })

  it('sollte mit vielen Agents funktionieren', () => {
    const agents: AgentSprite[] = Array.from({ length: 10 }, (_, i) => ({
      id: `agent-${i}`,
      name: `Agent ${i}`,
      type: 'codex' as const,
      position: { x: i, y: Math.floor(Math.random() * 10) },
      status: 'idle' as const,
      color: '#4b8bff',
      animation: { type: 'idle' as const, frame: 0, progress: 0, startTime: Date.now() }
    }))

    const sorted = sortAgentsByDepth(agents)

    // Prüfe, dass sortiert ist (jedes Element <= nächstes Element)
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].position.y).toBeLessThanOrEqual(sorted[i + 1].position.y)
    }
  })

  it('sollte AC7-Testfall erfüllen: 3 Agents (y=2, y=5, y=8)', () => {
    const agents: AgentSprite[] = [
      {
        id: 'agent-back',
        name: 'Back',
        type: 'codex',
        position: { x: 5, y: 2 },  // Hinten
        status: 'idle',
        color: '#4b8bff',
        animation: { type: 'idle', frame: 0, progress: 0, startTime: Date.now() }
      },
      {
        id: 'agent-middle',
        name: 'Middle',
        type: 'claude',
        position: { x: 5, y: 5 },  // Mitte
        status: 'idle',
        color: '#36c37c',
        animation: { type: 'idle', frame: 0, progress: 0, startTime: Date.now() }
      },
      {
        id: 'agent-front',
        name: 'Front',
        type: 'gpt',
        position: { x: 5, y: 8 },  // Vorne
        status: 'idle',
        color: '#ff6b6b',
        animation: { type: 'idle', frame: 0, progress: 0, startTime: Date.now() }
      }
    ]

    const sorted = sortAgentsByDepth(agents)

    // Render-Reihenfolge: hinten → mitte → vorne
    expect(sorted[0].id).toBe('agent-back')
    expect(sorted[0].position.y).toBe(2)

    expect(sorted[1].id).toBe('agent-middle')
    expect(sorted[1].position.y).toBe(5)

    expect(sorted[2].id).toBe('agent-front')
    expect(sorted[2].position.y).toBe(8)
  })
})
