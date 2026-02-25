/**
 * Settlers Dashboard - Type Definitions
 * Issue #53: Isometrische Canvas-Basis mit Grid-System
 */

/**
 * Grid-basierte Koordinaten (0-9)
 * Repräsentiert eine Position im logischen 10x10 Grid
 */
export interface GridCoordinates {
  x: number  // 0-9 (horizontal)
  y: number  // 0-9 (vertical)
}

/**
 * Isometrische Bildschirm-Koordinaten
 * Berechnet aus GridCoordinates via Isometrische Projektion
 */
export interface IsometricCoordinates {
  isoX: number  // Pixel-Position X auf Canvas
  isoY: number  // Pixel-Position Y auf Canvas
}

/**
 * Tile-Konfiguration
 * Definiert die Abmessungen eines isometrischen Tiles (Raute)
 */
export interface TileConfig {
  width: number   // 64px (Breite der Raute)
  height: number  // 32px (Höhe der Raute)
}

/**
 * Canvas-Viewport-Konfiguration
 */
export interface ViewportConfig {
  width: number    // Canvas-Breite in Pixel
  height: number   // Canvas-Höhe in Pixel
  offsetX: number  // X-Offset für Kamera-Zentrierung
  offsetY: number  // Y-Offset für Kamera-Zentrierung
}

/**
 * Tile-Typen (für spätere Issues #54)
 */
export enum TileType {
  GRASS = 'grass',
  WATER = 'water',
  SAND = 'sand'
}

/**
 * Grid-Tile
 */
export interface Tile {
  coords: GridCoordinates
  type: TileType
}

/**
 * Rendering-Performance-Metriken
 */
export interface PerformanceMetrics {
  fps: number          // Frames per second
  frameTime: number    // Millisekunden pro Frame
  memoryMB: number     // Speicherverbrauch in MB
}

/**
 * Agent-Typen (Issue #55)
 */
export type AgentType = 'codex' | 'claude' | 'gpt' | 'ollama'

/**
 * Agent-Status
 */
export type AgentStatus = 'idle' | 'working' | 'blocked'

/**
 * Animation-Typen
 */
export type AnimationType = 'idle' | 'working' | 'walking'

/**
 * Animation-State
 */
export interface AnimationState {
  type: AnimationType
  frame: number        // Aktueller Frame (0-N)
  progress: number     // 0-1 (Progress im aktuellen Loop)
  startTime: number    // Timestamp des Animation-Starts
}

/**
 * Agent-Sprite (Issue #55, AC1)
 */
export interface AgentSprite {
  id: string
  name: string
  type: AgentType
  position: GridCoordinates
  status: AgentStatus
  color: string
  animation: AnimationState
}

/**
 * Voxel-Block (für Voxel-Rendering)
 */
export interface VoxelBlock {
  x: number  // Grid-Position X
  y: number  // Grid-Position Y
  z: number  // Höhe (0 = Boden)
  color: string
}

/**
 * Building-Status (Issue #56)
 */
export type BuildingStatus = 'active' | 'has_issues' | 'has_pr'

/**
 * Building (Projekt-Gebäude, Issue #56, AC1)
 */
export interface Building {
  id: string
  projectName: string
  position: GridCoordinates
  color: string
  status: BuildingStatus
  height: number  // 3-6 Voxel
  issueCount: number
  prCount: number
}
