/**
 * Building Renderer
 * Issue #56, AC3: Building-Rendering
 *
 * Rendert Projekt-Gebäude als isometrische Voxel-Häuser mit Pyramiden-Dach
 */

import type { Building, VoxelBlock } from './types'
import { drawVoxel } from './VoxelRenderer'

/**
 * Erstellt Voxel-Array für ein Gebäude
 *
 * Gebäude-Struktur:
 * - 3x3 Grundfläche
 * - Höhe: 3-6 Voxel (aus building.height)
 * - Pyramiden-Dach (reduzierte Voxel nach oben)
 * - Farbe: building.color (aus colorHash)
 *
 * @param building - Building-Objekt
 * @returns Array von VoxelBlocks
 */
export function createBuildingVoxels(building: Building): VoxelBlock[] {
  const voxels: VoxelBlock[] = []
  const { color, height } = building

  // Konvertiere HSL zu Hex für Farb-Manipulationen
  const baseColor = hslToHex(color)

  // Wand-Farben (Schattierungen)
  const wallColor = baseColor
  const darkWallColor = darkenColor(baseColor, 0.2)
  const roofColor = darkenColor(baseColor, 0.3)

  // Gebäude-Wände (3x3 Grundfläche)
  const wallHeight = Math.max(2, height - 1) // Wände bis zur Dach-Ebene

  for (let z = 0; z < wallHeight; z++) {
    // Äußere Wände (Rand des 3x3 Grids)
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        // Nur Rand-Voxel (nicht die Mitte)
        const isEdge = x === -1 || x === 1 || y === -1 || y === 1

        if (isEdge) {
          const isCorner = (x === -1 || x === 1) && (y === -1 || y === 1)
          const voxelColor = isCorner ? darkWallColor : wallColor

          voxels.push({ x, y, z, color: voxelColor })
        }
      }
    }
  }

  // Pyramiden-Dach
  const roofLevel = wallHeight

  // Dach-Ebene 1: 3x3 (volle Abdeckung)
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      voxels.push({ x, y, z: roofLevel, color: roofColor })
    }
  }

  // Dach-Ebene 2: 2x2 (falls Höhe >= 4)
  if (height >= 4) {
    for (let x = -0.5; x <= 0.5; x++) {
      for (let y = -0.5; y <= 0.5; y++) {
        voxels.push({ x, y, z: roofLevel + 1, color: roofColor })
      }
    }
  }

  // Dach-Spitze: 1x1 (falls Höhe >= 5)
  if (height >= 5) {
    voxels.push({ x: 0, y: 0, z: roofLevel + 2, color: roofColor })
  }

  // Extra Spitze (falls Höhe = 6)
  if (height >= 6) {
    voxels.push({ x: 0, y: 0, z: roofLevel + 3, color: lightenColor(roofColor, 0.2) })
  }

  return voxels
}

/**
 * Zeichnet ein komplettes Gebäude
 *
 * @param ctx - Canvas Context
 * @param building - Building-Objekt
 * @param screenX - X-Position auf Canvas
 * @param screenY - Y-Position auf Canvas
 * @param voxelSize - Größe eines einzelnen Voxels in Pixeln
 */
export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  building: Building,
  screenX: number,
  screenY: number,
  voxelSize: number
): void {
  const voxels = createBuildingVoxels(building)

  // Sortiere Voxel nach Z (niedrig → hoch) für korrektes Overlap
  const sortedVoxels = [...voxels].sort((a, b) => {
    // Z-First Sorting (höhere Z-Werte später)
    if (a.z !== b.z) return a.z - b.z

    // Dann nach Y (isometrische Tiefe)
    if (a.y !== b.y) return a.y - b.y

    // Dann nach X
    return a.x - b.x
  })

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
 * Konvertiert HSL zu Hex
 */
function hslToHex(hsl: string): string {
  // Parse HSL: "hsl(240, 70%, 60%)"
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  if (!match) return '#3498db' // Fallback

  const h = parseInt(match[1]) / 360
  const s = parseInt(match[2]) / 100
  const l = parseInt(match[3]) / 100

  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l // Graustufen
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q

    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
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
