/**
 * Building Component
 * Issue #56, AC7: Building-Click-Event
 *
 * Rendert ein anklickbares Gebäude auf dem Canvas und dispatcht Custom Events
 */

import React, { useEffect, useRef } from 'react'
import type { Building as BuildingType } from './types'
import { drawBuilding } from './BuildingRenderer'
import { drawStatusIndicator } from './statusIndicators'

export interface BuildingProps {
  /** Building-Daten */
  building: BuildingType
  /** Canvas Context (vom Parent) */
  ctx: CanvasRenderingContext2D | null
  /** Screen-Position X */
  screenX: number
  /** Screen-Position Y */
  screenY: number
  /** Voxel-Größe */
  voxelSize: number
  /** Timestamp für Animationen */
  timestamp: number
  /** Callback bei Click */
  onClick?: (building: BuildingType) => void
}

/**
 * Building Component (Render-Only)
 * Rendert Building auf vorhandenem Canvas-Context
 */
export const BuildingRenderer: React.FC<BuildingProps> = ({
  building,
  ctx,
  screenX,
  screenY,
  voxelSize,
  timestamp,
  onClick
}) => {
  useEffect(() => {
    if (!ctx) return

    // Render Building
    drawBuilding(ctx, building, screenX, screenY, voxelSize)

    // Render Status-Indikator
    drawStatusIndicator(ctx, building, screenX, screenY, voxelSize, timestamp)
  }, [ctx, building, screenX, screenY, voxelSize, timestamp])

  return null // Canvas-only Rendering
}

/**
 * Prüft, ob ein Punkt innerhalb eines Buildings liegt
 * (für Hit-Detection)
 *
 * @param mouseX - Maus X-Koordinate (Screen-Space)
 * @param mouseY - Maus Y-Koordinate (Screen-Space)
 * @param building - Building-Objekt
 * @param screenX - Building Screen-Position X
 * @param screenY - Building Screen-Position Y
 * @param voxelSize - Voxel-Größe
 * @returns true wenn Maus über Building
 */
export function isPointInsideBuilding(
  mouseX: number,
  mouseY: number,
  building: BuildingType,
  screenX: number,
  screenY: number,
  voxelSize: number
): boolean {
  // Einfache Bounding-Box Hit-Detection
  // Building: 3x3 Grundfläche + Höhe

  const buildingWidth = voxelSize * 3
  const buildingHeight = building.height * voxelSize

  const left = screenX - buildingWidth / 2
  const right = screenX + buildingWidth / 2
  const top = screenY - buildingHeight
  const bottom = screenY + voxelSize

  return (
    mouseX >= left &&
    mouseX <= right &&
    mouseY >= top &&
    mouseY <= bottom
  )
}

/**
 * Dispatcht Custom Event für Building-Click
 *
 * @param building - Building-Objekt
 */
export function dispatchBuildingClickEvent(building: BuildingType): void {
  const event = new CustomEvent('buildingClick', {
    detail: {
      id: building.id,
      projectName: building.projectName,
      position: building.position,
      status: building.status,
      height: building.height,
      issueCount: building.issueCount,
      prCount: building.prCount,
      color: building.color
    }
  })

  window.dispatchEvent(event)
}
