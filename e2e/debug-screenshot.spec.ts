/**
 * Debug: Screenshot der aktuellen Ansicht
 */
import { test } from '@playwright/test'

test('debug screenshot', async ({ page }) => {
  await page.goto('http://localhost:3456')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  await page.screenshot({ path: '/tmp/dashboard-debug.png', fullPage: true })
  console.log('Screenshot saved to /tmp/dashboard-debug.png')

  // Zeige alle button labels
  const buttons = await page.locator('button').allTextContents()
  console.log('All buttons:', buttons)
})
