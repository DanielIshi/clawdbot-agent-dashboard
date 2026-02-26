/**
 * SettlersWorldView - Isometric world connected to real tmux sessions
 * 1 building per tmux session, 1 agent figure per session
 * Speech bubbles show live tmux output activity
 */
import React, { useRef, useEffect, useState, useMemo } from 'react'
import { createViewport, toIsometric, toScreen } from './projection'
import { drawBuilding } from './BuildingRenderer'
import { drawVoxelSprite, createAgentVoxels } from './VoxelRenderer'
import { projectNameToColor } from './colorHash'
import type { Building, TileConfig } from './types'
import { useSessionOutputDiff, type SessionActivity } from './useSessionOutputDiff'
import type { BubbleType } from './useSessionOutputDiff'

const TILE_CONFIG: TileConfig = { width: 64, height: 32 }
const GRID_SIZE = 10
const VOXEL_SIZE = 14

// Bubble lifetime constants (ms)
const BUBBLE_FADE_IN = 500
const BUBBLE_VISIBLE = 5500
const BUBBLE_FADE_OUT = 500
const BUBBLE_TOTAL = BUBBLE_FADE_IN + BUBBLE_VISIBLE + BUBBLE_FADE_OUT

// Predefined building slots spread across the grid
const BUILDING_SLOTS = [
  { x: 2, y: 2 }, { x: 7, y: 2 }, { x: 2, y: 7 }, { x: 7, y: 7 },
  { x: 4, y: 4 }, { x: 6, y: 4 }, { x: 4, y: 6 }, { x: 6, y: 6 },
]

// Agent stands just in front of (beside) their building
const AGENT_SLOTS = [
  { x: 3, y: 3 }, { x: 8, y: 3 }, { x: 3, y: 8 }, { x: 8, y: 8 },
  { x: 5, y: 4 }, { x: 7, y: 4 }, { x: 5, y: 6 }, { x: 7, y: 6 },
]

interface TmuxSession {
  agent: string
  tmux_id: string
  started: string
  project: string
}

function agentTypeColor(agentName: string): string {
  const n = agentName.toLowerCase()
  if (n.includes('claude')) return '#36c37c'
  if (n.includes('codex')) return '#4b8bff'
  if (n.includes('gemini')) return '#a855f7'
  if (n.includes('gpt')) return '#ff6b6b'
  if (n.includes('opencode')) return '#f97316'
  if (n.includes('jules')) return '#ef4444'
  return '#f4d03f'
}

function drawGrassTile(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tc: TileConfig,
  hovered: boolean
) {
  const hw = tc.width / 2
  const hh = tc.height / 2
  ctx.beginPath()
  ctx.moveTo(cx, cy - hh)
  ctx.lineTo(cx + hw, cy)
  ctx.lineTo(cx, cy + hh)
  ctx.lineTo(cx - hw, cy)
  ctx.closePath()
  ctx.fillStyle = hovered ? '#90EE90' : '#5a8a3c'
  ctx.fill()
  ctx.strokeStyle = '#3d6128'
  ctx.lineWidth = 0.5
  ctx.stroke()
}

function drawNameLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number
) {
  const truncated = text.length > 18 ? text.slice(0, 16) + '…' : text
  ctx.font = 'bold 10px monospace'
  const w = ctx.measureText(truncated).width + 8
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.fillRect(x - w / 2, y - 14, w, 16)
  ctx.fillStyle = '#e2e8f0'
  ctx.textAlign = 'center'
  ctx.fillText(truncated, x, y - 2)
}

/**
 * Draws a canvas-native multi-line speech bubble above the agent figure.
 * No DOM overlay needed — canvas-native avoids z-index / coordinate sync issues.
 */
