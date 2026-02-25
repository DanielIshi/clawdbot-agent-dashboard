/**
 * TDD Tests für Issue #54: Tile-System mit Terrain-Typen
 *
 * Testet:
 * - Terrain-Typen und Konfiguration
 * - Tile-Erstellung und Validierung
 * - Height-Map Generierung
 * - Isometrische Koordinaten-Transformation
 * - TileMap Store (Zustand)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  TerrainType,
  TERRAIN_CONFIGS,
  TERRAIN_TYPES,
  Tile,
  TileMapConfig,
} from '../../src/types/settlers'
import {
  cartesianToIsometric,
  isometricToCartesian,
  generateHeightMap,
  createTile,
  createTileGrid,
  getTileAtPosition,
  getNeighborTiles,
  tileToScreenPosition,
} from '../../src/settlers/tileUtils'
import { useTileStore } from '../../src/stores/tileStore'

// ============================================================
// 1. Terrain Types & Configuration
// ============================================================
describe('Terrain Types', () => {
  it('should have exactly 4 terrain types', () => {
    expect(TERRAIN_TYPES).toHaveLength(4)
    expect(TERRAIN_TYPES).toContain('grass')
    expect(TERRAIN_TYPES).toContain('water')
    expect(TERRAIN_TYPES).toContain('sand')
    expect(TERRAIN_TYPES).toContain('stone')
  })

  it('should have configuration for each terrain type', () => {
    for (const type of TERRAIN_TYPES) {
      const config = TERRAIN_CONFIGS[type]
      expect(config).toBeDefined()
      expect(config.type).toBe(type)
      expect(config.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(config.label).toBeTruthy()
      expect(typeof config.walkable).toBe('boolean')
    }
  })

  it('water should not be walkable', () => {
    expect(TERRAIN_CONFIGS.water.walkable).toBe(false)
  })

  it('grass, sand, stone should be walkable', () => {
    expect(TERRAIN_CONFIGS.grass.walkable).toBe(true)
    expect(TERRAIN_CONFIGS.sand.walkable).toBe(true)
    expect(TERRAIN_CONFIGS.stone.walkable).toBe(true)
  })

  it('should have German labels', () => {
    expect(TERRAIN_CONFIGS.grass.label).toBe('Gras')
    expect(TERRAIN_CONFIGS.water.label).toBe('Wasser')
    expect(TERRAIN_CONFIGS.sand.label).toBe('Sand')
    expect(TERRAIN_CONFIGS.stone.label).toBe('Stein')
  })
})

// ============================================================
// 2. Tile Creation
// ============================================================
describe('Tile Creation', () => {
  it('should create a tile with valid properties', () => {
    const tile = createTile(3, 5, 'grass', 0.5)
    expect(tile.x).toBe(3)
    expect(tile.y).toBe(5)
    expect(tile.terrain).toBe('grass')
    expect(tile.height).toBe(0.5)
  })

  it('should default height to 0 if not specified', () => {
    const tile = createTile(0, 0, 'water')
    expect(tile.height).toBe(0)
  })

  it('should clamp height to 0-1 range', () => {
    const tileHigh = createTile(0, 0, 'stone', 1.5)
    expect(tileHigh.height).toBeLessThanOrEqual(1)

    const tileLow = createTile(0, 0, 'stone', -0.5)
    expect(tileLow.height).toBeGreaterThanOrEqual(0)
  })
})

// ============================================================
// 3. Tile Grid Generation
// ============================================================
describe('Tile Grid', () => {
  it('should create a grid with correct dimensions', () => {
    const config: TileMapConfig = { width: 8, height: 6, tileSize: 64 }
    const grid = createTileGrid(config)

    expect(grid).toHaveLength(6) // rows
    expect(grid[0]).toHaveLength(8) // cols
  })

  it('should fill all positions with valid tiles', () => {
    const config: TileMapConfig = { width: 4, height: 4, tileSize: 64 }
    const grid = createTileGrid(config)

    for (let y = 0; y < config.height; y++) {
      for (let x = 0; x < config.width; x++) {
        const tile = grid[y][x]
        expect(tile.x).toBe(x)
        expect(tile.y).toBe(y)
        expect(TERRAIN_TYPES).toContain(tile.terrain)
        expect(tile.height).toBeGreaterThanOrEqual(0)
        expect(tile.height).toBeLessThanOrEqual(1)
      }
    }
  })

  it('should produce deterministic output with same seed', () => {
    const config: TileMapConfig = { width: 8, height: 8, tileSize: 64, seed: 42 }
    const grid1 = createTileGrid(config)
    const grid2 = createTileGrid(config)

    for (let y = 0; y < config.height; y++) {
      for (let x = 0; x < config.width; x++) {
        expect(grid1[y][x].terrain).toBe(grid2[y][x].terrain)
        expect(grid1[y][x].height).toBe(grid2[y][x].height)
      }
    }
  })

  it('should produce different output with different seeds', () => {
    const config1: TileMapConfig = { width: 8, height: 8, tileSize: 64, seed: 42 }
    const config2: TileMapConfig = { width: 8, height: 8, tileSize: 64, seed: 99 }
    const grid1 = createTileGrid(config1)
    const grid2 = createTileGrid(config2)

    // At least some tiles should differ
    let hasDifference = false
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (grid1[y][x].terrain !== grid2[y][x].terrain) {
          hasDifference = true
          break
        }
      }
      if (hasDifference) break
    }
    expect(hasDifference).toBe(true)
  })
})

// ============================================================
// 4. Height Map Generation
// ============================================================
describe('Height Map', () => {
  it('should generate a height map with correct dimensions', () => {
    const heightMap = generateHeightMap(8, 6, 42)
    expect(heightMap).toHaveLength(6)
    expect(heightMap[0]).toHaveLength(8)
  })

  it('should produce values between 0 and 1', () => {
    const heightMap = generateHeightMap(16, 16, 42)
    for (const row of heightMap) {
      for (const val of row) {
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(1)
      }
    }
  })

  it('should be deterministic with same seed', () => {
    const map1 = generateHeightMap(8, 8, 123)
    const map2 = generateHeightMap(8, 8, 123)

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        expect(map1[y][x]).toBe(map2[y][x])
      }
    }
  })

  it('should produce smooth transitions (no harsh jumps)', () => {
    const heightMap = generateHeightMap(16, 16, 42)
    const maxDelta = 0.5 // neighboring tiles should not differ more than this
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 15; x++) {
        const dx = Math.abs(heightMap[y][x] - heightMap[y][x + 1])
        const dy = Math.abs(heightMap[y][x] - heightMap[y + 1][x])
        expect(dx).toBeLessThanOrEqual(maxDelta)
        expect(dy).toBeLessThanOrEqual(maxDelta)
      }
    }
  })
})

// ============================================================
// 5. Isometric Coordinate Transformation
// ============================================================
describe('Isometric Coordinates', () => {
  it('should convert cartesian (0,0) to isometric origin', () => {
    const iso = cartesianToIsometric(0, 0, 64)
    expect(iso.isoX).toBe(0)
    expect(iso.isoY).toBe(0)
  })

  it('should convert cartesian to isometric correctly', () => {
    // Standard isometric: isoX = (x - y) * tileWidth/2, isoY = (x + y) * tileHeight/4
    const iso = cartesianToIsometric(1, 0, 64)
    expect(iso.isoX).toBe(32)  // (1-0) * 64/2
    expect(iso.isoY).toBe(16)  // (1+0) * 64/4
  })

  it('should be reversible (round-trip)', () => {
    const tileSize = 64
    const testCases = [
      [0, 0], [3, 5], [7, 2], [10, 10]
    ]
    for (const [x, y] of testCases) {
      const iso = cartesianToIsometric(x, y, tileSize)
      const back = isometricToCartesian(iso.isoX, iso.isoY, tileSize)
      expect(back.x).toBeCloseTo(x, 5)
      expect(back.y).toBeCloseTo(y, 5)
    }
  })

  it('should calculate screen position with height offset', () => {
    const tile: Tile = { x: 2, y: 3, terrain: 'stone', height: 0.8 }
    const screen = tileToScreenPosition(tile, 64, 20) // 20px max height offset
    const baseIso = cartesianToIsometric(2, 3, 64)

    expect(screen.screenX).toBe(baseIso.isoX)
    // screenY should be raised by height * maxHeightOffset
    expect(screen.screenY).toBe(baseIso.isoY - tile.height * 20)
  })

  it('should handle zero height without offset', () => {
    const tile: Tile = { x: 1, y: 1, terrain: 'water', height: 0 }
    const screen = tileToScreenPosition(tile, 64, 20)
    const baseIso = cartesianToIsometric(1, 1, 64)

    expect(screen.screenX).toBe(baseIso.isoX)
    expect(screen.screenY).toBe(baseIso.isoY)
  })
})

// ============================================================
// 6. Tile Lookup & Neighbors
// ============================================================
describe('Tile Lookup', () => {
  const config: TileMapConfig = { width: 8, height: 8, tileSize: 64, seed: 42 }
  let grid: Tile[][]

  beforeEach(() => {
    grid = createTileGrid(config)
  })

  it('should get tile at valid position', () => {
    const tile = getTileAtPosition(grid, 3, 4)
    expect(tile).toBeDefined()
    expect(tile!.x).toBe(3)
    expect(tile!.y).toBe(4)
  })

  it('should return undefined for out-of-bounds position', () => {
    expect(getTileAtPosition(grid, -1, 0)).toBeUndefined()
    expect(getTileAtPosition(grid, 0, -1)).toBeUndefined()
    expect(getTileAtPosition(grid, 8, 0)).toBeUndefined()
    expect(getTileAtPosition(grid, 0, 8)).toBeUndefined()
  })

  it('should get 4 neighbors for inner tile', () => {
    const neighbors = getNeighborTiles(grid, 4, 4)
    expect(neighbors).toHaveLength(4)
    const positions = neighbors.map(t => `${t.x},${t.y}`)
    expect(positions).toContain('3,4') // left
    expect(positions).toContain('5,4') // right
    expect(positions).toContain('4,3') // top
    expect(positions).toContain('4,5') // bottom
  })

  it('should get 2 neighbors for corner tile', () => {
    const neighbors = getNeighborTiles(grid, 0, 0)
    expect(neighbors).toHaveLength(2)
  })

  it('should get 3 neighbors for edge tile', () => {
    const neighbors = getNeighborTiles(grid, 0, 4)
    expect(neighbors).toHaveLength(3)
  })
})

// ============================================================
// 7. Tile Store (Zustand)
// ============================================================
describe('TileStore', () => {
  beforeEach(() => {
    useTileStore.getState().reset()
  })

  it('should initialize with empty state', () => {
    const state = useTileStore.getState()
    expect(state.grid).toBeNull()
    expect(state.config).toBeNull()
    expect(state.selectedTile).toBeNull()
  })

  it('should generate a tile map', () => {
    const config: TileMapConfig = { width: 10, height: 10, tileSize: 64, seed: 42 }
    useTileStore.getState().generateMap(config)

    const state = useTileStore.getState()
    expect(state.grid).not.toBeNull()
    expect(state.grid!).toHaveLength(10)
    expect(state.grid![0]).toHaveLength(10)
    expect(state.config).toEqual(config)
  })

  it('should select and deselect a tile', () => {
    const config: TileMapConfig = { width: 8, height: 8, tileSize: 64, seed: 42 }
    useTileStore.getState().generateMap(config)

    useTileStore.getState().selectTile(3, 4)
    expect(useTileStore.getState().selectedTile).toEqual({ x: 3, y: 4 })

    useTileStore.getState().selectTile(null, null)
    expect(useTileStore.getState().selectedTile).toBeNull()
  })

  it('should update a tile terrain type', () => {
    const config: TileMapConfig = { width: 8, height: 8, tileSize: 64, seed: 42 }
    useTileStore.getState().generateMap(config)

    useTileStore.getState().updateTileTerrain(2, 3, 'water')
    const tile = useTileStore.getState().grid![3][2]
    expect(tile.terrain).toBe('water')
  })

  it('should get tile info from store', () => {
    const config: TileMapConfig = { width: 8, height: 8, tileSize: 64, seed: 42 }
    useTileStore.getState().generateMap(config)

    const tile = useTileStore.getState().getTile(5, 5)
    expect(tile).toBeDefined()
    expect(tile!.x).toBe(5)
    expect(tile!.y).toBe(5)
  })

  it('should reset state completely', () => {
    const config: TileMapConfig = { width: 8, height: 8, tileSize: 64, seed: 42 }
    useTileStore.getState().generateMap(config)
    useTileStore.getState().selectTile(1, 1)

    useTileStore.getState().reset()

    const state = useTileStore.getState()
    expect(state.grid).toBeNull()
    expect(state.config).toBeNull()
    expect(state.selectedTile).toBeNull()
  })
})
