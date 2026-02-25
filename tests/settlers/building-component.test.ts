/**
 * Tests für Building Component (AC7)
 * Issue #56, AC7: Building-Click-Event
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isPointInsideBuilding, dispatchBuildingClickEvent } from '../../src/components/settlers/Building'
import type { Building } from '../../src/components/settlers/types'

describe('AC7: Building-Click-Event (Component)', () => {
  describe('isPointInsideBuilding', () => {
    const building: Building = {
      id: 'project-1',
      projectName: 'test',
      position: { x: 5, y: 5 },
      color: 'hsl(180, 70%, 60%)',
      status: 'active',
      height: 4,
      issueCount: 0,
      prCount: 0
    }

    const screenX = 400
    const screenY = 300
    const voxelSize = 16

    it('sollte true zurückgeben wenn Punkt innerhalb Building', () => {
      // Zentrum des Buildings
      const isInside = isPointInsideBuilding(400, 280, building, screenX, screenY, voxelSize)
      expect(isInside).toBe(true)
    })

    it('sollte false zurückgeben wenn Punkt außerhalb Building', () => {
      // Weit entfernt
      const isInside = isPointInsideBuilding(100, 100, building, screenX, screenY, voxelSize)
      expect(isInside).toBe(false)
    })

    it('sollte Bounding-Box korrekt berechnen (3x3 Grundfläche)', () => {
      const buildingWidth = voxelSize * 3 // 48px

      // Links vom Building
      expect(isPointInsideBuilding(screenX - buildingWidth, screenY, building, screenX, screenY, voxelSize)).toBe(false)

      // Rechts vom Building
      expect(isPointInsideBuilding(screenX + buildingWidth, screenY, building, screenX, screenY, voxelSize)).toBe(false)
    })

    it('sollte Höhe berücksichtigen', () => {
      const buildingHeight = building.height * voxelSize // 64px

      // Über dem Building
      expect(isPointInsideBuilding(screenX, screenY - buildingHeight - 10, building, screenX, screenY, voxelSize)).toBe(false)

      // Auf dem Building
      expect(isPointInsideBuilding(screenX, screenY - buildingHeight / 2, building, screenX, screenY, voxelSize)).toBe(true)
    })

    it('sollte Edge-Cases korrekt behandeln', () => {
      const buildingWidth = voxelSize * 3
      const left = screenX - buildingWidth / 2
      const right = screenX + buildingWidth / 2

      // Linke Kante
      expect(isPointInsideBuilding(left, screenY, building, screenX, screenY, voxelSize)).toBe(true)

      // Rechte Kante
      expect(isPointInsideBuilding(right, screenY, building, screenX, screenY, voxelSize)).toBe(true)
    })

    it('sollte verschiedene Gebäudehöhen unterstützen', () => {
      const tallBuilding: Building = { ...building, height: 6 }
      const shortBuilding: Building = { ...building, height: 3 }

      const tallHeight = tallBuilding.height * voxelSize
      const shortHeight = shortBuilding.height * voxelSize

      // Punkt oberhalb des kurzen, aber innerhalb des hohen Gebäudes
      const testY = screenY - shortHeight - 10

      expect(isPointInsideBuilding(screenX, testY, tallBuilding, screenX, screenY, voxelSize)).toBe(true)
      expect(isPointInsideBuilding(screenX, testY, shortBuilding, screenX, screenY, voxelSize)).toBe(false)
    })
  })

  describe('dispatchBuildingClickEvent', () => {
    beforeEach(() => {
      // Clear any existing listeners
      vi.clearAllMocks()
    })

    it('sollte Custom Event "buildingClick" dispatchen', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test-project',
        position: { x: 5, y: 5 },
        color: 'hsl(240, 70%, 60%)',
        status: 'has_pr',
        height: 4,
        issueCount: 2,
        prCount: 1
      }

      const listener = vi.fn()
      window.addEventListener('buildingClick', listener as EventListener)

      dispatchBuildingClickEvent(building)

      expect(listener).toHaveBeenCalledOnce()

      window.removeEventListener('buildingClick', listener as EventListener)
    })

    it('sollte alle Building-Daten im Event.detail haben', () => {
      const building: Building = {
        id: 'project-2',
        projectName: 'siedler-viz',
        position: { x: 3, y: 7 },
        color: 'hsl(120, 70%, 60%)',
        status: 'has_issues',
        height: 5,
        issueCount: 3,
        prCount: 0
      }

      let eventDetail: any = null

      const listener = (event: Event) => {
        const customEvent = event as CustomEvent
        eventDetail = customEvent.detail
      }

      window.addEventListener('buildingClick', listener)

      dispatchBuildingClickEvent(building)

      expect(eventDetail).not.toBeNull()
      expect(eventDetail.id).toBe('project-2')
      expect(eventDetail.projectName).toBe('siedler-viz')
      expect(eventDetail.position).toEqual({ x: 3, y: 7 })
      expect(eventDetail.status).toBe('has_issues')
      expect(eventDetail.height).toBe(5)
      expect(eventDetail.issueCount).toBe(3)
      expect(eventDetail.prCount).toBe(0)
      expect(eventDetail.color).toBe('hsl(120, 70%, 60%)')

      window.removeEventListener('buildingClick', listener)
    })

    it('sollte für verschiedene Status-Typen funktionieren', () => {
      const statuses: Array<'active' | 'has_issues' | 'has_pr'> = ['active', 'has_issues', 'has_pr']

      statuses.forEach(status => {
        const building: Building = {
          id: `project-${status}`,
          projectName: 'test',
          position: { x: 0, y: 0 },
          color: 'hsl(0, 70%, 60%)',
          status,
          height: 4,
          issueCount: status === 'has_issues' ? 2 : 0,
          prCount: status === 'has_pr' ? 1 : 0
        }

        const listener = vi.fn()
        window.addEventListener('buildingClick', listener as EventListener)

        dispatchBuildingClickEvent(building)

        expect(listener).toHaveBeenCalledOnce()

        window.removeEventListener('buildingClick', listener as EventListener)
      })
    })

    it('sollte mehrere Events nacheinander dispatchen können', () => {
      const buildings: Building[] = [
        { id: '1', projectName: 'p1', position: { x: 0, y: 0 }, color: 'hsl(0, 70%, 60%)', status: 'active', height: 3, issueCount: 0, prCount: 0 },
        { id: '2', projectName: 'p2', position: { x: 2, y: 2 }, color: 'hsl(120, 70%, 60%)', status: 'has_issues', height: 4, issueCount: 2, prCount: 0 },
        { id: '3', projectName: 'p3', position: { x: 5, y: 5 }, color: 'hsl(240, 70%, 60%)', status: 'has_pr', height: 5, issueCount: 0, prCount: 1 }
      ]

      const capturedEvents: any[] = []

      const listener = (event: Event) => {
        const customEvent = event as CustomEvent
        capturedEvents.push(customEvent.detail)
      }

      window.addEventListener('buildingClick', listener)

      buildings.forEach(dispatchBuildingClickEvent)

      expect(capturedEvents.length).toBe(3)
      expect(capturedEvents[0].id).toBe('1')
      expect(capturedEvents[1].id).toBe('2')
      expect(capturedEvents[2].id).toBe('3')

      window.removeEventListener('buildingClick', listener)
    })
  })

  describe('Integration: Hit-Detection + Event-Dispatch', () => {
    it('sollte Building bei korrektem Click erkennen und Event dispatchen', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(180, 70%, 60%)',
        status: 'active',
        height: 4,
        issueCount: 0,
        prCount: 0
      }

      const screenX = 400
      const screenY = 300
      const voxelSize = 16

      // Simuliere Click auf Building
      const mouseX = 400
      const mouseY = 280

      const isInside = isPointInsideBuilding(mouseX, mouseY, building, screenX, screenY, voxelSize)
      expect(isInside).toBe(true)

      if (isInside) {
        const listener = vi.fn()
        window.addEventListener('buildingClick', listener as EventListener)

        dispatchBuildingClickEvent(building)

        expect(listener).toHaveBeenCalledOnce()

        window.removeEventListener('buildingClick', listener as EventListener)
      }
    })

    it('sollte KEIN Event dispatchen wenn Click außerhalb Building', () => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 5, y: 5 },
        color: 'hsl(180, 70%, 60%)',
        status: 'active',
        height: 4,
        issueCount: 0,
        prCount: 0
      }

      const screenX = 400
      const screenY = 300
      const voxelSize = 16

      // Simuliere Click außerhalb
      const mouseX = 100
      const mouseY = 100

      const isInside = isPointInsideBuilding(mouseX, mouseY, building, screenX, screenY, voxelSize)
      expect(isInside).toBe(false)

      // Event sollte NICHT dispatcht werden
      const listener = vi.fn()
      window.addEventListener('buildingClick', listener as EventListener)

      if (isInside) {
        dispatchBuildingClickEvent(building)
      }

      expect(listener).not.toHaveBeenCalled()

      window.removeEventListener('buildingClick', listener as EventListener)
    })
  })
})
