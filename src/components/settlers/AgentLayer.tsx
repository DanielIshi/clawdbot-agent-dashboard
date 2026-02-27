/**
 * AgentLayer Component
 * Issue #55: Agent-Sprites auf isometrischem Grid
 *
 * AC1: Canvas-Overlay über IsometricCanvas (position: absolute)
 * AC3: Voxel-Rendering pro Agent
 * AC4/AC5: Idle- und Working-Animationen
 * AC7: Depth-Sorting (Y-Koordinate)
 */

import React, { useRef, useEffect } from 'react'
import type { AgentSprite, ViewportConfig, TileConfig } from './types'
import { toIsometric, toScreen } from './projection'
import { sortAgentsByDepth } from './agentSorting'
import { createAgentVoxels, drawVoxelSprite } from './VoxelRenderer'
import {
  calculateIdleOffset,
  calculateWorkingRotation
} from './animations'

// Voxel-Größe in Pixeln (wie in der Spezifikation definiert)
const VOXEL_SIZE = 8

// Tile-Konfiguration (muss mit IsometricCanvas übereinstimmen)
const TILE_CONFIG: TileConfig = {
  width: 64,
  height: 32
}

// Y-Offset-Skalierung für Working-Animation (Nicken auf Canvas-Y-Achse)
const WORKING_Y_SCALE = 0.15

interface AgentLayerProps {
  /** Array der darzustellenden Agent-Sprites */
  agents: AgentSprite[]
  /** Canvas-Viewport-Konfiguration (muss mit IsometricCanvas übereinstimmen) */
  viewport: ViewportConfig
  /** Canvas-Breite (default: parent-Breite) */
  width?: number
  /** Canvas-Höhe (default: 600px) */
  height?: number
  /** Agent-Namen unter Sprite anzeigen */
  showLabels?: boolean
}

/**
 * Zeichnet einen Agent als Voxel-Sprite auf den Canvas.
 *
 * Wendet Animations-Offset an (Idle: Y-Wackeln, Working: Nicken als Y-Versatz).
 *
 * @param ctx - Canvas 2D Rendering Context
 * @param x - Screen-X-Position des Agents
 * @param y - Screen-Y-Position des Agents
 * @param agent - AgentSprite mit Status, Farbe und Animations-State
 * @param currentTime - Aktueller Timestamp in Millisekunden
 */
export function drawAgentVoxels(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  agent: AgentSprite,
  currentTime: number = 0
): void {
  // Voxel-Struktur aus Agent-Farbe erstellen
  const voxels = createAgentVoxels(agent.color)

  let finalX = x
  let finalY = y

  if (agent.animation.type === 'idle') {
    // Idle: Sanftes Auf-/Ab-Schwingen (±2px auf Y-Achse)
    const offset = calculateIdleOffset(agent.animation, currentTime)
    finalY = y - offset.y  // Negativ, da Y-Achse nach unten wächst
  } else if (agent.animation.type === 'working') {
    // Working: Nicken als Y-Versatz simulieren (sin-wave nach vorne)
    const rotation = calculateWorkingRotation(agent.animation, currentTime)
    finalY = y + rotation.x * WORKING_Y_SCALE
  }
  // Walking: kein zusätzlicher Offset – Position wird extern interpoliert

  drawVoxelSprite(ctx, finalX, finalY, voxels, VOXEL_SIZE)
}

/**
 * AgentLayer rendert alle Agents als Voxel-Sprites in einem Canvas-Overlay.
 *
 * Das Canvas liegt mit `position: absolute` über dem IsometricCanvas und ist
 * für Maus-Events transparent (`pointer-events: none`).
 */
export const AgentLayer: React.FC<AgentLayerProps> = ({
  agents,
  viewport,
  width,
  height,
  showLabels = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>(0)

  // Canvas-Größe synchronisieren
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      // || statt ?? damit clientWidth=0 (jsdom) korrekt auf viewport.width fällt
      const resolvedWidth = width || canvas.parentElement?.clientWidth || viewport.width
      // Verwende viewport.height als primäre Höhenquelle (Overlay deckt gesamten Viewport ab)
      const resolvedHeight = height ?? viewport.height
      canvas.width = resolvedWidth
      canvas.height = resolvedHeight
    }

    updateSize()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateSize)
      if (canvas.parentElement) {
        observer.observe(canvas.parentElement)
      }
      return () => observer.disconnect()
    }
  }, [width, height, viewport.width, viewport.height, viewport.offsetX, viewport.offsetY])

  // Rendering-Loop mit requestAnimationFrame
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let active = true

    const render = (timestamp: number) => {
      if (!active) return

      // Canvas leeren (nur Agent-Layer – nicht das Grid darunter)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Depth-Sorting: Agents mit niedrigerer Y-Koordinate zuerst zeichnen
      const sorted = sortAgentsByDepth(agents)

      sorted.forEach((agent) => {
        // Isometrische Grid-Koordinaten → Screen-Koordinaten
        const iso = toIsometric(agent.position, TILE_CONFIG)
        const { screenX, screenY } = toScreen(iso, viewport)

        // Agent als Voxel-Sprite zeichnen
        drawAgentVoxels(ctx, screenX, screenY, agent, timestamp)

        // Optionaler Label unter dem Sprite
        if (showLabels) {
          ctx.fillStyle = 'white'
          ctx.font = '10px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(agent.name, screenX, screenY + 30)
        }
      })

      animationFrameRef.current = requestAnimationFrame(render)
    }

    animationFrameRef.current = requestAnimationFrame(render)

    return () => {
      active = false
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [agents, viewport, showLabels])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none'
      }}
    />
  )
}
