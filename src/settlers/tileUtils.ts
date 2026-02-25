/**
 * Tile System Utilities
 * Coordinate transforms, heightmap generation, tile creation
 */
import type {
  Tile,
  TileMapConfig,
  TerrainType,
  IsometricPoint,
  ScreenPoint,
  TERRAIN_TYPES,
} from '../types/settlers'

/**
 * Simple seeded PRNG (Mulberry32)
 * Produces deterministic pseudo-random numbers from a seed.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Tile Creation ──────────────────────────────────────────

export function createTile(
  x: number,
  y: number,
  terrain: TerrainType,
  height: number = 0,
): Tile {
  return {
    x,
    y,
    terrain,
    height: Math.max(0, Math.min(1, height)),
  }
}

// ── Height Map ─────────────────────────────────────────────

/**
 * Generate a smooth height map using diamond-square-inspired interpolation.
 * Values are normalized to [0, 1].
 */
export function generateHeightMap(
  width: number,
  height: number,
  seed: number = 0,
): number[][] {
  const rng = mulberry32(seed)
  const map: number[][] = []

  // Generate base random values
  for (let y = 0; y < height; y++) {
    map[y] = []
    for (let x = 0; x < width; x++) {
      map[y][x] = rng()
    }
  }

  // Multiple smoothing passes for gradual transitions
  let current = map
  for (let pass = 0; pass < 3; pass++) {
    const smoothed: number[][] = []
    for (let y = 0; y < height; y++) {
      smoothed[y] = []
      for (let x = 0; x < width; x++) {
        let sum = current[y][x]
        let count = 1
        if (x > 0) { sum += current[y][x - 1]; count++ }
        if (x < width - 1) { sum += current[y][x + 1]; count++ }
        if (y > 0) { sum += current[y - 1][x]; count++ }
        if (y < height - 1) { sum += current[y + 1][x]; count++ }
        smoothed[y][x] = sum / count
      }
    }
    current = smoothed
  }

  // Normalize to [0, 1]
  let min = Infinity
  let max = -Infinity
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (current[y][x] < min) min = current[y][x]
      if (current[y][x] > max) max = current[y][x]
    }
  }

  const range = max - min || 1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      current[y][x] = (current[y][x] - min) / range
    }
  }

  return current
}

// ── Terrain Assignment ─────────────────────────────────────

const TERRAIN_LIST: TerrainType[] = ['grass', 'water', 'sand', 'stone']

/**
 * Assign terrain type based on height value.
 * water: 0.0 - 0.25, sand: 0.25 - 0.4, grass: 0.4 - 0.75, stone: 0.75 - 1.0
 */
function terrainFromHeight(height: number): TerrainType {
  if (height < 0.25) return 'water'
  if (height < 0.4) return 'sand'
  if (height < 0.75) return 'grass'
  return 'stone'
}

// ── Grid Creation ──────────────────────────────────────────

export function createTileGrid(config: TileMapConfig): Tile[][] {
  const { width, height, seed = 0 } = config
  const heightMap = generateHeightMap(width, height, seed)
  const grid: Tile[][] = []

  for (let y = 0; y < height; y++) {
    grid[y] = []
    for (let x = 0; x < width; x++) {
      const h = heightMap[y][x]
      grid[y][x] = createTile(x, y, terrainFromHeight(h), h)
    }
  }

  return grid
}

// ── Tile Lookup ────────────────────────────────────────────

export function getTileAtPosition(
  grid: Tile[][],
  x: number,
  y: number,
): Tile | undefined {
  if (y < 0 || y >= grid.length) return undefined
  if (x < 0 || x >= grid[0].length) return undefined
  return grid[y][x]
}

export function getNeighborTiles(
  grid: Tile[][],
  x: number,
  y: number,
): Tile[] {
  const offsets = [
    [-1, 0], // left
    [1, 0],  // right
    [0, -1], // top
    [0, 1],  // bottom
  ]

  const neighbors: Tile[] = []
  for (const [dx, dy] of offsets) {
    const tile = getTileAtPosition(grid, x + dx, y + dy)
    if (tile) neighbors.push(tile)
  }
  return neighbors
}

// ── Isometric Coordinates ──────────────────────────────────

/**
 * Convert cartesian grid coordinates to isometric screen coordinates.
 * Standard isometric: isoX = (x - y) * tileWidth/2, isoY = (x + y) * tileHeight/4
 * tileHeight is assumed to be tileSize/2 (standard 2:1 isometric ratio).
 */
export function cartesianToIsometric(
  x: number,
  y: number,
  tileSize: number,
): IsometricPoint {
  const halfWidth = tileSize / 2
  const quarterHeight = tileSize / 4 // tileHeight = tileSize/2, then /2
  return {
    isoX: (x - y) * halfWidth,
    isoY: (x + y) * quarterHeight,
  }
}

/**
 * Convert isometric screen coordinates back to cartesian grid coordinates.
 */
export function isometricToCartesian(
  isoX: number,
  isoY: number,
  tileSize: number,
): { x: number; y: number } {
  const halfWidth = tileSize / 2
  const quarterHeight = tileSize / 4
  // Inverse of the isometric transform
  const x = (isoX / halfWidth + isoY / quarterHeight) / 2
  const y = (isoY / quarterHeight - isoX / halfWidth) / 2
  return { x, y }
}

/**
 * Get screen position for a tile, including height offset for 3D effect.
 */
export function tileToScreenPosition(
  tile: Tile,
  tileSize: number,
  maxHeightOffset: number = 20,
): ScreenPoint {
  const iso = cartesianToIsometric(tile.x, tile.y, tileSize)
  return {
    screenX: iso.isoX,
    screenY: iso.isoY - tile.height * maxHeightOffset,
  }
}
