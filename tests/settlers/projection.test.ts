/**
 * Tests für Isometrische Projektions-Funktionen
 * Issue #53, AC2: Isometrische Projektion korrekt
 *
 * TDD Red Phase: Tests definieren BEVOR Implementierung
 */

import { describe, it, expect } from 'vitest'
import { toIsometric, toGrid, createViewport } from '../../src/components/settlers/projection'
import type { GridCoordinates, IsometricCoordinates, TileConfig, ViewportConfig } from '../../src/components/settlers/types'

const TILE_CONFIG: TileConfig = {
  width: 64,
  height: 32
}

describe('Isometrische Projektion', () => {
  describe('toIsometric()', () => {
    it('sollte Grid (0,0) korrekt auf Isometrische Koordinaten abbilden', () => {
      const grid: GridCoordinates = { x: 0, y: 0 }
      const iso = toIsometric(grid, TILE_CONFIG)

      // ISO_X = (x - y) * TILE_WIDTH / 2 = (0 - 0) * 64 / 2 = 0
      // ISO_Y = (x + y) * TILE_HEIGHT / 2 = (0 + 0) * 32 / 2 = 0
      expect(iso.isoX).toBe(0)
      expect(iso.isoY).toBe(0)
    })

    it('sollte Grid (5,5) korrekt projizieren (Kamera-Zentrum)', () => {
      const grid: GridCoordinates = { x: 5, y: 5 }
      const iso = toIsometric(grid, TILE_CONFIG)

      // ISO_X = (5 - 5) * 64 / 2 = 0
      // ISO_Y = (5 + 5) * 32 / 2 = 160
      expect(iso.isoX).toBe(0)
      expect(iso.isoY).toBe(160)
    })

    it('sollte Grid (1,0) nach rechts verschieben', () => {
      const grid: GridCoordinates = { x: 1, y: 0 }
      const iso = toIsometric(grid, TILE_CONFIG)

      // ISO_X = (1 - 0) * 64 / 2 = 32
      // ISO_Y = (1 + 0) * 32 / 2 = 16
      expect(iso.isoX).toBe(32)
      expect(iso.isoY).toBe(16)
    })

    it('sollte Grid (0,1) nach links verschieben', () => {
      const grid: GridCoordinates = { x: 0, y: 1 }
      const iso = toIsometric(grid, TILE_CONFIG)

      // ISO_X = (0 - 1) * 64 / 2 = -32
      // ISO_Y = (0 + 1) * 32 / 2 = 16
      expect(iso.isoX).toBe(-32)
      expect(iso.isoY).toBe(16)
    })

    it('sollte Grid (9,9) korrekt projizieren (untere rechte Ecke)', () => {
      const grid: GridCoordinates = { x: 9, y: 9 }
      const iso = toIsometric(grid, TILE_CONFIG)

      // ISO_X = (9 - 9) * 64 / 2 = 0
      // ISO_Y = (9 + 9) * 32 / 2 = 288
      expect(iso.isoX).toBe(0)
      expect(iso.isoY).toBe(288)
    })

    it('sollte Grid (9,0) korrekt projizieren (rechte Ecke)', () => {
      const grid: GridCoordinates = { x: 9, y: 0 }
      const iso = toIsometric(grid, TILE_CONFIG)

      // ISO_X = (9 - 0) * 64 / 2 = 288
      // ISO_Y = (9 + 0) * 32 / 2 = 144
      expect(iso.isoX).toBe(288)
      expect(iso.isoY).toBe(144)
    })

    it('sollte Grid (0,9) korrekt projizieren (linke Ecke)', () => {
      const grid: GridCoordinates = { x: 0, y: 9 }
      const iso = toIsometric(grid, TILE_CONFIG)

      // ISO_X = (0 - 9) * 64 / 2 = -288
      // ISO_Y = (0 + 9) * 32 / 2 = 144
      expect(iso.isoX).toBe(-288)
      expect(iso.isoY).toBe(144)
    })
  })

  describe('toGrid() - Inverse Projektion', () => {
    it('sollte Isometrische (0,0) zurück auf Grid (0,0) mappen', () => {
      const iso: IsometricCoordinates = { isoX: 0, isoY: 0 }
      const grid = toGrid(iso, TILE_CONFIG)

      expect(grid.x).toBe(0)
      expect(grid.y).toBe(0)
    })

    it('sollte Isometrische (0,160) zurück auf Grid (5,5) mappen', () => {
      const iso: IsometricCoordinates = { isoX: 0, isoY: 160 }
      const grid = toGrid(iso, TILE_CONFIG)

      expect(grid.x).toBe(5)
      expect(grid.y).toBe(5)
    })

    it('sollte Isometrische (32,16) zurück auf Grid (1,0) mappen', () => {
      const iso: IsometricCoordinates = { isoX: 32, isoY: 16 }
      const grid = toGrid(iso, TILE_CONFIG)

      expect(grid.x).toBe(1)
      expect(grid.y).toBe(0)
    })

    it('sollte toIsometric() und toGrid() umkehrbar sein (Roundtrip)', () => {
      const originalGrid: GridCoordinates = { x: 7, y: 3 }

      const iso = toIsometric(originalGrid, TILE_CONFIG)
      const backToGrid = toGrid(iso, TILE_CONFIG)

      expect(backToGrid.x).toBe(originalGrid.x)
      expect(backToGrid.y).toBe(originalGrid.y)
    })
  })

  describe('createViewport() - Kamera-Zentrierung', () => {
    it('sollte Viewport für 1920x1080 Desktop erstellen', () => {
      const viewport = createViewport(1920, 1080, TILE_CONFIG, 10)

      expect(viewport.width).toBe(1920)
      expect(viewport.height).toBe(1080)
      expect(viewport.offsetX).toBeGreaterThan(0) // Sollte zentriert sein
      expect(viewport.offsetY).toBeGreaterThan(0)
    })

    it('sollte Grid-Zentrum (5,5) in Canvas-Mitte platzieren', () => {
      const canvasWidth = 1920
      const canvasHeight = 1080
      const viewport = createViewport(canvasWidth, canvasHeight, TILE_CONFIG, 10)

      // Grid (5,5) → ISO (0, 160)
      // Mit Offset sollte das in der Canvas-Mitte sein
      const centerIso = toIsometric({ x: 5, y: 5 }, TILE_CONFIG)
      const screenX = centerIso.isoX + viewport.offsetX
      const screenY = centerIso.isoY + viewport.offsetY

      // Sollte ungefähr in der Mitte sein (mit etwas Toleranz)
      expect(screenX).toBeCloseTo(canvasWidth / 2, -1)
      expect(screenY).toBeCloseTo(canvasHeight / 2, -1)
    })

    it('sollte responsive Viewports für verschiedene Größen erstellen', () => {
      const desktop = createViewport(1920, 1080, TILE_CONFIG, 10)
      const tablet = createViewport(768, 1024, TILE_CONFIG, 10)
      const mobile = createViewport(375, 667, TILE_CONFIG, 10)

      expect(desktop.width).toBeGreaterThan(tablet.width)
      expect(tablet.width).toBeGreaterThan(mobile.width)

      // Alle sollten gültige Offsets haben
      expect(desktop.offsetX).toBeGreaterThan(0)
      expect(tablet.offsetX).toBeGreaterThan(0)
      expect(mobile.offsetX).toBeGreaterThan(0)
    })
  })
})
