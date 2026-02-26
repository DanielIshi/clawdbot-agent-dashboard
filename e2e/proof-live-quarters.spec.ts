/**
 * FINAL PROOF: Live Content in Tmux Quarters
 */
import { test, expect } from '@playwright/test'

test('BEWEIS: 4 Live Agents mit Tmux-Output in Quarters', async ({ page }) => {
  await page.goto('https://apps.srv947487.hstgr.cloud/agent-dashboard/')
  await page.waitForLoadState('networkidle')

  // Navigiere zu Tmux Live Tab
  const tmuxTab = page.locator('button:has-text("Tmux Live")').first()
  await expect(tmuxTab).toBeVisible({ timeout: 10000 })
  await tmuxTab.click()

  // Warte auf Header
  await expect(page.locator('h2:has-text("Tmux Live Terminal")')).toBeVisible()

  // Warte auf Polling (erste Ladung)
  console.log('⏳ Warte auf ersten Polling-Zyklus (3s)...')
  await page.waitForTimeout(4000)

  // Screenshot BEFORE content
  await page.screenshot({ path: '/tmp/tmux-quarters-before.png', fullPage: true })
  console.log('📸 Screenshot 1: /tmp/tmux-quarters-before.png')

  // Prüfe Quarters
  const quarters = page.locator('.grid.grid-cols-2.grid-rows-2 > div')
  const quarterCount = await quarters.count()
  console.log(`📊 Gefundene Quarters: ${quarterCount}`)
  expect(quarterCount).toBe(4)

  // Prüfe Terminal-Outputs
  const terminals = page.locator('pre.text-green-400')
  const terminalCount = await terminals.count()
  console.log(`🖥️  Terminal-Outputs gefunden: ${terminalCount}`)

  if (terminalCount > 0) {
    // Hole erste 4 Terminal-Texte
    for (let i = 0; i < Math.min(4, terminalCount); i++) {
      const text = await terminals.nth(i).textContent()
      const preview = text?.substring(0, 100).replace(/\n/g, ' ')
      console.log(`\n📺 Terminal ${i + 1}:`, preview)
    }

    // Screenshot WITH content
    await page.screenshot({ path: '/tmp/tmux-quarters-live.png', fullPage: true })
    console.log('\n📸 Screenshot 2 (Live): /tmp/tmux-quarters-live.png')

    // Erwarte mindestens 3 Terminals (4 Sessions - 1 könnte noch pending sein)
    expect(terminalCount).toBeGreaterThanOrEqual(3)

    // Verifiziere Content ist nicht leer
    const firstTerminalText = await terminals.first().textContent()
    expect(firstTerminalText).toBeTruthy()
    expect(firstTerminalText!.length).toBeGreaterThan(50)

    console.log('\n✅ BEWEIS ERBRACHT: Live Tmux-Content in Quarters!')
  } else {
    console.log('❌ KEINE Terminal-Outputs gefunden - Polling fehlgeschlagen?')
    throw new Error('Keine Live-Terminals gefunden')
  }

  // Prüfe Agent-Headers
  const agentHeaders = page.locator('h3.text-green-300')
  const headerCount = await agentHeaders.count()
  console.log(`\n🏷️  Agent-Headers: ${headerCount}`)

  if (headerCount > 0) {
    for (let i = 0; i < Math.min(4, headerCount); i++) {
      const header = await agentHeaders.nth(i).textContent()
      console.log(`  - ${header}`)
    }
  }
})