function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  lines: string[],  // Multi-line content
  cx: number,       // center X (agent position)
  cy: number,       // top Y (above agent figure)
  opacity: number,
  type: BubbleType
) {
  if (opacity <= 0 || lines.length === 0) return

  ctx.save()
  ctx.globalAlpha = opacity

  const fontSize = 11
  const lineHeight = fontSize + 5
  const paddingX = 10
  const paddingY = 8
  const arrowSize = 7
  const radius = 6

  ctx.font = `${fontSize}px monospace`

  // Breite = längste Zeile (min 120px, max 280px)
  const maxLineWidth = Math.min(280, Math.max(120,
    ...lines.map(l => ctx.measureText(l).width)
  ))
  const bubbleW = maxLineWidth + paddingX * 2
  const bubbleH = lines.length * lineHeight + paddingY * 2

  const bubbleX = cx - bubbleW / 2
  const bubbleY = cy - bubbleH - arrowSize - 14  // 14px Abstand über Figur

  // Bubble außerhalb Canvas nach oben begrenzen
  const clampedBubbleY = Math.max(4, bubbleY)

  // Border color by type
  const borderColor: Record<BubbleType, string> = {
    input: '#3b82f6',
    tool: '#f97316',
    output: '#22c55e',
  }

  const bgColor: Record<BubbleType, string> = {
    input: 'rgba(239, 246, 255, 0.96)',
    tool: 'rgba(255, 247, 237, 0.96)',
    output: 'rgba(240, 253, 244, 0.96)',
  }

  // Rounded rect path
  const bx = bubbleX
  const by = clampedBubbleY
  const bw = bubbleW
  const bh = bubbleH

  ctx.beginPath()
  ctx.moveTo(bx + radius, by)
  ctx.lineTo(bx + bw - radius, by)
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius)
  ctx.lineTo(bx + bw, by + bh - radius)
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh)

  // Pfeil nach unten nur wenn Bubble nicht nach oben geclamt
  if (clampedBubbleY === bubbleY) {
    ctx.lineTo(cx + arrowSize, by + bh)
    ctx.lineTo(cx, by + bh + arrowSize)
    ctx.lineTo(cx - arrowSize, by + bh)
  }

  ctx.lineTo(bx + radius, by + bh)
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius)
  ctx.lineTo(bx, by + radius)
  ctx.quadraticCurveTo(bx, by, bx + radius, by)
  ctx.closePath()

  // Schatten
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2

  ctx.fillStyle = bgColor[type]
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  ctx.strokeStyle = borderColor[type]
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Typ-Indikator: farbiger linker Balken
  ctx.fillStyle = borderColor[type]
  ctx.fillRect(bx, by + radius, 3, bh - radius * 2)

  // Text zeilenweise rendern
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  lines.forEach((line, i) => {
    // Erste Zeile in Farbe (Typ-Hinweis), Rest dunkelgrau
    ctx.fillStyle = i === 0 ? borderColor[type] : '#374151'
    ctx.font = i === 0 ? `bold ${fontSize}px monospace` : `${fontSize}px monospace`
    ctx.fillText(line, bx + paddingX + 4, by + paddingY + i * lineHeight)
  })

  ctx.restore()
}

/**
 * Compute bubble opacity based on elapsed time since bubble appeared.
 * Returns 0 when bubble should no longer be drawn.
 */
function bubbleOpacity(startTs: number, now: number): number {
  const elapsed = now - startTs
  if (elapsed < 0 || elapsed >= BUBBLE_TOTAL) return 0
  if (elapsed < BUBBLE_FADE_IN) return elapsed / BUBBLE_FADE_IN
  if (elapsed < BUBBLE_FADE_IN + BUBBLE_VISIBLE) return 1
  const fadeElapsed = elapsed - BUBBLE_FADE_IN - BUBBLE_VISIBLE
  return 1 - fadeElapsed / BUBBLE_FADE_OUT
}

