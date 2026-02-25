/**
 * Animation System für Agent-Sprites
 * Issue #55, AC4/AC5/AC6: Idle, Working, Walking Animationen
 */

import type { AnimationState, GridCoordinates } from './types'

// Animation-Dauer-Konstanten (in Millisekunden)
export const IDLE_ANIMATION_DURATION = 2000     // 2 Sekunden (AC4)
export const WORKING_ANIMATION_DURATION = 1000  // 1 Sekunde (AC5)
export const WALKING_ANIMATION_DURATION_PER_TILE = 1000  // 1 Sekunde pro Tile (AC6)

/**
 * Interface für Position-Offset (Y-Bewegung für Idle-Animation)
 */
export interface PositionOffset {
  x: number
  y: number
}

/**
 * Interface für Rotations-Winkel (Working-Animation)
 */
export interface Rotation {
  x: number  // Rotation um X-Achse (Nicken)
  y: number  // Rotation um Y-Achse (Drehen)
  z: number  // Rotation um Z-Achse (Rollen)
}

/**
 * Interface für Bein-Offsets (Walking-Animation)
 */
export interface LegOffset {
  left: number   // Y-Offset linkes Bein
  right: number  // Y-Offset rechtes Bein
}

/**
 * AC4: Berechnet Y-Offset für Idle-Animation (Atmen/Warten)
 *
 * Specs:
 * - Bewegung: ±2px auf/ab
 * - Dauer: 2 Sekunden Loop
 * - Easing: sin-wave (smooth)
 *
 * @param animState - Animation-State
 * @param currentTime - Aktuelle Zeit (ms)
 * @returns Position-Offset
 */
export function calculateIdleOffset(
  animState: AnimationState,
  currentTime: number
): PositionOffset {
  const elapsed = currentTime - animState.startTime
  const progress = (elapsed % IDLE_ANIMATION_DURATION) / IDLE_ANIMATION_DURATION

  // Sin-wave: 0 → 1 → 0 (smooth)
  // Bei progress=0: 0px
  // Bei progress=0.5: +2px (Peak)
  // Bei progress=1: 0px (Loop)
  // Verwende sin(progress * PI) für halbe Periode: 0 → Peak → 0
  const yOffset = Math.sin(progress * Math.PI) * 2

  return {
    x: 0,
    y: yOffset
  }
}

/**
 * AC5: Berechnet Rotation für Working-Animation (Hämmern/Tippen)
 *
 * Specs:
 * - "Nicken": Rotation um X-Achse
 * - Winkel: ±10°
 * - Dauer: 1 Sekunde Loop
 * - Rhythmisch, schnell
 *
 * @param animState - Animation-State
 * @param currentTime - Aktuelle Zeit (ms)
 * @returns Rotation-Winkel (Grad)
 */
export function calculateWorkingRotation(
  animState: AnimationState,
  currentTime: number
): Rotation {
  const elapsed = currentTime - animState.startTime
  const progress = (elapsed % WORKING_ANIMATION_DURATION) / WORKING_ANIMATION_DURATION

  // Sin-wave für rhythmisches Nicken
  // Bei progress=0.5: ±10° (max Rotation)
  // Verwende sin(progress * PI) für halbe Periode: 0 → Peak → 0
  const xRotation = Math.sin(progress * Math.PI) * 10

  return {
    x: xRotation,  // Nicken (Kopf nach vorne/hinten)
    y: 0,
    z: 0
  }
}

/**
 * AC6: Berechnet Position während Walking-Animation
 *
 * Specs:
 * - Lineare Bewegung von (x1, y1) zu (x2, y2)
 * - Dauer: 1 Sekunde pro Tile
 *
 * @param animState - Animation-State
 * @param currentTime - Aktuelle Zeit (ms)
 * @param from - Start-Position (Grid)
 * @param to - Ziel-Position (Grid)
 * @returns Aktuelle Position (interpoliert)
 */
export function calculateWalkingPosition(
  animState: AnimationState,
  currentTime: number,
  from: GridCoordinates,
  to: GridCoordinates
): GridCoordinates {
  const elapsed = currentTime - animState.startTime
  const distance = Math.abs(to.x - from.x) + Math.abs(to.y - from.y)
  const totalDuration = WALKING_ANIMATION_DURATION_PER_TILE * distance

  const progress = Math.min(1, elapsed / totalDuration)

  // Lineare Interpolation
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress
  }
}

/**
 * AC6: Berechnet Bein-Offsets für Walking-Animation
 *
 * Specs:
 * - Beine bewegen sich alternierend
 * - Rhythmische Bewegung
 *
 * @param animState - Animation-State
 * @param currentTime - Aktuelle Zeit (ms)
 * @returns Leg-Offsets (Y-Position relativ)
 */
export function calculateWalkingLegOffset(
  animState: AnimationState,
  currentTime: number
): LegOffset {
  const elapsed = currentTime - animState.startTime
  const progress = (elapsed % WALKING_ANIMATION_DURATION_PER_TILE) / WALKING_ANIMATION_DURATION_PER_TILE

  // Beine alternieren: links/rechts versetzt um 180°
  const leftLegOffset = Math.sin(progress * Math.PI * 2) * 2
  const rightLegOffset = Math.sin((progress + 0.5) * Math.PI * 2) * 2

  return {
    left: leftLegOffset,
    right: rightLegOffset
  }
}

/**
 * AC6: Berechnet Bewegungs-Richtung (8 Richtungen)
 *
 * @param from - Start-Position
 * @param to - Ziel-Position
 * @returns Richtungs-Code (N, NE, E, SE, S, SW, W, NW)
 */
export function calculateWalkingDirection(
  from: GridCoordinates,
  to: GridCoordinates
): string {
  const dx = to.x - from.x
  const dy = to.y - from.y

  // 8 Richtungen
  if (dx === 0 && dy < 0) return 'N'
  if (dx > 0 && dy < 0) return 'NE'
  if (dx > 0 && dy === 0) return 'E'
  if (dx > 0 && dy > 0) return 'SE'
  if (dx === 0 && dy > 0) return 'S'
  if (dx < 0 && dy > 0) return 'SW'
  if (dx < 0 && dy === 0) return 'W'
  if (dx < 0 && dy < 0) return 'NW'

  return 'S' // Default: Süden
}

/**
 * Aktualisiert Animation-State (Frame, Progress)
 *
 * @param animState - Aktueller Animation-State
 * @param currentTime - Aktuelle Zeit (ms)
 * @returns Aktualisierter Animation-State
 */
export function updateAnimation(
  animState: AnimationState,
  currentTime: number
): AnimationState {
  const elapsed = currentTime - animState.startTime

  // Dauer je nach Animation-Typ
  let duration = IDLE_ANIMATION_DURATION
  if (animState.type === 'working') {
    duration = WORKING_ANIMATION_DURATION
  } else if (animState.type === 'walking') {
    duration = WALKING_ANIMATION_DURATION_PER_TILE
  }

  // Progress: 0-1 (Loop)
  const progress = (elapsed % duration) / duration

  // Frame: Ganzzahl (inkrementiert bei jedem Loop)
  const frame = Math.floor(elapsed / duration)

  return {
    ...animState,
    frame,
    progress
  }
}
