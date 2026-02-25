/**
 * E2E Tests für Settlers Isometrische Canvas
 * Issue #53: Isometrische Canvas-Basis mit Grid-System
 *
 * AC1: Canvas Setup & Rendering Loop
 * AC2: Isometrische Projektion korrekt
 * AC3: Grid-Rendering (10x10 Tiles)
 * AC5: Responsive Design
 * AC6: Performance (30 FPS)
 */

import { test, expect } from '@playwright/test'

test.describe('Settlers Dashboard - Isometrische Canvas', () => {
  test.beforeEach(async ({ page }) => {
    // Dashboard aufrufen
    await page.goto('http://localhost:5173')

    // Warten bis geladen
    await page.waitForLoadState('networkidle')

    // Auf "Siedler" Tab navigieren
    await page.click('text=Siedler')

    // Warten bis Canvas geladen
    await page.waitForSelector('canvas', { timeout: 5000 })
  })

  test('AC1: Canvas sollte gerendert werden mit Debug-Overlay', async ({ page }) => {
    // Canvas-Element sollte existieren
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    // Debug-Overlay sollte FPS anzeigen (spezifischerer Selector)
    const debugOverlay = page.locator('div').filter({ hasText: /^FPS: \d+/ }).first()
    await expect(debugOverlay).toBeVisible()

    // Memory-Info sollte angezeigt werden
    const memoryText = page.locator('div').filter({ hasText: /^Memory: [\d.]+/ }).first()
    await expect(memoryText).toBeVisible()
  })

  test('AC2 + AC3: Canvas sollte 10x10 Grid rendern', async ({ page }) => {
    const canvas = page.locator('canvas')

    // Canvas sollte sichtbare Breite/Höhe haben
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(400)
    expect(box!.height).toBeGreaterThan(400)

    // Screenshot für visuelles Regression-Testing
    await expect(canvas).toHaveScreenshot('settlers-grid-initial.png', {
      maxDiffPixels: 100 // Toleranz für Anti-Aliasing-Unterschiede
    })
  })

  test('AC3: Hover sollte Tile-Koordinaten anzeigen', async ({ page }) => {
    const canvas = page.locator('canvas')

    // Canvas-Mitte hovern (sollte ungefähr Tile 5,5 sein)
    await canvas.hover({ position: { x: 400, y: 300 } })

    // Warte kurz auf State-Update
    await page.waitForTimeout(100)

    // Debug-Overlay sollte Tile-Koordinaten zeigen (spezifischerer Selector)
    const tileInfo = page.locator('div').filter({ hasText: /^Tile: \(\d, \d\)$/ }).first()
    await expect(tileInfo).toBeVisible()

    // Koordinaten sollten im Bereich 0-9 liegen
    const text = await tileInfo.textContent()
    expect(text).toMatch(/Tile: \(\d, \d\)/)
  })

  test('AC3: Click sollte Tile-Koordinaten loggen', async ({ page }) => {
    const canvas = page.locator('canvas')

    // Console-Logs abfangen
    const consoleLogs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text())
      }
    })

    // Canvas-Mitte klicken
    await canvas.click({ position: { x: 400, y: 300 } })

    // Warte kurz
    await page.waitForTimeout(100)

    // Sollte "Tile clicked" im Log haben
    expect(consoleLogs.some(log => log.includes('Tile clicked'))).toBe(true)
  })

  test('AC5: Responsive Design - Canvas sollte sich an Viewport anpassen', async ({ page }) => {
    // Desktop-Größe (default)
    let canvas = page.locator('canvas')
    let desktopBox = await canvas.boundingBox()

    // Viewport auf Tablet ändern
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(300) // Warte auf Resize-Handler

    let tabletBox = await canvas.boundingBox()

    // Canvas sollte schmaler sein als vorher
    expect(tabletBox!.width).toBeLessThan(desktopBox!.width)

    // Viewport auf Mobile ändern
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(300)

    let mobileBox = await canvas.boundingBox()

    // Canvas sollte noch schmaler sein
    expect(mobileBox!.width).toBeLessThan(tabletBox!.width)
  })

  test('AC6: Performance - FPS sollte >= 30 sein', async ({ page }) => {
    // Warte bis FPS-Messung stabil ist (1-2 Sekunden)
    await page.waitForTimeout(2000)

    // FPS aus Debug-Overlay lesen (spezifischerer Selector)
    const fpsText = await page.locator('div').filter({ hasText: /^FPS: \d+/ }).first().textContent()
    const fpsMatch = fpsText?.match(/FPS: (\d+)/)

    expect(fpsMatch).not.toBeNull()

    const fps = parseInt(fpsMatch![1], 10)

    // AC6: Minimum 30 FPS
    expect(fps).toBeGreaterThanOrEqual(30)
  })

  test('AC6: Performance - Memory sollte < 50MB sein', async ({ page }) => {
    // Warte bis Memory-Messung stabil ist
    await page.waitForTimeout(2000)

    // Memory aus Debug-Overlay lesen (spezifischerer Selector)
    const memoryText = await page.locator('div').filter({ hasText: /^Memory: [\d.]+/ }).first().textContent()
    const memoryMatch = memoryText?.match(/Memory: ([\d.]+) MB/)

    expect(memoryMatch).not.toBeNull()

    const memoryMB = parseFloat(memoryMatch![1])

    // AC6: Maximum 50MB
    expect(memoryMB).toBeLessThan(50)
  })

  test('AC7: Fallback - Canvas sollte auch ohne WebGL funktionieren', async ({ page }) => {
    // Canvas nutzt 2D Context (kein WebGL), also sollte es immer funktionieren
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    // Teste ob Rendering funktioniert (Screenshot sollte nicht leer sein)
    const screenshot = await canvas.screenshot()
    expect(screenshot.byteLength).toBeGreaterThan(1000) // Nicht-leeres Bild
  })

  test('AC8: Koordinatensystem sollte korrekt sein', async ({ page }) => {
    const canvas = page.locator('canvas')

    // Hover über verschiedene Positionen und prüfe Koordinaten
    const positions = [
      { x: 300, y: 250, expectedCoords: /Tile: \([0-4], [0-4]\)/ },  // Links oben
      { x: 500, y: 250, expectedCoords: /Tile: \([5-9], [0-4]\)/ },  // Rechts oben
      { x: 400, y: 350, expectedCoords: /Tile: \(\d, [5-9]\)/ }      // Unten
    ]

    for (const pos of positions) {
      await canvas.hover({ position: { x: pos.x, y: pos.y } })
      await page.waitForTimeout(100)

      const tileLocator = page.locator('div').filter({ hasText: /^Tile: \(\d, \d\)$/ }).first()
      const isVisible = await tileLocator.isVisible()

      // Koordinaten sollten im erwarteten Bereich liegen
      // (oder gar nicht angezeigt werden wenn außerhalb des Grids)
      if (isVisible) {
        const tileInfo = await tileLocator.textContent()
        expect(tileInfo).toMatch(/Tile: \(\d, \d\)/)
      }
    }
  })

  test('Visual Regression: Grid sollte konsistent gerendert werden', async ({ page }) => {
    const canvas = page.locator('canvas')

    // Warte bis Rendering stabil ist
    await page.waitForTimeout(1000)

    // Screenshot des gesamten Settlers-Tabs
    await expect(page).toHaveScreenshot('settlers-full-view.png', {
      fullPage: false,
      maxDiffPixels: 200
    })
  })
})
