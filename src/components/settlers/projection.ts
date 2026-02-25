/**
 * Isometrische Projektions-Funktionen
 * Issue #53, AC2: Isometrische Projektion
 *
 * Formeln:
 * ISO_X = (x - y) * TILE_WIDTH / 2
 * ISO_Y = (x + y) * TILE_HEIGHT / 2
 */

import type { GridCoordinates, IsometricCoordinates, TileConfig, ViewportConfig } from './types'

/**
 * Konvertiert Grid-Koordinaten zu Isometrischen Bildschirm-Koordinaten
 *
 * @param grid - Grid-Koordinaten (0-9)
 * @param tileConfig - Tile-Abmessungen (64x32)
 * @returns Isometrische Pixel-Koordinaten
 *
 * @example
 * toIsometric({ x: 5, y: 5 }, { width: 64, height: 32 })
 * // => { isoX: 0, isoY: 160 }
 */
export function toIsometric(
  grid: GridCoordinates,
  tileConfig: TileConfig
): IsometricCoordinates {
  const { x, y } = grid
  const { width, height } = tileConfig

  const isoX = (x - y) * (width / 2)
  const isoY = (x + y) * (height / 2)

  return { isoX, isoY }
}

/**
 * Konvertiert Isometrische Bildschirm-Koordinaten zurück zu Grid-Koordinaten (Inverse Projektion)
 *
 * @param iso - Isometrische Pixel-Koordinaten
 * @param tileConfig - Tile-Abmessungen (64x32)
 * @returns Grid-Koordinaten (0-9)
 *
 * @example
 * toGrid({ isoX: 0, isoY: 160 }, { width: 64, height: 32 })
 * // => { x: 5, y: 5 }
 */
export function toGrid(
  iso: IsometricCoordinates,
  tileConfig: TileConfig
): GridCoordinates {
  const { isoX, isoY } = iso
  const { width, height } = tileConfig

  // Inverse Formeln:
  // x = (isoX / (width/2) + isoY / (height/2)) / 2
  // y = (isoY / (height/2) - isoX / (width/2)) / 2

  const halfWidth = width / 2
  const halfHeight = height / 2

  const x = Math.round((isoX / halfWidth + isoY / halfHeight) / 2)
  const y = Math.round((isoY / halfHeight - isoX / halfWidth) / 2)

  return { x, y }
}

/**
 * Erstellt Viewport-Konfiguration mit Kamera-Zentrierung
 *
 * AC4: Kamera zeigt Grid-Zentrum (5, 5)
 * Die Offsets werden so berechnet, dass Grid (5,5) in der Canvas-Mitte liegt
 *
 * @param canvasWidth - Canvas-Breite in Pixel
 * @param canvasHeight - Canvas-Höhe in Pixel
 * @param tileConfig - Tile-Abmessungen
 * @param gridSize - Grid-Größe (default: 10 für 10x10)
 * @returns Viewport-Konfiguration mit Offsets
 *
 * @example
 * createViewport(1920, 1080, { width: 64, height: 32 }, 10)
 * // => { width: 1920, height: 1080, offsetX: 960, offsetY: 380 }
 */
export function createViewport(
  canvasWidth: number,
  canvasHeight: number,
  tileConfig: TileConfig,
  gridSize: number = 10
): ViewportConfig {
  // Grid-Zentrum (für 10x10 Grid ist das 5,5)
  const centerGrid: GridCoordinates = {
    x: Math.floor(gridSize / 2),
    y: Math.floor(gridSize / 2)
  }

  // Isometrische Position des Zentrums
  const centerIso = toIsometric(centerGrid, tileConfig)

  // Offsets berechnen, um Zentrum in Canvas-Mitte zu platzieren
  const offsetX = canvasWidth / 2 - centerIso.isoX
  const offsetY = canvasHeight / 2 - centerIso.isoY

  return {
    width: canvasWidth,
    height: canvasHeight,
    offsetX,
    offsetY
  }
}

/**
 * Konvertiert Isometrische Koordinaten zu Canvas-Bildschirm-Koordinaten (mit Viewport-Offset)
 *
 * @param iso - Isometrische Koordinaten
 * @param viewport - Viewport-Konfiguration
 * @returns Bildschirm-Koordinaten auf dem Canvas
 */
export function toScreen(
  iso: IsometricCoordinates,
  viewport: ViewportConfig
): { screenX: number; screenY: number } {
  return {
    screenX: iso.isoX + viewport.offsetX,
    screenY: iso.isoY + viewport.offsetY
  }
}

/**
 * Konvertiert Canvas-Bildschirm-Koordinaten zu Grid-Koordinaten (mit Viewport-Offset)
 *
 * Nützlich für Maus-Events (Click/Hover)
 *
 * @param screenX - X-Position auf Canvas
 * @param screenY - Y-Position auf Canvas
 * @param viewport - Viewport-Konfiguration
 * @param tileConfig - Tile-Abmessungen
 * @returns Grid-Koordinaten (kann außerhalb 0-9 liegen)
 */
export function screenToGrid(
  screenX: number,
  screenY: number,
  viewport: ViewportConfig,
  tileConfig: TileConfig
): GridCoordinates {
  // Entferne Viewport-Offset
  const isoX = screenX - viewport.offsetX
  const isoY = screenY - viewport.offsetY

  // Konvertiere zu Grid
  return toGrid({ isoX, isoY }, tileConfig)
}
