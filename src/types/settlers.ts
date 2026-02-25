/**
 * Settlers Dashboard - Tile System Types
 * Terrain types, tile definitions, and map configuration
 */

export type TerrainType = 'grass' | 'water' | 'sand' | 'stone'

export interface TerrainConfig {
  type: TerrainType
  color: string
  label: string
  walkable: boolean
}

export const TERRAIN_CONFIGS: Record<TerrainType, TerrainConfig> = {
  grass: { type: 'grass', color: '#4ade80', label: 'Gras', walkable: true },
  water: { type: 'water', color: '#60a5fa', label: 'Wasser', walkable: false },
  sand:  { type: 'sand',  color: '#fbbf24', label: 'Sand', walkable: true },
  stone: { type: 'stone', color: '#9ca3af', label: 'Stein', walkable: true },
}

export const TERRAIN_TYPES: TerrainType[] = ['grass', 'water', 'sand', 'stone']

export interface Tile {
  x: number
  y: number
  terrain: TerrainType
  height: number // 0.0 - 1.0 normalized height
}

export interface TileMapConfig {
  width: number
  height: number
  tileSize: number // pixel size of each tile base
  seed?: number   // for deterministic generation
}

export interface IsometricPoint {
  isoX: number
  isoY: number
}

export interface ScreenPoint {
  screenX: number
  screenY: number
}
