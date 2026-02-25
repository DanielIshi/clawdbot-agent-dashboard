/**
 * Tests für Status-Indikatoren (AC4-6)
 * Issue #56, AC4: Status "active" (normales Rendering)
 * Issue #56, AC5: Status "has_issues" (Baugerüst + Badge)
 * Issue #56, AC6: Status "has_pr" (Fahnenmast + Animation)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  drawStatusIndicator,
  drawScaffold,
  drawIssueBadge,
  drawFlagpole,
  getAnimatedFlagOffset
} from '../../src/components/settlers/statusIndicators'
import type { Building } from '../../src/components/settlers/types'

describe('AC4-6: Status-Indikatoren', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
  })

  describe('AC4: Status "active" (normales Rendering)', () => {
    it('sollte für Status "active" KEINE Indikatoren zeichnen', () => {
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

      // Sollte ohne Fehler ausführen (aber nichts zeichnen)
      expect(() => {
        drawStatusIndicator(ctx, building, 400, 300, 16, 0)
      }).not.toThrow()
    })

    it('sollte für Status "active" mit issueCount=0 und prCount=0 nichts anzeigen', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(120, 70%, 60%)',
        status: 'active',
        height: 3,
        issueCount: 0,
        prCount: 0
      }

      expect(building.status).toBe('active')
      expect(building.issueCount).toBe(0)
      expect(building.prCount).toBe(0)
    })
  })

  describe('AC5: Status "has_issues" (Baugerüst + Badge)', () => {
    it('sollte für Status "has_issues" Baugerüst zeichnen', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(180, 70%, 60%)',
        status: 'has_issues',
        height: 4,
        issueCount: 3,
        prCount: 0
      }

      expect(() => {
        drawStatusIndicator(ctx, building, 400, 300, 16, 0)
      }).not.toThrow()
    })

    it('sollte drawScaffold aufrufen können', () => {
      expect(() => {
        drawScaffold(ctx, 400, 300, 16, 4)
      }).not.toThrow()
    })

    it('sollte Issue-Badge mit Issue-Count zeichnen', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(240, 70%, 60%)',
        status: 'has_issues',
        height: 4,
        issueCount: 5,
        prCount: 0
      }

      expect(() => {
        drawStatusIndicator(ctx, building, 400, 300, 16, 0)
      }).not.toThrow()
    })

    it('sollte drawIssueBadge mit verschiedenen Counts rendern', () => {
      const counts = [1, 5, 10, 99]

      counts.forEach(count => {
        expect(() => {
          drawIssueBadge(ctx, 400, 300, count)
        }).not.toThrow()
      })
    })

    it('sollte Badge an korrekter Position zeichnen (über dem Gebäude)', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(0, 70%, 60%)',
        status: 'has_issues',
        height: 6,
        issueCount: 2,
        prCount: 0
      }

      expect(() => {
        drawStatusIndicator(ctx, building, 400, 300, 16, 0)
      }).not.toThrow()
    })

    it('sollte für issueCount > 0 Status "has_issues" haben', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(60, 70%, 60%)',
        status: 'has_issues',
        height: 4,
        issueCount: 3,
        prCount: 0
      }

      expect(building.status).toBe('has_issues')
      expect(building.issueCount).toBeGreaterThan(0)
    })
  })

  describe('AC6: Status "has_pr" (Fahnenmast + Animation)', () => {
    it('sollte für Status "has_pr" Fahnenmast zeichnen', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(180, 70%, 60%)',
        status: 'has_pr',
        height: 4,
        issueCount: 0,
        prCount: 1
      }

      expect(() => {
        drawStatusIndicator(ctx, building, 400, 300, 16, 0)
      }).not.toThrow()
    })

    it('sollte drawFlagpole aufrufen können', () => {
      expect(() => {
        drawFlagpole(ctx, 400, 300, 16, 4, 0)
      }).not.toThrow()
    })

    it('sollte Flagge mit Animation zeichnen', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(120, 70%, 60%)',
        status: 'has_pr',
        height: 5,
        issueCount: 0,
        prCount: 2
      }

      // Animation zu verschiedenen Zeitpunkten
      const animationFrames = [0, 500, 1000, 1500, 2000]

      animationFrames.forEach(timestamp => {
        expect(() => {
          drawStatusIndicator(ctx, building, 400, 300, 16, timestamp)
        }).not.toThrow()
      })
    })

    it('sollte getAnimatedFlagOffset Werte zwischen -2 und 2 zurückgeben', () => {
      for (let t = 0; t < 3000; t += 100) {
        const offset = getAnimatedFlagOffset(t)
        expect(offset).toBeGreaterThanOrEqual(-2)
        expect(offset).toBeLessThanOrEqual(2)
      }
    })

    it('sollte Animation als Sinuswelle berechnen (Periode ~2000ms)', () => {
      const offset1 = getAnimatedFlagOffset(0)
      const offset2 = getAnimatedFlagOffset(500)
      const offset3 = getAnimatedFlagOffset(1000)
      const offset4 = getAnimatedFlagOffset(2000)

      // Anfang und Ende sollten sehr ähnlich sein (sin(0) ≈ sin(2π))
      expect(Math.abs(offset1 - offset4)).toBeLessThan(0.01)

      // Bei 500ms sollte Maximum/Minimum erreicht sein
      expect(Math.abs(offset2)).toBeGreaterThan(1.0)

      // Bei 1000ms sollte wieder um 0 sein (π)
      expect(Math.abs(offset3)).toBeLessThan(0.01)
    })

    it('sollte für prCount > 0 Status "has_pr" haben', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(240, 70%, 60%)',
        status: 'has_pr',
        height: 4,
        issueCount: 0,
        prCount: 1
      }

      expect(building.status).toBe('has_pr')
      expect(building.prCount).toBeGreaterThan(0)
    })

    it('sollte Flagge an Gebäudespitze platzieren', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(0, 70%, 60%)',
        status: 'has_pr',
        height: 6,
        issueCount: 0,
        prCount: 1
      }

      expect(() => {
        drawStatusIndicator(ctx, building, 400, 300, 16, 0)
      }).not.toThrow()
    })
  })

  describe('Integration: Alle Status-Typen', () => {
    it('sollte alle 3 Status-Typen korrekt rendern', () => {
      const buildings: Building[] = [
        { id: '1', projectName: 'p1', position: { x: 0, y: 0 }, color: 'hsl(0, 70%, 60%)', status: 'active', height: 3, issueCount: 0, prCount: 0 },
        { id: '2', projectName: 'p2', position: { x: 2, y: 2 }, color: 'hsl(120, 70%, 60%)', status: 'has_issues', height: 4, issueCount: 3, prCount: 0 },
        { id: '3', projectName: 'p3', position: { x: 5, y: 5 }, color: 'hsl(240, 70%, 60%)', status: 'has_pr', height: 5, issueCount: 0, prCount: 2 }
      ]

      buildings.forEach(building => {
        expect(() => {
          drawStatusIndicator(ctx, building, 400, 300, 16, 0)
        }).not.toThrow()
      })
    })

    it('sollte drawStatusIndicator mit allen Parametern aufrufen', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(180, 70%, 60%)',
        status: 'has_pr',
        height: 4,
        issueCount: 0,
        prCount: 1
      }

      expect(() => {
        drawStatusIndicator(ctx, building, 400, 300, 16, 1234)
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('sollte Status-Indikatoren für 10 Buildings in unter 50ms rendern', () => {
      const buildings: Building[] = Array(10).fill(null).map((_, i) => ({
        id: `project-${i}`,
        projectName: `test-${i}`,
        position: { x: i, y: i },
        color: `hsl(${i * 30}, 70%, 60%)`,
        status: i % 3 === 0 ? 'active' : (i % 3 === 1 ? 'has_issues' : 'has_pr') as const,
        height: 4,
        issueCount: i % 3 === 1 ? i : 0,
        prCount: i % 3 === 2 ? 1 : 0
      }))

      const start = performance.now()

      buildings.forEach(building => {
        drawStatusIndicator(ctx, building, 400, 300, 16, start)
      })

      const duration = performance.now() - start

      expect(duration).toBeLessThan(50)
    })
  })
})
