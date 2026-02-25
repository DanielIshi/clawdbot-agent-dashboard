/**
 * TDD Tests für Issue #53: Isometrische Canvas-Basis mit Grid-System
 *
 * Testet:
 * - Isometrische Koordinaten-Transformation (inkl. Origin)
 * - Grid-Generierung (Tile-Anzahl, Positionen)
 * - Grid-Bounds für Canvas-Layout
 * - Tile-Polygon Punkte (Diamond)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

let mod: any

beforeAll(async () => {
  ;(globalThis as any).__SETTLERS_TEST__ = true
  mod = await import('../../public/three-scene.js')
})

afterAll(() => {
  delete (globalThis as any).__SETTLERS_TEST__
})

describe('Isometrische Canvas-Basis', () => {
  it('should convert cartesian to isometric with origin offset', () => {
    const { cartesianToIsometric } = mod
    const iso = cartesianToIsometric(2, 1, 40, 100, 50)
    // isoX = (x - y) * tileSize/2 + originX
    // isoY = (x + y) * tileSize/4 + originY
    expect(iso.isoX).toBe(100 + (2 - 1) * 20)
    expect(iso.isoY).toBe(50 + (2 + 1) * 10)
  })

  it('should round-trip cartesian <-> isometric', () => {
    const { cartesianToIsometric, isometricToCartesian } = mod
    const tileSize = 48
    const originX = 30
    const originY = 20
    const base = { x: 5, y: 3 }
    const iso = cartesianToIsometric(base.x, base.y, tileSize, originX, originY)
    const back = isometricToCartesian(iso.isoX, iso.isoY, tileSize, originX, originY)
    expect(back.x).toBeCloseTo(base.x, 6)
    expect(back.y).toBeCloseTo(base.y, 6)
  })

  it('should build an isometric grid with correct tile positions', () => {
    const { createIsometricGrid, cartesianToIsometric } = mod
    const grid = createIsometricGrid({ columns: 3, rows: 2, tileSize: 40 })
    expect(grid).toHaveLength(6)

    const last = grid.find((t: any) => t.x === 2 && t.y === 1)
    expect(last).toBeDefined()
    const iso = cartesianToIsometric(2, 1, 40)
    expect(last.isoX).toBe(iso.isoX)
    expect(last.isoY).toBe(iso.isoY)
  })

  it('should calculate pixel bounds for the grid', () => {
    const { getIsometricGridBounds } = mod
    const bounds = getIsometricGridBounds({ columns: 3, rows: 2, tileSize: 40 })

    expect(bounds.minX).toBe(-40)
    expect(bounds.maxX).toBe(60)
    expect(bounds.minY).toBe(-10)
    expect(bounds.maxY).toBe(40)
    expect(bounds.width).toBe(100)
    expect(bounds.height).toBe(50)
  })

  it('should return tile polygon points for a diamond', () => {
    const { getIsometricTilePolygon } = mod
    const points = getIsometricTilePolygon(0, 0, 40)

    expect(points).toHaveLength(4)
    expect(points[0]).toEqual({ x: 0, y: -10 }) // top
    expect(points[1]).toEqual({ x: 20, y: 0 })  // right
    expect(points[2]).toEqual({ x: 0, y: 10 })  // bottom
    expect(points[3]).toEqual({ x: -20, y: 0 }) // left
  })
})
