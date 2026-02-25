/**
 * TileMap - Renders the full isometric tile grid
 */
import React, { useEffect, useMemo } from 'react'
import { useTileStore } from '../../stores/tileStore'
import { IsometricTile } from './IsometricTile'
import type { Tile, TileMapConfig } from '../../types/settlers'

interface TileMapProps {
  config: TileMapConfig
  className?: string
}

export const TileMap: React.FC<TileMapProps> = ({ config, className }) => {
  const { grid, selectedTile, generateMap, selectTile } = useTileStore()

  useEffect(() => {
    generateMap(config)
  }, [config.width, config.height, config.tileSize, config.seed, generateMap])

  const handleTileClick = (tile: Tile) => {
    if (selectedTile?.x === tile.x && selectedTile?.y === tile.y) {
      selectTile(null, null)
    } else {
      selectTile(tile.x, tile.y)
    }
  }

  // Calculate SVG viewBox to fit all tiles
  const viewBox = useMemo(() => {
    if (!grid) return '0 0 100 100'
    const { width, height, tileSize } = config
    const halfW = tileSize / 2
    const quarterH = tileSize / 4
    const maxHeightOffset = 20

    // Isometric bounds
    const minX = -(height - 1) * halfW
    const maxX = (width - 1) * halfW
    const minY = -maxHeightOffset
    const maxY = (width + height - 2) * quarterH + maxHeightOffset + 20

    const padding = tileSize
    return `${minX - padding} ${minY - padding} ${maxX - minX + 2 * padding} ${maxY - minY + 2 * padding}`
  }, [grid, config])

  if (!grid) {
    return <div className={className}>Generating map...</div>
  }

  // Render tiles back-to-front for correct overlap (painter's algorithm)
  const tiles: React.ReactNode[] = []
  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      const tile = grid[y][x]
      tiles.push(
        <IsometricTile
          key={`${x}-${y}`}
          tile={tile}
          tileSize={config.tileSize}
          isSelected={selectedTile?.x === x && selectedTile?.y === y}
          onClick={handleTileClick}
        />
      )
    }
  }

  return (
    <div className={className} data-testid="tile-map">
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%' }}
      >
        {tiles}
      </svg>
    </div>
  )
}
