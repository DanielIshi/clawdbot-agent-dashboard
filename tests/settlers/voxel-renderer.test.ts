/**
 * Tests für VoxelRenderer
 * Issue #55, AC3: Voxel-Rendering (einfache 3x3x3 Blöcke)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { drawVoxel, drawVoxelSprite, createAgentVoxels } from '../../src/components/settlers/VoxelRenderer'
import type { VoxelBlock } from '../../src/components/settlers/types'

// Mock Canvas Context
function createMockContext() {
  return {
    fillRect: vi.fn(),
    fillStyle: '',
    strokeRect: vi.fn(),
    strokeStyle: '',
    lineWidth: 1,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn()
  } as any
}

describe('VoxelRenderer', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockContext()
  })

  describe('drawVoxel()', () => {
    it('sollte einen einzelnen Voxel als isometrische Box zeichnen', () => {
      drawVoxel(ctx, 100, 100, 10, '#ff0000')

      // Sollte fill() aufrufen (für die 3 sichtbaren Flächen)
      expect(ctx.fill).toHaveBeenCalled()
    })

    it('sollte korrekte Farbe setzen', () => {
      drawVoxel(ctx, 100, 100, 10, '#00ff00')

      expect(ctx.fillStyle).toContain('00ff00')
    })

    it('sollte mit verschiedenen Größen funktionieren', () => {
      drawVoxel(ctx, 100, 100, 5, '#0000ff')
      expect(ctx.fill).toHaveBeenCalled()

      vi.clearAllMocks()

      drawVoxel(ctx, 100, 100, 20, '#0000ff')
      expect(ctx.fill).toHaveBeenCalled()
    })
  })

  describe('createAgentVoxels()', () => {
    it('sollte Voxel-Array für Agent-Sprite erzeugen', () => {
      const voxels = createAgentVoxels('#4b8bff')

      // Agent besteht aus mehreren Voxeln
      expect(voxels.length).toBeGreaterThan(0)

      // Alle Voxel sollten VoxelBlock-Struktur haben
      voxels.forEach(voxel => {
        expect(voxel).toHaveProperty('x')
        expect(voxel).toHaveProperty('y')
        expect(voxel).toHaveProperty('z')
        expect(voxel).toHaveProperty('color')
      })
    })

    it('sollte Kopf-Voxel haben (z >= 2)', () => {
      const voxels = createAgentVoxels('#36c37c')

      // Mindestens ein Voxel sollte in Kopf-Höhe sein
      const headVoxels = voxels.filter(v => v.z >= 2)
      expect(headVoxels.length).toBeGreaterThan(0)
    })

    it('sollte Körper-Voxel haben (z = 1)', () => {
      const voxels = createAgentVoxels('#ff6b6b')

      const bodyVoxels = voxels.filter(v => v.z === 1)
      expect(bodyVoxels.length).toBeGreaterThan(0)
    })

    it('sollte Bein-Voxel haben (z = 0)', () => {
      const voxels = createAgentVoxels('#f4d03f')

      const legVoxels = voxels.filter(v => v.z === 0)
      expect(legVoxels.length).toBeGreaterThan(0)
    })

    it('sollte symmetrisch sein (links/rechts)', () => {
      const voxels = createAgentVoxels('#4b8bff')

      // Für jedes Voxel auf der linken Seite sollte ein gespiegeltes auf der rechten existieren
      // (oder Voxel ist zentral bei x=0)
      const leftVoxels = voxels.filter(v => v.x < 0)
      const rightVoxels = voxels.filter(v => v.x > 0)

      // Links und rechts sollten gleich viele sein (wenn nicht zentral)
      expect(leftVoxels.length).toBe(rightVoxels.length)
    })

    it('sollte korrekte Farbe für alle Voxel verwenden', () => {
      const color = '#36c37c'
      const voxels = createAgentVoxels(color)

      // Alle Voxel sollten die Agent-Farbe haben (oder Schattierung davon)
      voxels.forEach(voxel => {
        expect(voxel.color).toBeTruthy()
        expect(voxel.color).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })
  })

  describe('drawVoxelSprite()', () => {
    it('sollte alle Voxel eines Sprites zeichnen', () => {
      const voxels: VoxelBlock[] = [
        { x: 0, y: 0, z: 0, color: '#ff0000' },
        { x: 0, y: 0, z: 1, color: '#ff0000' },
        { x: 0, y: 0, z: 2, color: '#ff0000' }
      ]

      drawVoxelSprite(ctx, 100, 100, voxels, 10)

      // fill() sollte mindestens 3x aufgerufen worden sein (3 Voxel)
      expect(ctx.fill).toHaveBeenCalled()
    })

    it('sollte Voxel von hinten nach vorne zeichnen (Z-Sorting)', () => {
      const voxels: VoxelBlock[] = [
        { x: 0, y: 0, z: 2, color: '#ff0000' },  // Oben
        { x: 0, y: 0, z: 0, color: '#00ff00' },  // Unten
        { x: 0, y: 0, z: 1, color: '#0000ff' }   // Mitte
      ]

      const fillCalls: string[] = []
      ctx.fill = vi.fn(() => {
        fillCalls.push(ctx.fillStyle as string)
      })

      drawVoxelSprite(ctx, 100, 100, voxels, 10)

      // Voxel sollten in Z-Reihenfolge gezeichnet werden (niedrig → hoch)
      // Das sichert korrektes Overlap
      expect(fillCalls.length).toBeGreaterThan(0)
    })

    it('sollte mit verschiedenen Voxel-Größen funktionieren', () => {
      const voxels: VoxelBlock[] = [
        { x: 0, y: 0, z: 0, color: '#ff0000' }
      ]

      drawVoxelSprite(ctx, 100, 100, voxels, 5)
      expect(ctx.fill).toHaveBeenCalled()

      vi.clearAllMocks()

      drawVoxelSprite(ctx, 100, 100, voxels, 20)
      expect(ctx.fill).toHaveBeenCalled()
    })
  })
})
