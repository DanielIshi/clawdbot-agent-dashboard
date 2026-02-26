/**
 * Debug: Console Errors & Page State
 */
import { test } from '@playwright/test'

test('debug console & page state', async ({ page }) => {
  const consoleMessages: string[] = []
  const errors: string[] = []

  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`)
    if (msg.type() === 'error') errors.push(msg.text())
  })

  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`)
  })

  await page.goto('http://localhost:3456')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  console.log('=== CONSOLE MESSAGES ===')
  consoleMessages.forEach(msg => console.log(msg))

  console.log('\n=== ERRORS ===')
  errors.forEach(err => console.log(err))

  console.log('\n=== PAGE TITLE ===')
  console.log(await page.title())

  console.log('\n=== BODY TEXT (first 500 chars) ===')
  const bodyText = await page.locator('body').textContent()
  console.log(bodyText?.substring(0, 500))
})