export const SettlersWorldView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sessions, setSessions] = useState<TmuxSession[]>([])
  const animRef = useRef<number>()

  // Stable session names array for hook dependency
  const sessionNames = useMemo(
    () => sessions.slice(0, BUILDING_SLOTS.length).map(s => s.agent),
    [sessions]
  )

  // Poll tmux output diffs per session
  const activities = useSessionOutputDiff(sessionNames)

  // Track bubble state per session (persists across renders via ref)
  const bubblesRef = useRef<Map<string, SessionActivity>>(new Map())

  // Sync new activities into bubblesRef
  useEffect(() => {
    activities.forEach((activity, name) => {
      bubblesRef.current.set(name, activity)
    })
  }, [activities])

  // Fetch sessions every 5s
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/tmux-sessions')
        if (res.ok) setSessions(await res.json())
      } catch { /* ignore */ }
    }
    load()
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [])

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      const parent = canvas.parentElement
      canvas.width = parent?.clientWidth || 800
      canvas.height = 560
    }
    updateSize()
    window.addEventListener('resize', updateSize)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = (timestamp: number) => {
      const now = Date.now()
      const vp = createViewport(canvas.width, canvas.height, TILE_CONFIG, GRID_SIZE)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw sky background
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
      grad.addColorStop(0, '#0f172a')
      grad.addColorStop(1, '#1e293b')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw ground tiles (back to front for proper overlap)
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const iso = toIsometric({ x, y }, TILE_CONFIG)
          const sc = toScreen(iso, vp)
          drawGrassTile(ctx, sc.screenX, sc.screenY, TILE_CONFIG, false)
        }
      }

      // Draw buildings + agents + speech bubbles for each session
      sessions.slice(0, BUILDING_SLOTS.length).forEach((session, i) => {
        const bPos = BUILDING_SLOTS[i]
        const aPos = AGENT_SLOTS[i]

        // Building
        const building: Building = {
          id: session.tmux_id,
          projectName: session.agent,
          position: bPos,
          color: projectNameToColor(session.agent),
          status: 'active',
          height: 4,
          issueCount: 0,
          prCount: 0,
        }
        const bIso = toIsometric(bPos, TILE_CONFIG)
        const bSc = toScreen(bIso, vp)
        drawBuilding(ctx, building, bSc.screenX, bSc.screenY, VOXEL_SIZE)

        // Name label above building
        const labelY = bSc.screenY - building.height * VOXEL_SIZE - 10
        drawNameLabel(ctx, session.agent, bSc.screenX, labelY)

        // Agent figure with bob animation
        const agentColor = agentTypeColor(session.agent)
        const agentVoxels = createAgentVoxels(agentColor)
        const aIso = toIsometric(aPos, TILE_CONFIG)
        const aSc = toScreen(aIso, vp)
        const bob = Math.sin(timestamp / 500 + i * 1.3) * 3
        const agentTopY = aSc.screenY + bob
        drawVoxelSprite(ctx, aSc.screenX, agentTopY, agentVoxels, VOXEL_SIZE * 0.65)

        // Speech bubble — if there's a recent activity for this session
        const activity = bubblesRef.current.get(session.agent)
        if (activity) {
          const opacity = bubbleOpacity(activity.ts, now)
          if (opacity > 0) {
            drawSpeechBubble(ctx, activity.lines, aSc.screenX, agentTopY - 28, opacity, activity.type)
          }
        }
      })

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => {
      window.removeEventListener('resize', updateSize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [sessions])

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        className="block w-full rounded-lg"
        style={{ imageRendering: 'pixelated' }}
      />
      {sessions.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 pointer-events-none">
          <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <p className="text-sm">Keine aktiven Sessions</p>
          <p className="text-xs mt-1 text-gray-600">Starte einen Agent im Tmux Live Tab</p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-3 right-3 bg-gray-900/80 border border-gray-700 rounded-lg p-3 text-xs">
        <div className="text-gray-400 font-semibold mb-2">Legende</div>
        {[
          { color: '#36c37c', label: 'Claude' },
          { color: '#4b8bff', label: 'Codex' },
          { color: '#a855f7', label: 'Gemini' },
          { color: '#f97316', label: 'OpenCode' },
          { color: '#f4d03f', label: 'Andere' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-gray-300">{label}</span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t border-gray-700 text-gray-500">
          {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
        </div>
        {/* Bubble type legend */}
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="text-gray-400 font-semibold mb-1">Sprechblasen</div>
          {[
            { color: '#3b82f6', label: 'User-Input' },
            { color: '#f97316', label: 'Tool-Call' },
            { color: '#22c55e', label: 'Agent-Output' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: color + '33', borderColor: color }} />
              <span className="text-gray-300">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
