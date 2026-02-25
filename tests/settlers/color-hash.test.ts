/**
 * Tests für Deterministische Farb-Generierung
 * Issue #56, AC2: Hash-basierte Farbzuweisung
 */

import { describe, it, expect } from 'vitest'
import { projectNameToColor, stringToHash, hashToHSL } from '../../src/components/settlers/colorHash'

describe('AC2: Deterministische Farb-Generierung', () => {
  const testProjects = [
    'siedler-viz',
    'agent-dashboard',
    'my-awesome-project',
    'test-repo',
    'kubernetes',
    'react',
    'vue',
    'angular',
    'svelte',
    'next.js'
  ]

  describe('stringToHash', () => {
    it('sollte für gleichen String immer denselben Hash zurückgeben', () => {
      const input = 'siedler-viz'
      const hash1 = stringToHash(input)
      const hash2 = stringToHash(input)

      expect(hash1).toBe(hash2)
      expect(typeof hash1).toBe('number')
    })

    it('sollte für unterschiedliche Strings unterschiedliche Hashes erzeugen', () => {
      const hash1 = stringToHash('projekt-a')
      const hash2 = stringToHash('projekt-b')

      expect(hash1).not.toBe(hash2)
    })

    it('sollte positive Zahlen zurückgeben', () => {
      const hash = stringToHash('test')
      expect(hash).toBeGreaterThanOrEqual(0)
    })
  })

  describe('hashToHSL', () => {
    it('sollte HSL-String im Format "hsl(H, S%, L%)" zurückgeben', () => {
      const hsl = hashToHSL(12345)
      expect(hsl).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/)
    })

    it('sollte Hue zwischen 0-360 haben', () => {
      for (let i = 0; i < 100; i++) {
        const hsl = hashToHSL(i * 1000)
        const match = hsl.match(/hsl\((\d+),/)
        expect(match).toBeTruthy()
        const hue = parseInt(match![1])
        expect(hue).toBeGreaterThanOrEqual(0)
        expect(hue).toBeLessThanOrEqual(360)
      }
    })

    it('sollte Saturation = 70% haben', () => {
      const hsl = hashToHSL(12345)
      expect(hsl).toContain('70%')
    })

    it('sollte Lightness zwischen 50-70% haben', () => {
      for (let i = 0; i < 100; i++) {
        const hsl = hashToHSL(i * 1000)
        const match = hsl.match(/hsl\(\d+,\s*\d+%,\s*(\d+)%\)/)
        expect(match).toBeTruthy()
        const lightness = parseInt(match![1])
        expect(lightness).toBeGreaterThanOrEqual(50)
        expect(lightness).toBeLessThanOrEqual(70)
      }
    })
  })

  describe('projectNameToColor', () => {
    it('sollte für 10 Projektnamen konsistente Farben zurückgeben', () => {
      testProjects.forEach(projectName => {
        const color1 = projectNameToColor(projectName)
        const color2 = projectNameToColor(projectName)

        expect(color1).toBe(color2)
        expect(color1).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/)
      })
    })

    it('sollte für unterschiedliche Projektnamen unterschiedliche Farben erzeugen', () => {
      const colors = testProjects.map(projectNameToColor)
      const uniqueColors = new Set(colors)

      // Mindestens 8 von 10 sollten unterschiedlich sein (Hash-Kollisionen erlaubt)
      expect(uniqueColors.size).toBeGreaterThanOrEqual(8)
    })

    it('sollte für denselben Projektnamen immer dieselbe Farbe liefern (Idempotenz)', () => {
      const projectName = 'siedler-viz'
      const results = Array(10).fill(null).map(() => projectNameToColor(projectName))

      const allSame = results.every(color => color === results[0])
      expect(allSame).toBe(true)
    })

    it('sollte Case-Sensitivity beachten', () => {
      const color1 = projectNameToColor('PROJECT')
      const color2 = projectNameToColor('project')

      expect(color1).not.toBe(color2)
    })

    it('sollte für leeren String eine Farbe zurückgeben', () => {
      const color = projectNameToColor('')
      expect(color).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/)
    })

    it('sollte Sonderzeichen korrekt verarbeiten', () => {
      const projectsWithSpecialChars = [
        'my-project',
        'my_project',
        'my.project',
        'my@project',
        'my#project'
      ]

      projectsWithSpecialChars.forEach(projectName => {
        const color = projectNameToColor(projectName)
        expect(color).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/)
      })
    })

    it('sollte für alle Test-Projektnamen gültige HSL-Farben erzeugen', () => {
      testProjects.forEach(projectName => {
        const color = projectNameToColor(projectName)
        expect(color).toMatch(/^hsl\(\d+,\s*70%,\s*(5[0-9]|6[0-9]|70)%\)$/)
      })
    })
  })

  describe('Konsistenz über mehrere Aufrufe', () => {
    it('sollte bei 100 Aufrufen für denselben Projektnamen immer dieselbe Farbe liefern', () => {
      const projectName = 'siedler-viz'
      const colors = Array(100).fill(null).map(() => projectNameToColor(projectName))

      const uniqueColors = new Set(colors)
      expect(uniqueColors.size).toBe(1)
    })

    it('sollte für alle Test-Projektnamen konsistent sein', () => {
      testProjects.forEach(projectName => {
        const colors = Array(50).fill(null).map(() => projectNameToColor(projectName))
        const uniqueColors = new Set(colors)
        expect(uniqueColors.size).toBe(1)
      })
    })
  })
})
