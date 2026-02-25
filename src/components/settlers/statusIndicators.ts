/**
 * Status-Indikatoren für Buildings
 * Issue #56, AC4-6: Status-Visualisierung
 *
 * AC4: "active" - Normales Rendering (keine Indikatoren)
 * AC5: "has_issues" - Baugerüst + Issue-Badge
 * AC6: "has_pr" - Fahnenmast + animierte Flagge
 */

import type { Building } from './types'

/**
 * Hauptfunktion: Zeichnet Status-Indikator basierend auf Building.status
 *
 * @param ctx - Canvas Context
 * @param building - Building-Objekt
 * @param screenX - X-Position auf Canvas
 * @param screenY - Y-Position auf Canvas
 * @param voxelSize - Größe eines Voxels in Pixeln
 * @param timestamp - Aktueller Timestamp für Animationen (ms)
 */
export function drawStatusIndicator(
  ctx: CanvasRenderingContext2D,
  building: Building,
  screenX: number,
  screenY: number,
  voxelSize: number,
  timestamp: number
): void {
  switch (building.status) {
    case 'active':
      // AC4: Keine Indikatoren für aktive Projekte
      break

    case 'has_issues':
      // AC5: Baugerüst + Issue-Badge
      drawScaffold(ctx, screenX, screenY, voxelSize, building.height)
      drawIssueBadge(ctx, screenX, screenY - building.height * voxelSize - 20, building.issueCount)
      break

    case 'has_pr':
      // AC6: Fahnenmast + animierte Flagge
      drawFlagpole(ctx, screenX, screenY, voxelSize, building.height, timestamp)
      break
  }
}

/**
 * AC5: Zeichnet Baugerüst um das Gebäude
 *
 * @param ctx - Canvas Context
 * @param screenX - X-Position des Gebäudes
 * @param screenY - Y-Position des Gebäudes
 * @param voxelSize - Voxel-Größe
 * @param buildingHeight - Höhe des Gebäudes in Voxeln
 */
export function drawScaffold(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  voxelSize: number,
  buildingHeight: number
): void {
  const scaffoldColor = '#8B4513' // Braun (Holz)
  const halfVoxel = voxelSize / 2

  // Berechne Gebäude-Dimensionen (3x3 Grundfläche)
  const buildingWidth = voxelSize * 3
  const buildingDepth = voxelSize * 3
  const totalHeight = buildingHeight * halfVoxel

  // Vertikale Pfosten (4 Ecken)
  const posts = [
    { x: screenX - buildingWidth / 2, y: screenY },
    { x: screenX + buildingWidth / 2, y: screenY },
    { x: screenX, y: screenY - buildingDepth / 2 },
    { x: screenX, y: screenY + buildingDepth / 2 }
  ]

  ctx.strokeStyle = scaffoldColor
  ctx.lineWidth = 2

  posts.forEach(post => {
    ctx.beginPath()
    ctx.moveTo(post.x, post.y)
    ctx.lineTo(post.x, post.y - totalHeight - 10)
    ctx.stroke()
  })

  // Horizontale Streben (2 Ebenen)
  for (let i = 0; i < 2; i++) {
    const yOffset = -totalHeight * (0.3 + i * 0.4)

    ctx.beginPath()
    ctx.moveTo(posts[0].x, posts[0].y + yOffset)
    ctx.lineTo(posts[1].x, posts[1].y + yOffset)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(posts[2].x, posts[2].y + yOffset)
    ctx.lineTo(posts[3].x, posts[3].y + yOffset)
    ctx.stroke()
  }
}

/**
 * AC5: Zeichnet Issue-Badge mit Counter
 *
 * @param ctx - Canvas Context
 * @param x - X-Position
 * @param y - Y-Position
 * @param issueCount - Anzahl der Issues
 */
export function drawIssueBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  issueCount: number
): void {
  const badgeRadius = 12
  const badgeColor = '#E74C3C' // Rot

  // Badge-Kreis
  ctx.fillStyle = badgeColor
  ctx.beginPath()
  ctx.arc(x, y, badgeRadius, 0, Math.PI * 2)
  ctx.fill()

  // Weißer Rand
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2
  ctx.stroke()

  // Issue-Count als Text
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 12px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(issueCount.toString(), x, y)
}

/**
 * AC6: Zeichnet Fahnenmast mit animierter Flagge
 *
 * @param ctx - Canvas Context
 * @param screenX - X-Position des Gebäudes
 * @param screenY - Y-Position des Gebäudes
 * @param voxelSize - Voxel-Größe
 * @param buildingHeight - Höhe des Gebäudes in Voxeln
 * @param timestamp - Aktueller Timestamp für Animation (ms)
 */
export function drawFlagpole(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  voxelSize: number,
  buildingHeight: number,
  timestamp: number
): void {
  const poleColor = '#7F8C8D' // Grau (Metall)
  const flagColor = '#2ECC71' // Grün (PR = ready to merge)

  const halfVoxel = voxelSize / 2
  const poleHeight = buildingHeight * halfVoxel + 20
  const flagWidth = 20
  const flagHeight = 12

  // Fahnenmast (vertikal)
  ctx.strokeStyle = poleColor
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(screenX, screenY)
  ctx.lineTo(screenX, screenY - poleHeight)
  ctx.stroke()

  // Animierte Flagge
  const flagY = screenY - poleHeight + 5
  const waveOffset = getAnimatedFlagOffset(timestamp)

  ctx.fillStyle = flagColor
  ctx.beginPath()
  ctx.moveTo(screenX, flagY)
  ctx.lineTo(screenX + flagWidth + waveOffset, flagY)
  ctx.lineTo(screenX + flagWidth + waveOffset, flagY + flagHeight)
  ctx.lineTo(screenX, flagY + flagHeight)
  ctx.closePath()
  ctx.fill()

  // Flaggen-Rand
  ctx.strokeStyle = '#27AE60' // Dunkler Grün
  ctx.lineWidth = 1
  ctx.stroke()
}

/**
 * AC6: Berechnet animierten Offset für Flaggen-Wellen-Effekt
 *
 * Sinuswelle mit Periode ~2000ms
 *
 * @param timestamp - Aktueller Timestamp (ms)
 * @returns Offset zwischen -2 und 2 Pixeln
 */
export function getAnimatedFlagOffset(timestamp: number): number {
  const period = 2000 // 2 Sekunden pro Zyklus
  const amplitude = 2 // ±2 Pixel

  // Sinuswelle: sin(2π * t / T) * A
  return Math.sin((2 * Math.PI * timestamp) / period) * amplitude
}
