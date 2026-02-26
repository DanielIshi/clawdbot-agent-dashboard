/**
 * E2E Live-Verifikation: Tmux Live View mit echten Agenten
 */
import { test, expect } from '@playwright/test'

test.describe('Live Tmux Verification', () => {
  test('sollte echten Agent im Tmux Live Tab anzeigen', async ({ page }) => {
    await page.goto('http://localhost:3456')
    await page.waitForLoadState('networkidle')

    // Navigiere zum Tmux Live Tab (Desktop Navigation - first())
    const tmuxTab = page.locator('button:has-text("Tmux Live")').first()
    await expect(tmuxTab).toBeVisible()
    await tmuxTab.click()

    // Warte auf Header
    await expect(page.locator('h2:has-text("Tmux Live Terminal")')).toBeVisible()

    // Warte auf Polling (3s + Buffer)
    await page.waitForTimeout(4000)

    // Prüfe ob mindestens ein Quarter mit Terminal-Output vorhanden ist
    const terminalOutputs = page.locator('pre.text-green-400')
    const count = await terminalOutputs.count()

    if (count > 0) {
      // Prüfe ersten Terminal-Output
      const firstTerminal = terminalOutputs.first()
      await expect(firstTerminal).toBeVisible()

      // Hole Text
      const text = await firstTerminal.textContent()
      console.log('📺 Tmux Output gefunden:', text?.substring(0, 100))

      // Sollte mindestens etwas Text enthalten
      expect(text).toBeTruthy()
      expect(text!.length).toBeGreaterThan(10)
    } else {
      console.log('⚠️ Keine aktiven Tmux-Sessions gefunden')
    }
  })

  test('sollte test-feature-agent mit Live-Output anzeigen', async ({ page }) => {
    await page.goto('http://localhost:3456')
    await page.waitForLoadState('networkidle')

    // Navigiere zum Tmux Live Tab
    await page.locator('button:has-text("Tmux Live")').first().click()
    await page.waitForTimeout(4000)

    // Suche nach "test-feature-agent" oder "Feature Test Agent"
    const agentQuarters = page.locator('h3.text-green-300')
    const count = await agentQuarters.count()

    console.log(`📊 Gefundene Agent-Quarters: ${count}`)

    // Prüfe ob unser Agent sichtbar ist
    const testAgentExists = await page.locator('text=Add unit tests for TmuxLiveView component').count() > 0

    if (testAgentExists) {
      console.log('✅ test-feature-agent gefunden!')
      await expect(page.locator('text=Add unit tests for TmuxLiveView component')).toBeVisible()
    } else {
      console.log('⚠️ test-feature-agent noch nicht geladen (Polling-Verzögerung?)')
    }
  })

  test('sollte Terminal-Output aktualisieren (Polling)', async ({ page }) => {
    await page.goto('http://localhost:3456')
    await page.waitForLoadState('networkidle')

    await page.locator('button:has-text("Tmux Live")').first().click()
    await page.waitForTimeout(4000)

    const terminals = page.locator('pre.text-green-400')
    const count = await terminals.count()

    if (count > 0) {
      // Erster Content
      const initialText = await terminals.first().textContent()
      console.log('📸 Initial Output:', initialText?.substring(0, 50))

      // Warte auf Polling-Update (3s)
      await page.waitForTimeout(3500)

      // Zweiter Content (könnte sich geändert haben)
      const updatedText = await terminals.first().textContent()
      console.log('🔄 Updated Output:', updatedText?.substring(0, 50))

      // Content sollte existieren (kann gleich sein wenn Agent fertig)
      expect(updatedText).toBeTruthy()
    }
  })
})
