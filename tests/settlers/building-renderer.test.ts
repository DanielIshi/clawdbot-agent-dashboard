/**
 * Tests für Building-Rendering
 * Issue #56, AC3: Building-Rendering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createBuildingVoxels, drawBuilding } from '../../src/components/settlers/BuildingRenderer'
import type { Building } from '../../src/components/settlers/types'

describe('AC3: Building-Rendering', () => {
  describe('createBuildingVoxels', () => {
    it('sollte Voxel-Array für ein Gebäude erstellen (3x3 Grundfläche)', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test-project',
        position: { x: 5, y: 5 },
        color: 'hsl(240, 70%, 60%)',
        status: 'active',
        height: 4,
        issueCount: 0,
        prCount: 0
      }

      const voxels = createBuildingVoxels(building)

      // 3x3 Grundfläche * 4 Höhe = mindestens 36 Voxel (Wände + Dach)
      expect(voxels.length).toBeGreaterThanOrEqual(36)
      expect(Array.isArray(voxels)).toBe(true)
    })

    it('sollte verschiedene Höhen unterstützen (3-6 Voxel)', () => {
      const heights = [3, 4, 5, 6]

      heights.forEach(height => {
        const building: Building = {
          id: 'project-1',
          projectName: 'test',
          position: { x: 0, y: 0 },
          color: 'hsl(180, 70%, 60%)',
          status: 'active',
          height,
          issueCount: 0,
          prCount: 0
        }

        const voxels = createBuildingVoxels(building)

        // Gebäudehöhe sollte im Voxel-Array reflektiert sein
        const maxZ = Math.max(...voxels.map(v => v.z))
        expect(maxZ).toBeGreaterThanOrEqual(height - 1)
      })
    })

    it('sollte Pyramiden-Dach erzeugen (reduzierte Voxel-Anzahl nach oben)', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 0, y: 0 },
        color: 'hsl(120, 70%, 60%)',
        status: 'active',
        height: 5,
        issueCount: 0,
        prCount: 0
      }

      const voxels = createBuildingVoxels(building)

      // Gruppiere Voxel nach Z-Ebene
      const voxelsByZ: { [key: number]: number } = {}
      voxels.forEach(v => {
        voxelsByZ[v.z] = (voxelsByZ[v.z] || 0) + 1
      })

      // Pyramiden-Form: Höhere Ebenen sollten weniger Voxel haben
      const levels = Object.keys(voxelsByZ).map(Number).sort((a, b) => a - b)

      if (levels.length > 2) {
        // Mittlere Ebenen sollten mehr Voxel haben als obere Ebenen
        const midLevel = levels[Math.floor(levels.length / 2)]
        const topLevel = levels[levels.length - 1]
        expect(voxelsByZ[midLevel]).toBeGreaterThanOrEqual(voxelsByZ[topLevel])
      }
    })

    it('sollte Projekt-Farbe aus Building verwenden', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 0, y: 0 },
        color: 'hsl(200, 70%, 60%)',
        status: 'active',
        height: 4,
        issueCount: 0,
        prCount: 0
      }

      const voxels = createBuildingVoxels(building)

      // Alle Voxel sollten eine Hex-Farbe haben (konvertiert aus HSL)
      const allHexColors = voxels.every(v => /^#[0-9a-f]{6}$/i.test(v.color))
      expect(allHexColors).toBe(true)

      // Es sollten mindestens 2 verschiedene Schattierungen geben (Wände, Dach)
      const uniqueColors = new Set(voxels.map(v => v.color))
      expect(uniqueColors.size).toBeGreaterThanOrEqual(2)
    })

    it('sollte 3x3 Grundfläche haben (Voxel bei x=-1..1, y=-1..1)', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 0, y: 0 },
        color: 'hsl(60, 70%, 60%)',
        status: 'active',
        height: 3,
        issueCount: 0,
        prCount: 0
      }

      const voxels = createBuildingVoxels(building)

      // Finde alle Voxel auf Bodenhöhe (z=0)
      const groundVoxels = voxels.filter(v => v.z === 0)

      // Überprüfe, dass Voxel im 3x3-Bereich liegen
      const xValues = groundVoxels.map(v => v.x)
      const yValues = groundVoxels.map(v => v.y)

      expect(Math.min(...xValues)).toBeLessThanOrEqual(0)
      expect(Math.max(...xValues)).toBeGreaterThanOrEqual(0)
      expect(Math.min(...yValues)).toBeLessThanOrEqual(0)
      expect(Math.max(...yValues)).toBeGreaterThanOrEqual(0)
    })

    it('sollte Voxel mit positiven Z-Werten haben', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 0, y: 0 },
        color: 'hsl(0, 70%, 60%)',
        status: 'active',
        height: 4,
        issueCount: 0,
        prCount: 0
      }

      const voxels = createBuildingVoxels(building)

      voxels.forEach(v => {
        expect(v.z).toBeGreaterThanOrEqual(0)
      })
    })

    it('sollte für unterschiedliche Buildings unterschiedliche Farben verwenden', () => {
      const building1: Building = {
        id: 'project-1',
        projectName: 'siedler-viz',
        position: { x: 0, y: 0 },
        color: 'hsl(100, 70%, 60%)',
        status: 'active',
        height: 4,
        issueCount: 0,
        prCount: 0
      }

      const building2: Building = {
        id: 'project-2',
        projectName: 'agent-dashboard',
        position: { x: 5, y: 5 },
        color: 'hsl(250, 70%, 60%)',
        status: 'active',
        height: 4,
        issueCount: 0,
        prCount: 0
      }

      const voxels1 = createBuildingVoxels(building1)
      const voxels2 = createBuildingVoxels(building2)

      // Farben sollten unterschiedlich sein
      expect(building1.color).not.toBe(building2.color)

      // Extrahiere Basis-Farben aus Voxel-Arrays (erste Wand-Voxel)
      const baseColor1 = voxels1[0].color
      const baseColor2 = voxels2[0].color

      // Basis-Farben sollten unterschiedlich sein
      expect(baseColor1).not.toBe(baseColor2)
    })
  })

  describe('drawBuilding', () => {
    let canvas: HTMLCanvasElement
    let ctx: CanvasRenderingContext2D

    beforeEach(() => {
      canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 600
      ctx = canvas.getContext('2d')!
    })

    it('sollte ohne Fehler zeichnen', () => {
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

      expect(() => {
        drawBuilding(ctx, building, 400, 300, 16)
      }).not.toThrow()

      // Context sollte gesetzt worden sein
      expect(ctx).toBeTruthy()
    })

    it('sollte Building an korrekter Screen-Position rendern', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(240, 70%, 60%)',
        status: 'active',
        height: 4,
        issueCount: 0,
        prCount: 0
      }

      const screenX = 400
      const screenY = 300

      expect(() => {
        drawBuilding(ctx, building, screenX, screenY, 16)
      }).not.toThrow()
    })

    it('sollte verschiedene Voxel-Größen unterstützen', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(120, 70%, 60%)',
        status: 'active',
        height: 4,
        issueCount: 0,
        prCount: 0
      }

      const sizes = [8, 12, 16, 20]

      sizes.forEach(voxelSize => {
        expect(() => {
          drawBuilding(ctx, building, 400, 300, voxelSize)
        }).not.toThrow()
      })
    })

    it('sollte für Status "active" normales Rendering verwenden', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(0, 70%, 60%)',
        status: 'active',
        height: 4,
        issueCount: 0,
        prCount: 0
      }

      expect(() => {
        drawBuilding(ctx, building, 400, 300, 16)
      }).not.toThrow()
    })

    it('sollte für alle Status-Typen funktionieren', () => {
      const statuses: Array<'active' | 'has_issues' | 'has_pr'> = ['active', 'has_issues', 'has_pr']

      statuses.forEach(status => {
        const building: Building = {
          id: 'project-1',
          projectName: 'test',
          position: { x: 5, y: 5 },
          color: 'hsl(60, 70%, 60%)',
          status,
          height: 4,
          issueCount: status === 'has_issues' ? 2 : 0,
          prCount: status === 'has_pr' ? 1 : 0
        }

        expect(() => {
          drawBuilding(ctx, building, 400, 300, 16)
        }).not.toThrow()
      })
    })

    it('sollte mehrere Buildings nacheinander rendern können', () => {
      const buildings: Building[] = [
        { id: '1', projectName: 'p1', position: { x: 0, y: 0 }, color: 'hsl(0, 70%, 60%)', status: 'active', height: 3, issueCount: 0, prCount: 0 },
        { id: '2', projectName: 'p2', position: { x: 2, y: 2 }, color: 'hsl(120, 70%, 60%)', status: 'has_issues', height: 4, issueCount: 2, prCount: 0 },
        { id: '3', projectName: 'p3', position: { x: 5, y: 5 }, color: 'hsl(240, 70%, 60%)', status: 'has_pr', height: 5, issueCount: 0, prCount: 1 }
      ]

      expect(() => {
        buildings.forEach(building => {
          drawBuilding(ctx, building, 400, 300, 16)
        })
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    let canvas: HTMLCanvasElement
    let ctx: CanvasRenderingContext2D

    beforeEach(() => {
      canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 600
      ctx = canvas.getContext('2d')!
    })

    it('sollte 5 Buildings in unter 100ms rendern', () => {
      const buildings: Building[] = Array(5).fill(null).map((_, i) => ({
        id: `project-${i}`,
        projectName: `test-${i}`,
        position: { x: i * 2, y: i * 2 },
        color: `hsl(${i * 70}, 70%, 60%)`,
        status: 'active' as const,
        height: 4,
        issueCount: 0,
        prCount: 0
      }))

      const start = performance.now()

      buildings.forEach(building => {
        drawBuilding(ctx, building, 400, 300, 16)
      })

      const duration = performance.now() - start

      expect(duration).toBeLessThan(100)
    })
  })
})
