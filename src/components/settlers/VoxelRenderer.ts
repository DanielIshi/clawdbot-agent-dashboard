/**
 * Voxel Renderer
 * Issue #55, AC3: Voxel-Rendering (einfache 3x3x3 Blöcke)
 *
 * Rendert isometrische Voxel (3D-Würfel) auf 2D Canvas
 */

import type { VoxelBlock } from './types'
import { getAgentShadowColor } from './agentColors'

/**
 * Zeichnet einen einzelnen Voxel als isometrische Box
 *
 * Ein Voxel besteht aus 3 sichtbaren Flächen:
 * - Oberseite (Top)
 * - Linke Seite (Left)
 * - Rechte Seite (Right)
 *
 * @param ctx - Canvas Context
 * @param x - X-Position (Screen-Koordinate)
 * @param y - Y-Position (Screen-Koordinate)
 * @param size - Voxel-Größe in Pixeln
 * @param color - Hex-Farbe
 */
export function drawVoxel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
): void {
  const halfSize = size / 2

  // Verwende die exakte übergebene Farbe (AC2: Farbe wird als Voxel-Block-Color verwendet)
  ctx.fillStyle = color

  // Oberseite (Top) - Raute
  ctx.beginPath()
  ctx.moveTo(x, y)                        // Oben
  ctx.lineTo(x + halfSize, y + halfSize / 2)  // Rechts
  ctx.lineTo(x, y + halfSize)             // Unten
  ctx.lineTo(x - halfSize, y + halfSize / 2)  // Links
  ctx.closePath()
  ctx.fill()

  // Linke Seite (selbe Farbe)
  ctx.beginPath()
  ctx.moveTo(x, y + halfSize)             // Oben
  ctx.lineTo(x - halfSize, y + halfSize / 2)  // Links oben
  ctx.lineTo(x - halfSize, y + size)      // Links unten
  ctx.lineTo(x, y + size + halfSize / 2)  // Unten
  ctx.closePath()
  ctx.fill()

  // Rechte Seite (selbe Farbe)
  ctx.beginPath()
  ctx.moveTo(x, y + halfSize)             // Oben
  ctx.lineTo(x + halfSize, y + halfSize / 2)  // Rechts oben
  ctx.lineTo(x + halfSize, y + size)      // Rechts unten
  ctx.lineTo(x, y + size + halfSize / 2)  // Unten
  ctx.closePath()
  ctx.fill()
}

/**
 * Erstellt Voxel-Array für einen Agent-Sprite
 *
 * Agent-Struktur (3x3x3 Voxel):
 * - Kopf: 1x1x1 (oben, z=2)
 * - Körper: 2x2x1 (Mitte, z=1)
 * - Beine: 2x1x1 (unten, z=0)
 *
 * @param color - Basis-Farbe des Agents
 * @returns Array von VoxelBlocks
 */
export function createAgentVoxels(color: string): VoxelBlock[] {
  const voxels: VoxelBlock[] = []

  // Kopf (z=2) - 1x1x1 zentral
  voxels.push({ x: 0, y: 0, z: 2, color })

  // Körper (z=1) - 2x2x1
  voxels.push({ x: -0.5, y: -0.5, z: 1, color })
  voxels.push({ x: 0.5, y: -0.5, z: 1, color })
  voxels.push({ x: -0.5, y: 0.5, z: 1, color })
  voxels.push({ x: 0.5, y: 0.5, z: 1, color })

  // Beine (z=0) - 2 Voxel
  const legColor = darkenColor(color, 0.1) // Beine etwas dunkler
  voxels.push({ x: -0.5, y: 0, z: 0, color: legColor })
  voxels.push({ x: 0.5, y: 0, z: 0, color: legColor })

  return voxels
}

/**
 * Zeichnet einen kompletten Voxel-Sprite
 *
 * @param ctx - Canvas Context
 * @param screenX - X-Position auf Canvas
 * @param screenY - Y-Position auf Canvas
 * @param voxels - Array von VoxelBlocks
 * @param voxelSize - Größe eines einzelnen Voxels in Pixeln
 */
export function drawVoxelSprite(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  voxels: VoxelBlock[],
  voxelSize: number
): void {
  // Sortiere Voxel nach Z (niedrig → hoch) für korrektes Overlap
  const sortedVoxels = [...voxels].sort((a, b) => a.z - b.z)

  sortedVoxels.forEach(voxel => {
    // Berechne isometrische Position des Voxels
    const isoX = (voxel.x - voxel.y) * (voxelSize / 2)
    const isoY = (voxel.x + voxel.y) * (voxelSize / 4) - voxel.z * (voxelSize / 2)

    const finalX = screenX + isoX
    const finalY = screenY + isoY

    drawVoxel(ctx, finalX, finalY, voxelSize, voxel.color)
  })
}

/**
 * Macht eine Farbe heller
 */
function lightenColor(color: string, amount: number): string {
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  const newR = Math.min(255, Math.floor(r + (255 - r) * amount))
  const newG = Math.min(255, Math.floor(g + (255 - g) * amount))
  const newB = Math.min(255, Math.floor(b + (255 - b) * amount))

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

/**
 * Macht eine Farbe dunkler
 */
function darkenColor(color: string, amount: number): string {
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  const newR = Math.floor(r * (1 - amount))
  const newG = Math.floor(g * (1 - amount))
  const newB = Math.floor(b * (1 - amount))

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}
