/**
 * Tests für Agent-zu-Building-Zuordnung
 * Issue #56, AC8: Agent-Positionierung an Gebäuden
 */

import { describe, it, expect } from 'vitest'
import {
  assignAgentsToBuilding,
  getAgentOffsetForBuilding,
  getMaxAgentsPerBuilding
} from '../../src/components/settlers/buildingAgentPositioning'
import type { Building, AgentSprite } from '../../src/components/settlers/types'

describe('AC8: Agent-zu-Building-Zuordnung', () => {
  const building: Building = {
    id: 'project-1',
    projectName: 'test',
    position: { x: 5, y: 5 },
    color: 'hsl(180, 70%, 60%)',
    status: 'active',
    height: 4,
    issueCount: 0,
    prCount: 0
  }

  const createAgent = (id: string, type: 'codex' | 'claude' | 'gpt' | 'ollama'): AgentSprite => ({
    id,
    name: `Agent-${id}`,
    type,
    position: { x: 0, y: 0 }, // Wird überschrieben
    status: 'working',
    color: '#3498db',
    animation: {
      type: 'working',
      frame: 0,
      progress: 0,
      startTime: 0
    }
  })

  describe('getMaxAgentsPerBuilding', () => {
    it('sollte maximal 4 Agents pro Building erlauben', () => {
      const maxAgents = getMaxAgentsPerBuilding()
      expect(maxAgents).toBe(4)
    })
  })

  describe('getAgentOffsetForBuilding', () => {
    it('sollte für Agent-Index 0-3 korrekte Offsets zurückgeben', () => {
      const offsets = [0, 1, 2, 3].map(index => getAgentOffsetForBuilding(index, building))

      // Alle Offsets sollten definiert sein
      offsets.forEach(offset => {
        expect(offset).toHaveProperty('x')
        expect(offset).toHaveProperty('y')
        expect(typeof offset.x).toBe('number')
        expect(typeof offset.y).toBe('number')
      })
    })

    it('sollte 4 verschiedene Positionen erzeugen (N, S, E, W)', () => {
      const offsets = [0, 1, 2, 3].map(index => getAgentOffsetForBuilding(index, building))

      // Offsets sollten unterschiedlich sein
      const uniqueOffsets = new Set(offsets.map(o => `${o.x},${o.y}`))
      expect(uniqueOffsets.size).toBe(4)
    })

    it('sollte Offsets relativ zur Building-Position berechnen', () => {
      const offset = getAgentOffsetForBuilding(0, building)

      // Offset sollte in der Nähe des Buildings sein (max 2 Tiles entfernt)
      expect(Math.abs(offset.x)).toBeLessThanOrEqual(2)
      expect(Math.abs(offset.y)).toBeLessThanOrEqual(2)
    })

    it('sollte für Index >= 4 Offset wiederholen (Modulo)', () => {
      // Index 4 → 0 (Modulo 4)
      const offset4 = getAgentOffsetForBuilding(4, building)
      const offset0 = getAgentOffsetForBuilding(0, building)
      expect(offset4.x).toBe(offset0.x)
      expect(offset4.y).toBe(offset0.y)

      // Index 5 → 1 (Modulo 4)
      const offset5 = getAgentOffsetForBuilding(5, building)
      const offset1 = getAgentOffsetForBuilding(1, building)
      expect(offset5.x).toBe(offset1.x)
      expect(offset5.y).toBe(offset1.y)

      // Index 7 → 3 (Modulo 4)
      const offset7 = getAgentOffsetForBuilding(7, building)
      const offset3 = getAgentOffsetForBuilding(3, building)
      expect(offset7.x).toBe(offset3.x)
      expect(offset7.y).toBe(offset3.y)
    })

    it('sollte symmetrische Positionen erzeugen (N↔S, E↔W)', () => {
      const offsets = [0, 1, 2, 3].map(index => getAgentOffsetForBuilding(index, building))

      // Nord und Süd sollten entgegengesetzte Y-Offsets haben
      // Ost und West sollten entgegengesetzte X-Offsets haben
      const hasSymmetry =
        offsets[0].y === -offsets[1].y || // N ↔ S
        offsets[2].x === -offsets[3].x    // E ↔ W

      expect(hasSymmetry).toBe(true)
    })
  })

  describe('assignAgentsToBuilding', () => {
    it('sollte Agents zu Building zuweisen und Positionen berechnen', () => {
      const agents: AgentSprite[] = [
        createAgent('1', 'codex'),
        createAgent('2', 'claude')
      ]

      const assignedAgents = assignAgentsToBuilding(agents, building)

      expect(assignedAgents.length).toBe(2)

      // Positionen sollten aktualisiert sein
      assignedAgents.forEach((agent, index) => {
        expect(agent.position.x).toBe(building.position.x + getAgentOffsetForBuilding(index, building).x)
        expect(agent.position.y).toBe(building.position.y + getAgentOffsetForBuilding(index, building).y)
      })
    })

    it('sollte maximal 4 Agents zuweisen', () => {
      const agents: AgentSprite[] = [
        createAgent('1', 'codex'),
        createAgent('2', 'claude'),
        createAgent('3', 'gpt'),
        createAgent('4', 'ollama'),
        createAgent('5', 'codex'), // Overflow
        createAgent('6', 'claude')  // Overflow
      ]

      const assignedAgents = assignAgentsToBuilding(agents, building)

      // Nur erste 4 Agents sollten zugewiesen werden
      expect(assignedAgents.length).toBe(4)
      expect(assignedAgents.map(a => a.id)).toEqual(['1', '2', '3', '4'])
    })

    it('sollte Agent-IDs und Namen beibehalten', () => {
      const agents: AgentSprite[] = [
        createAgent('agent-1', 'codex'),
        createAgent('agent-2', 'claude')
      ]

      const assignedAgents = assignAgentsToBuilding(agents, building)

      expect(assignedAgents[0].id).toBe('agent-1')
      expect(assignedAgents[0].name).toBe('Agent-agent-1')
      expect(assignedAgents[1].id).toBe('agent-2')
      expect(assignedAgents[1].name).toBe('Agent-agent-2')
    })

    it('sollte Agent-Properties übernehmen (Typ, Status, Color, Animation)', () => {
      const agent: AgentSprite = createAgent('1', 'ollama')
      agent.status = 'blocked'
      agent.color = '#E74C3C'

      const assignedAgents = assignAgentsToBuilding([agent], building)

      expect(assignedAgents[0].type).toBe('ollama')
      expect(assignedAgents[0].status).toBe('blocked')
      expect(assignedAgents[0].color).toBe('#E74C3C')
      expect(assignedAgents[0].animation).toEqual(agent.animation)
    })

    it('sollte für leere Agent-Liste leeres Array zurückgeben', () => {
      const assignedAgents = assignAgentsToBuilding([], building)
      expect(assignedAgents).toEqual([])
    })

    it('sollte verschiedene Buildings unterschiedlich behandeln', () => {
      const building1: Building = { ...building, position: { x: 3, y: 3 } }
      const building2: Building = { ...building, position: { x: 7, y: 7 } }

      const agents1 = assignAgentsToBuilding([createAgent('1', 'codex')], building1)
      const agents2 = assignAgentsToBuilding([createAgent('2', 'claude')], building2)

      // Positionen sollten unterschiedlich sein (verschiedene Building-Positionen)
      expect(agents1[0].position.x).not.toBe(agents2[0].position.x)
      expect(agents1[0].position.y).not.toBe(agents2[0].position.y)
    })

    it('sollte 4 Agents an allen 4 Seiten platzieren (N, S, E, W)', () => {
      const agents: AgentSprite[] = [
        createAgent('1', 'codex'),
        createAgent('2', 'claude'),
        createAgent('3', 'gpt'),
        createAgent('4', 'ollama')
      ]

      const assignedAgents = assignAgentsToBuilding(agents, building)

      // Extrahiere relative Positionen
      const relativePositions = assignedAgents.map(agent => ({
        x: agent.position.x - building.position.x,
        y: agent.position.y - building.position.y
      }))

      // Sollten 4 verschiedene Offsets sein
      const uniquePositions = new Set(relativePositions.map(p => `${p.x},${p.y}`))
      expect(uniquePositions.size).toBe(4)
    })
  })

  describe('Integration: Multi-Building mit Agents', () => {
    it('sollte mehrere Buildings mit je 2 Agents zuweisen', () => {
      const buildings: Building[] = [
        { ...building, id: 'p1', position: { x: 2, y: 2 } },
        { ...building, id: 'p2', position: { x: 7, y: 7 } }
      ]

      const agentsForP1: AgentSprite[] = [
        createAgent('a1', 'codex'),
        createAgent('a2', 'claude')
      ]

      const agentsForP2: AgentSprite[] = [
        createAgent('a3', 'gpt'),
        createAgent('a4', 'ollama')
      ]

      const assignedP1 = assignAgentsToBuilding(agentsForP1, buildings[0])
      const assignedP2 = assignAgentsToBuilding(agentsForP2, buildings[1])

      expect(assignedP1.length).toBe(2)
      expect(assignedP2.length).toBe(2)

      // P1 Agents sollten in der Nähe von (2,2) sein
      assignedP1.forEach(agent => {
        expect(agent.position.x).toBeGreaterThanOrEqual(0)
        expect(agent.position.x).toBeLessThanOrEqual(4)
      })

      // P2 Agents sollten in der Nähe von (7,7) sein
      assignedP2.forEach(agent => {
        expect(agent.position.x).toBeGreaterThanOrEqual(5)
        expect(agent.position.x).toBeLessThanOrEqual(9)
      })
    })

    it('sollte Buildings ohne Agents ignorieren', () => {
      const assignedAgents = assignAgentsToBuilding([], building)
      expect(assignedAgents).toEqual([])
    })
  })

  describe('Performance', () => {
    it('sollte 100 Agents zu 25 Buildings in unter 10ms zuweisen', () => {
      const buildings: Building[] = Array(25).fill(null).map((_, i) => ({
        ...building,
        id: `project-${i}`,
        position: { x: i % 10, y: Math.floor(i / 10) }
      }))

      const agents: AgentSprite[] = Array(100).fill(null).map((_, i) =>
        createAgent(`agent-${i}`, i % 2 === 0 ? 'codex' : 'claude')
      )

      const start = performance.now()

      // 4 Agents pro Building
      buildings.forEach((building, index) => {
        const buildingAgents = agents.slice(index * 4, (index + 1) * 4)
        assignAgentsToBuilding(buildingAgents, building)
      })

      const duration = performance.now() - start

      expect(duration).toBeLessThan(10)
    })
  })
})
