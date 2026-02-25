/**
 * Tests für Building (Projekt-Gebäude)
 * Issue #56, AC1: Building-Datenstruktur
 */

import { describe, it, expect } from 'vitest'
import { Building } from '../../src/components/settlers/types'

describe('AC1: Building-Datenstruktur', () => {
  it('sollte alle erforderlichen Properties haben', () => {
    const building: Building = {
      id: 'project-1',
      projectName: 'siedler-viz',
      position: { x: 5, y: 5 },
      color: '#3498db',
      status: 'active',
      height: 4,
      issueCount: 0,
      prCount: 0
    }

    expect(building).toHaveProperty('id')
    expect(building).toHaveProperty('projectName')
    expect(building).toHaveProperty('position')
    expect(building).toHaveProperty('color')
    expect(building).toHaveProperty('status')
    expect(building).toHaveProperty('height')
    expect(building).toHaveProperty('issueCount')
    expect(building).toHaveProperty('prCount')
  })

  it('sollte Status-Werte unterstützen: active | has_issues | has_pr', () => {
    const statuses: Array<'active' | 'has_issues' | 'has_pr'> = ['active', 'has_issues', 'has_pr']

    statuses.forEach(status => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 0, y: 0 },
        color: '#000000',
        status,
        height: 3,
        issueCount: 0,
        prCount: 0
      }

      expect(building.status).toBe(status)
    })
  })

  it('sollte Grid-Position (x, y) haben', () => {
    const building: Building = {
      id: 'project-1',
      projectName: 'test',
      position: { x: 7, y: 3 },
      color: '#000000',
      status: 'active',
      height: 3,
      issueCount: 0,
      prCount: 0
    }

    expect(building.position).toHaveProperty('x')
    expect(building.position).toHaveProperty('y')
    expect(building.position.x).toBe(7)
    expect(building.position.y).toBe(3)
  })

  it('sollte Height zwischen 3-6 Voxel haben', () => {
    const validHeights = [3, 4, 5, 6]

    validHeights.forEach(height => {
      const building: Building = {
        id: 'project-1',
        projectName: 'test',
        position: { x: 0, y: 0 },
        color: '#000000',
        status: 'active',
        height,
        issueCount: 0,
        prCount: 0
      }

      expect(building.height).toBeGreaterThanOrEqual(3)
      expect(building.height).toBeLessThanOrEqual(6)
    })
  })

  it('sollte issueCount und prCount tracken', () => {
    const building: Building = {
      id: 'project-1',
      projectName: 'test',
      position: { x: 0, y: 0 },
      color: '#000000',
      status: 'has_issues',
      height: 5,
      issueCount: 3,
      prCount: 1
    }

    expect(building.issueCount).toBe(3)
    expect(building.prCount).toBe(1)
  })

  it('sollte Status "has_issues" haben wenn issueCount > 0', () => {
    const building: Building = {
      id: 'project-1',
      projectName: 'test',
      position: { x: 0, y: 0 },
      color: '#000000',
      status: 'has_issues',
      height: 5,
      issueCount: 2,
      prCount: 0
    }

    expect(building.status).toBe('has_issues')
    expect(building.issueCount).toBeGreaterThan(0)
  })

  it('sollte Status "has_pr" haben wenn prCount > 0', () => {
    const building: Building = {
      id: 'project-1',
      projectName: 'test',
      position: { x: 0, y: 0 },
      color: '#000000',
      status: 'has_pr',
      height: 4,
      issueCount: 0,
      prCount: 1
    }

    expect(building.status).toBe('has_pr')
    expect(building.prCount).toBeGreaterThan(0)
  })

  it('sollte Status "active" haben wenn keine Issues und keine PRs', () => {
    const building: Building = {
      id: 'project-1',
      projectName: 'test',
      position: { x: 0, y: 0 },
      color: '#000000',
      status: 'active',
      height: 3,
      issueCount: 0,
      prCount: 0
    }

    expect(building.status).toBe('active')
    expect(building.issueCount).toBe(0)
    expect(building.prCount).toBe(0)
  })
})
