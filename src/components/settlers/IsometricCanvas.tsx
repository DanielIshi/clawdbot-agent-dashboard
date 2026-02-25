/**
 * IsometricCanvas Component
 * Issue #53: Isometrische Canvas-Basis mit Grid-System
 *
 * AC1: Canvas Setup mit Rendering Loop (30 FPS minimum)
 * AC3: Grid-Rendering (10x10 Tiles)
 * AC4: Kamera-Zentrierung auf Grid (5,5)
 * AC5: Responsive Design
 */

import React, { useRef, useEffect, useState } from 'react'
import { createViewport, toIsometric, toScreen, screenToGrid } from './projection'
import type { TileConfig, ViewportConfig, GridCoordinates, Tile, TileType, PerformanceMetrics } from './types'

const TILE_CONFIG: TileConfig = {
  width: 64,
  height: 32
}

const GRID_SIZE = 10

/**
 * Generiert Initial-Grid (10x10 Gras-Tiles)
 * Tile-Typen werden in Issue #54 implementiert
 */
function generateGrid(): Tile[] {
  const tiles: Tile[] = []
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      tiles.push({
        coords: { x, y },
        type: 'grass' as TileType
      })
    }
  }
  return tiles
}

interface IsometricCanvasProps {
  /** Canvas-Breite (default: 100% parent) */
  width?: number
  /** Canvas-Höhe (default: 600px) */
  height?: number
  /** Debug-Modus (zeigt FPS, Grid-Koordinaten) */
  debug?: boolean
  /** Callback bei Tile-Click */
  onTileClick?: (coords: GridCoordinates) => void
}

export const IsometricCanvas: React.FC<IsometricCanvasProps> = ({
  width,
  height = 600,
  debug = false,
  onTileClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [viewport, setViewport] = useState<ViewportConfig | null>(null)
  const [hoveredTile, setHoveredTile] = useState<GridCoordinates | null>(null)
  const [performance, setPerformance] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryMB: 0
  })

  const tiles = useRef<Tile[]>(generateGrid())
  const animationFrameRef = useRef<number>()
  const lastFrameTimeRef = useRef<number>(0)
  const frameCountRef = useRef<number>(0)
  const fpsUpdateTimeRef = useRef<number>(0)

  // Responsive Canvas-Größe
  useEffect(() => {
    const updateSize = () => {
      if (!canvasRef.current) return

      const parent = canvasRef.current.parentElement
      const newWidth = width || parent?.clientWidth || 800
      const newHeight = height

      canvasRef.current.width = newWidth
      canvasRef.current.height = newHeight

      setViewport(createViewport(newWidth, newHeight, TILE_CONFIG, GRID_SIZE))
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [width, height])

  // Rendering Loop
  useEffect(() => {
    if (!canvasRef.current || !viewport) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = (timestamp: number) => {
      // FPS-Berechnung
      const deltaTime = timestamp - lastFrameTimeRef.current
      lastFrameTimeRef.current = timestamp
      frameCountRef.current++

      // FPS jede Sekunde aktualisieren
      if (timestamp - fpsUpdateTimeRef.current >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / (timestamp - fpsUpdateTimeRef.current))
        const memoryMB = (performance as any).memory
          ? Math.round(((performance as any).memory.usedJSHeapSize / 1024 / 1024) * 10) / 10
          : 0

        setPerformance({
          fps,
          frameTime: Math.round(deltaTime * 10) / 10,
          memoryMB
        })

        frameCountRef.current = 0
        fpsUpdateTimeRef.current = timestamp
      }

      // Canvas leeren
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Grid rendern
      renderGrid(ctx, tiles.current, viewport, hoveredTile, debug)

      // Nächster Frame
      animationFrameRef.current = requestAnimationFrame(render)
    }

    animationFrameRef.current = requestAnimationFrame(render)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [viewport, hoveredTile, debug])

  // Maus-Events
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!viewport) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const gridCoords = screenToGrid(mouseX, mouseY, viewport, TILE_CONFIG)

    // Nur Tiles im gültigen Bereich (0-9)
    if (gridCoords.x >= 0 && gridCoords.x < GRID_SIZE &&
        gridCoords.y >= 0 && gridCoords.y < GRID_SIZE) {
      setHoveredTile(gridCoords)
    } else {
      setHoveredTile(null)
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!viewport) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const gridCoords = screenToGrid(mouseX, mouseY, viewport, TILE_CONFIG)

    if (gridCoords.x >= 0 && gridCoords.x < GRID_SIZE &&
        gridCoords.y >= 0 && gridCoords.y < GRID_SIZE) {
      onTileClick?.(gridCoords)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{
          display: 'block',
          cursor: hoveredTile ? 'pointer' : 'default',
          border: debug ? '1px solid #ccc' : 'none'
        }}
      />

      {/* Debug-Overlay */}
      {debug && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: 4,
          fontFamily: 'monospace',
          fontSize: 12,
          pointerEvents: 'none'
        }}>
          <div>FPS: {performance.fps} ({performance.frameTime}ms)</div>
          <div>Memory: {performance.memoryMB} MB</div>
          {hoveredTile && (
            <div>Tile: ({hoveredTile.x}, {hoveredTile.y})</div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Rendert das Grid auf dem Canvas
 */
function renderGrid(
  ctx: CanvasRenderingContext2D,
  tiles: Tile[],
  viewport: ViewportConfig,
  hoveredTile: GridCoordinates | null,
  debug: boolean
) {
  tiles.forEach((tile) => {
    const iso = toIsometric(tile.coords, TILE_CONFIG)
    const screen = toScreen(iso, viewport)

    // Tile-Farbe (Gras = Grün)
    const isHovered = hoveredTile &&
      hoveredTile.x === tile.coords.x &&
      hoveredTile.y === tile.coords.y

    const fillColor = isHovered ? '#90EE90' : '#7CFC00'
    const strokeColor = '#228B22'

    // Isometrische Raute zeichnen
    drawIsometricTile(ctx, screen.screenX, screen.screenY, TILE_CONFIG, fillColor, strokeColor)

    // Debug: Grid-Koordinaten anzeigen
    if (debug) {
      ctx.fillStyle = 'black'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`${tile.coords.x},${tile.coords.y}`, screen.screenX, screen.screenY + 5)
    }
  })
}

/**
 * Zeichnet ein isometrisches Tile (Raute)
 */
function drawIsometricTile(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  tileConfig: TileConfig,
  fillColor: string,
  strokeColor: string
) {
  const halfWidth = tileConfig.width / 2
  const halfHeight = tileConfig.height / 2

  ctx.beginPath()
  ctx.moveTo(centerX, centerY - halfHeight)          // Oben
  ctx.lineTo(centerX + halfWidth, centerY)           // Rechts
  ctx.lineTo(centerX, centerY + halfHeight)          // Unten
  ctx.lineTo(centerX - halfWidth, centerY)           // Links
  ctx.closePath()

  ctx.fillStyle = fillColor
  ctx.fill()

  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 1
  ctx.stroke()
}
