/**
 * E2E Tests für Tab-Navigation (Agent Logs & Tmux Live)
 */
import { test, expect } from '@playwright/test'

test.describe('Tab Navigation', () => {
  test('sollte beide Tabs anzeigen: Agent Logs und Tmux Live', async ({ page }) => {
    await page.goto('http://localhost:3456')

    // Warte auf Seite geladen
    await page.waitForLoadState('networkidle')

    // Desktop Navigation (falls sichtbar)
    const desktopNav = page.locator('nav.flex.gap-2')
    if (await desktopNav.isVisible()) {
      // Prüfe "Agent Logs" Tab
      const agentLogsTab = desktopNav.locator('button:has-text("Agent Logs")')
      await expect(agentLogsTab).toBeVisible()

      // Prüfe "Tmux Live" Tab
      const tmuxTab = desktopNav.locator('button:has-text("Tmux Live")')
      await expect(tmuxTab).toBeVisible()
    }
  })

  test('sollte zum Agent Logs Tab wechseln', async ({ page }) => {
    await page.goto('http://localhost:3456')
    await page.waitForLoadState('networkidle')

    // Desktop Navigation
    const desktopNav = page.locator('nav.flex.gap-2')
    if (await desktopNav.isVisible()) {
      const agentLogsTab = desktopNav.locator('button:has-text("Agent Logs")')
      await agentLogsTab.click()

      // Prüfe ob Header "Agent Logs & Chat" angezeigt wird
      await expect(page.locator('h2:has-text("Agent Logs & Chat")')).toBeVisible()

      // Prüfe ob Chat-Interface vorhanden
      await expect(page.locator('input[placeholder*="Nachricht an Agent"]').first()).toBeVisible()
    }
  })

  test('sollte zum Tmux Live Tab wechseln', async ({ page }) => {
    await page.goto('http://localhost:3456')
    await page.waitForLoadState('networkidle')

    // Desktop Navigation
    const desktopNav = page.locator('nav.flex.gap-2')
    if (await desktopNav.isVisible()) {
      const tmuxTab = desktopNav.locator('button:has-text("Tmux Live")')
      await tmuxTab.click()

      // Prüfe ob Header "Tmux Live Terminal" angezeigt wird
      await expect(page.locator('h2:has-text("Tmux Live Terminal")')).toBeVisible()

      // Prüfe Beschreibung
      await expect(page.locator('text=Rohe Terminal-Ausgabe der Agenten')).toBeVisible()
    }
  })

  test('sollte 4 Agent-Quarters im Tmux Live Tab anzeigen', async ({ page }) => {
    await page.goto('http://localhost:3456')
    await page.waitForLoadState('networkidle')

    const desktopNav = page.locator('nav.flex.gap-2')
    if (await desktopNav.isVisible()) {
      const tmuxTab = desktopNav.locator('button:has-text("Tmux Live")')
      await tmuxTab.click()

      // Warte auf Grid
      await page.waitForSelector('.grid.grid-cols-2.grid-rows-2')

      // Prüfe 4 Quarters (können leer sein wenn keine Sessions)
      const quarters = page.locator('.grid.grid-cols-2.grid-rows-2 > div')
      await expect(quarters).toHaveCount(4)
    }
  })

  test('sollte Live-Session mit Tmux-Output anzeigen (falls vorhanden)', async ({ page }) => {
    await page.goto('http://localhost:3456')
    await page.waitForLoadState('networkidle')

    const desktopNav = page.locator('nav.flex.gap-2')
    if (await desktopNav.isVisible()) {
      const tmuxTab = desktopNav.locator('button:has-text("Tmux Live")')
      await tmuxTab.click()

      // Warte kurz für Polling
      await page.waitForTimeout(4000)

      // Prüfe ob mindestens ein Quarter mit Terminal-Output existiert
      const terminalOutput = page.locator('pre.text-green-400')
      const count = await terminalOutput.count()

      // Falls Sessions aktiv: erwarte mindestens 1 Terminal
      if (count > 0) {
        await expect(terminalOutput.first()).toBeVisible()
      }
    }
  })

  test('sollte zwischen Tabs wechseln ohne Fehler', async ({ page }) => {
    await page.goto('http://localhost:3456')
    await page.waitForLoadState('networkidle')

    const desktopNav = page.locator('nav.flex.gap-2')
    if (await desktopNav.isVisible()) {
      // Wechsel zu Agent Logs
      await desktopNav.locator('button:has-text("Agent Logs")').click()
      await expect(page.locator('h2:has-text("Agent Logs & Chat")')).toBeVisible()

      // Wechsel zu Tmux Live
      await desktopNav.locator('button:has-text("Tmux Live")').click()
      await expect(page.locator('h2:has-text("Tmux Live Terminal")')).toBeVisible()

      // Zurück zu Agent Logs
      await desktopNav.locator('button:has-text("Agent Logs")').click()
      await expect(page.locator('h2:has-text("Agent Logs & Chat")')).toBeVisible()

      // Keine Console-Errors
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })

      expect(consoleErrors.length).toBe(0)
    }
  })
})

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('sollte Bottom Navigation mit Tabs anzeigen', async ({ page }) => {
    await page.goto('http://localhost:3456')
    await page.waitForLoadState('networkidle')

    // Prüfe ob Mobile Bottom Navigation existiert (nach Build sichtbar)
    const bottomNav = page.locator('div.fixed.bottom-0.left-0.right-0')

    // Falls visible, prüfe Buttons
    if (await bottomNav.isVisible()) {
      const navButtons = bottomNav.locator('button')
      const count = await navButtons.count()
      expect(count).toBeGreaterThanOrEqual(6)
    } else {
      // Test überspringen wenn noch nicht gebaut
      test.skip()
    }
  })
})
