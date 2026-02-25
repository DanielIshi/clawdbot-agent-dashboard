/**
 * IsometricTile - Renders a single isometric tile with terrain coloring and height
 */
import React from 'react'
import type { Tile, TerrainConfig } from '../../types/settlers'
import { TERRAIN_CONFIGS } from '../../types/settlers'
import { tileToScreenPosition } from '../../settlers/tileUtils'

interface IsometricTileProps {
  tile: Tile
  tileSize: number
  maxHeightOffset?: number
  isSelected?: boolean
  onClick?: (tile: Tile) => void
}

/**
 * Generate SVG path for an isometric diamond shape.
 * Diamond vertices: top, right, bottom, left
 */
function isoDiamondPath(halfW: number, halfH: number): string {
  return `M 0 ${-halfH} L ${halfW} 0 L 0 ${halfH} L ${-halfW} 0 Z`
}

/**
 * Darken a hex color by a factor (0-1, where 0 = black, 1 = unchanged).
 */
function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const dr = Math.round(r * factor)
  const dg = Math.round(g * factor)
  const db = Math.round(b * factor)
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`
}

export const IsometricTile: React.FC<IsometricTileProps> = ({
  tile,
  tileSize,
  maxHeightOffset = 20,
  isSelected = false,
  onClick,
}) => {
  const config: TerrainConfig = TERRAIN_CONFIGS[tile.terrain]
  const screen = tileToScreenPosition(tile, tileSize, maxHeightOffset)
  const halfW = tileSize / 2
  const halfH = tileSize / 4

  // Height creates a 3D extrusion effect
  const extrudeHeight = tile.height * maxHeightOffset
  const topColor = config.color
  const sideColor = darkenColor(config.color, 0.7)

  // Side face path (left side of extrusion)
  const leftSidePath = `M ${-halfW} 0 L 0 ${halfH} L 0 ${halfH + extrudeHeight} L ${-halfW} ${extrudeHeight} Z`
  // Side face path (right side of extrusion)
  const rightSidePath = `M ${halfW} 0 L 0 ${halfH} L 0 ${halfH + extrudeHeight} L ${halfW} ${extrudeHeight} Z`

  return (
    <g
      transform={`translate(${screen.screenX}, ${screen.screenY})`}
      onClick={() => onClick?.(tile)}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      data-testid={`tile-${tile.x}-${tile.y}`}
      role="button"
      aria-label={`${config.label} Tile at ${tile.x},${tile.y}`}
    >
      {/* Side faces (3D extrusion) */}
      {extrudeHeight > 0 && (
        <>
          <path d={leftSidePath} fill={darkenColor(config.color, 0.5)} />
          <path d={rightSidePath} fill={sideColor} />
        </>
      )}

      {/* Top face (isometric diamond) */}
      <path
        d={isoDiamondPath(halfW, halfH)}
        fill={topColor}
        stroke={isSelected ? '#fff' : darkenColor(config.color, 0.6)}
        strokeWidth={isSelected ? 2 : 0.5}
        opacity={tile.terrain === 'water' ? 0.85 : 1}
      />

      {/* Selection highlight */}
      {isSelected && (
        <path
          d={isoDiamondPath(halfW - 2, halfH - 1)}
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={1}
          strokeDasharray="4 2"
        />
      )}
    </g>
  )
}
