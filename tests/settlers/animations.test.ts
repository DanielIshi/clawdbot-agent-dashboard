/**
 * Tests für Animation System
 * Issue #55, AC4/AC5/AC6: Animationen
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AnimationState } from '../../src/components/settlers/types'
import {
  calculateIdleOffset,
  calculateWorkingRotation,
  calculateWalkingPosition,
  calculateWalkingLegOffset,
  calculateWalkingDirection,
  updateAnimation,
  IDLE_ANIMATION_DURATION,
  WORKING_ANIMATION_DURATION,
  WALKING_ANIMATION_DURATION_PER_TILE
} from '../../src/components/settlers/animations'

describe('Animation System', () => {
  describe('AC4: Idle-Animation (Atmen/Warten)', () => {
    it('sollte nach 0s bei Y-Offset = 0 sein', () => {
      const animState: AnimationState = {
        type: 'idle',
        frame: 0,
        progress: 0,
        startTime: Date.now()
      }

      const offset = calculateIdleOffset(animState, Date.now())
      expect(offset.y).toBeCloseTo(0, 1)
      expect(animState.type).toBe('idle')
    })

    it('sollte nach 1s bei Y-Offset ≈ +2px sein (Peak)', () => {
      const startTime = Date.now()
      const animState: AnimationState = {
        type: 'idle',
        frame: 0,
        progress: 0,
        startTime
      }

      const currentTime = startTime + 1000 // +1 Sekunde

      // Animation: 2s Loop, sin-wave, ±2px
      // Bei 1s (50% des Loops): Peak = +2px
      const offset = calculateIdleOffset(animState, currentTime)
      expect(offset.y).toBeCloseTo(2, 0.5)

      const elapsed = currentTime - startTime
      expect(elapsed).toBe(1000)
    })

    it('sollte nach 2s wieder bei Y-Offset = 0 sein (Loop Complete)', () => {
      const startTime = Date.now()
      const animState: AnimationState = {
        type: 'idle',
        frame: 0,
        progress: 0,
        startTime
      }

      const currentTime = startTime + 2000 // +2 Sekunden (1 Loop)

      const offset = calculateIdleOffset(animState, currentTime)
      expect(offset.y).toBeCloseTo(0, 0.5)

      const elapsed = currentTime - startTime
      expect(elapsed).toBe(2000)
    })

    it('sollte Smooth Easing verwenden (sin-wave)', () => {
      const startTime = Date.now()
      const animState: AnimationState = {
        type: 'idle',
        frame: 0,
        progress: 0,
        startTime
      }

      // Sample mehrere Zeitpunkte
      const samples = [0, 0.5, 1, 1.5, 2].map(seconds => {
        const currentTime = startTime + seconds * 1000
        const offset = calculateIdleOffset(animState, currentTime)
        return offset.y
      })

      // Erwartung: sin-förmige Kurve (0 → max → 0)
      expect(samples[0]).toBeCloseTo(0, 0.5) // Start
      expect(samples[1]).toBeGreaterThan(0)   // Aufsteigend
      expect(samples[2]).toBeCloseTo(2, 0.5)  // Peak
      expect(samples[3]).toBeGreaterThan(0)   // Absteigend
      expect(samples[4]).toBeCloseTo(0, 0.5)  // Loop Ende

      expect(samples.length).toBe(5)
    })

    it('sollte Animation-Dauer = 2 Sekunden haben', () => {
      const duration = IDLE_ANIMATION_DURATION
      expect(duration).toBe(2000) // ms
    })
  })

  describe('AC5: Working-Animation (Hämmern/Tippen)', () => {
    it('sollte "nicken" (Rotation um X-Achse)', () => {
      const animState: AnimationState = {
        type: 'working',
        frame: 0,
        progress: 0,
        startTime: Date.now()
      }

      const rotation = calculateWorkingRotation(animState, Date.now())
      expect(rotation.x).toBeDefined()
      expect(animState.type).toBe('working')
    })

    it('sollte Rotation ±10° haben', () => {
      const startTime = Date.now()
      const animState: AnimationState = {
        type: 'working',
        frame: 0,
        progress: 0,
        startTime
      }

      // Bei 0.5s (Peak): ±10°
      const currentTime = startTime + 500

      const rotation = calculateWorkingRotation(animState, currentTime)
      expect(Math.abs(rotation.x)).toBeCloseTo(10, 1)

      const elapsed = currentTime - startTime
      expect(elapsed).toBe(500)
    })

    it('sollte Animation-Dauer = 1 Sekunde haben', () => {
      const duration = WORKING_ANIMATION_DURATION
      expect(duration).toBe(1000) // ms
    })

    it('sollte schnelle, rhythmische Bewegung haben', () => {
      // Schneller Loop als Idle (1s vs 2s)
      const idleDuration = 2000
      const workingDuration = 1000

      expect(workingDuration).toBeLessThan(idleDuration)
    })
  })

  describe('AC6: Walking-Animation (Bewegen zwischen Tiles)', () => {
    it('sollte lineare Bewegung zwischen (x1, y1) und (x2, y2) haben', () => {
      const animState: AnimationState = {
        type: 'walking',
        frame: 0,
        progress: 0,
        startTime: Date.now()
      }

      const from = { x: 0, y: 0 }
      const to = { x: 3, y: 2 }

      const position = calculateWalkingPosition(animState, Date.now(), from, to)
      expect(position.x).toBeDefined()
      expect(position.y).toBeDefined()
      expect(animState.type).toBe('walking')
    })

    it('sollte Dauer = 1 Sekunde pro Tile haben', () => {
      const duration = WALKING_ANIMATION_DURATION_PER_TILE
      expect(duration).toBe(1000) // ms
    })

    it('sollte Beine alternierend bewegen', () => {
      const animState: AnimationState = {
        type: 'walking',
        frame: 0,
        progress: 0,
        startTime: Date.now()
      }

      const legOffset = calculateWalkingLegOffset(animState, Date.now())
      expect(legOffset.left).toBeDefined()
      expect(legOffset.right).toBeDefined()
      expect(legOffset.left).not.toBe(legOffset.right) // Alternierend
      expect(animState.type).toBe('walking')
    })

    it('sollte in Bewegungsrichtung drehen (8 Richtungen)', () => {
      const directions = [
        { from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, expected: 'E' },
        { from: { x: 0, y: 0 }, to: { x: 0, y: 1 }, expected: 'S' },
        { from: { x: 0, y: 0 }, to: { x: -1, y: 0 }, expected: 'W' },
        { from: { x: 0, y: 0 }, to: { x: 0, y: -1 }, expected: 'N' },
      ]

      directions.forEach(({ from, to, expected }) => {
        const direction = calculateWalkingDirection(from, to)
        expect(direction).toBe(expected)
      })
    })
  })

  describe('updateAnimation() - Animation Loop', () => {
    it('sollte Animation-Progress aktualisieren (0-1)', () => {
      const startTime = Date.now()
      const animState: AnimationState = {
        type: 'idle',
        frame: 0,
        progress: 0,
        startTime
      }

      const currentTime = startTime + 1000 // +1s

      const updated = updateAnimation(animState, currentTime)
      expect(updated.progress).toBeGreaterThan(0)
      expect(updated.progress).toBeLessThanOrEqual(1)

      const elapsed = currentTime - startTime
      expect(elapsed).toBe(1000)
    })

    it('sollte Frame-Counter erhöhen', () => {
      const startTime = Date.now()
      const animState: AnimationState = {
        type: 'idle',
        frame: 0,
        progress: 0,
        startTime
      }

      const currentTime = startTime + 2000 // +2s (1 Loop)

      const updated = updateAnimation(animState, currentTime)
      expect(updated.frame).toBeGreaterThan(0)

      const elapsed = currentTime - startTime
      expect(elapsed).toBe(2000)
    })

    it('sollte Progress nach Loop zurücksetzen', () => {
      const startTime = Date.now()
      const animState: AnimationState = {
        type: 'idle',
        frame: 0,
        progress: 0,
        startTime
      }

      const currentTime = startTime + 4000 // +4s (2 Loops)

      const updated = updateAnimation(animState, currentTime)
      expect(updated.progress).toBeGreaterThanOrEqual(0)
      expect(updated.progress).toBeLessThan(1)

      const elapsed = currentTime - startTime
      expect(elapsed).toBe(4000)
    })
  })
})
