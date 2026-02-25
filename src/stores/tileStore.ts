/**
 * Tile Store - Zustand store for tile map state management
 */
import { create } from 'zustand'
import type { Tile, TileMapConfig, TerrainType } from '../types/settlers'
import { createTileGrid, getTileAtPosition } from '../settlers/tileUtils'

interface TileState {
  grid: Tile[][] | null
  config: TileMapConfig | null
  selectedTile: { x: number; y: number } | null

  // Actions
  generateMap: (config: TileMapConfig) => void
  selectTile: (x: number | null, y: number | null) => void
  updateTileTerrain: (x: number, y: number, terrain: TerrainType) => void
  getTile: (x: number, y: number) => Tile | undefined
  reset: () => void
}

const initialState = {
  grid: null as Tile[][] | null,
  config: null as TileMapConfig | null,
  selectedTile: null as { x: number; y: number } | null,
}

export const useTileStore = create<TileState>((set, get) => ({
  ...initialState,

  generateMap: (config: TileMapConfig) => {
    const grid = createTileGrid(config)
    set({ grid, config })
  },

  selectTile: (x: number | null, y: number | null) => {
    if (x === null || y === null) {
      set({ selectedTile: null })
    } else {
      set({ selectedTile: { x, y } })
    }
  },

  updateTileTerrain: (x: number, y: number, terrain: TerrainType) => {
    const { grid } = get()
    if (!grid) return

    const newGrid = grid.map(row => [...row])
    const tile = getTileAtPosition(newGrid, x, y)
    if (!tile) return

    newGrid[y][x] = { ...tile, terrain }
    set({ grid: newGrid })
  },

  getTile: (x: number, y: number) => {
    const { grid } = get()
    if (!grid) return undefined
    return getTileAtPosition(grid, x, y)
  },

  reset: () => set({ ...initialState }),
}))
