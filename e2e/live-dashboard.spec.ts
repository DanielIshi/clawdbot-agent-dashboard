import { test, expect } from '@playwright/test'

test.describe('Live Agent Dashboard', () => {
  test('should load dashboard and show agent quarters', async ({ page }) => {
    await page.goto('https://apps.srv947487.hstgr.cloud/agent-dashboard/')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check title
    await expect(page.locator('h2')).toContainText('Live Agent Team')

    // Check quarters exist (4 grid cells)
    const quarters = page.locator('.grid > div')
    await expect(quarters).toHaveCount(4)

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/live-dashboard.png', fullPage: true })
  })

  test('should poll sessions API', async ({ page }) => {
    let apiCalls = 0

    page.on('request', request => {
      if (request.url().includes('/api/sessions')) {
        apiCalls++
        console.log(`API call ${apiCalls}: ${request.url()}`)
      }
    })

    await page.goto('https://apps.srv947487.hstgr.cloud/agent-dashboard/')
    await page.waitForLoadState('networkidle')

    // Wait for at least 2 polling cycles (10s each + 5s logs = 15s)
    await page.waitForTimeout(20000)

    // Should have called /api/sessions at least twice
    expect(apiCalls).toBeGreaterThan(1)
    console.log(`Total API calls: ${apiCalls}`)
  })

  test('should show active sessions', async ({ page }) => {
    await page.goto('https://apps.srv947487.hstgr.cloud/agent-dashboard/')
    await page.waitForLoadState('networkidle')

    // Check if any session data is shown
    const sessionInfo = page.locator('.bg-gray-900').first()
    await expect(sessionInfo).toBeVisible()

    // Check for agent name or "Kein Agent aktiv"
    const hasAgentOrEmpty = await page.locator('text=/Kein Agent aktiv|Agent/i').count()
    expect(hasAgentOrEmpty).toBeGreaterThan(0)
  })

  test('should handle tmux-output API', async ({ page }) => {
    const responses: any[] = []

    page.on('response', async response => {
      if (response.url().includes('/tmux-output')) {
        const data = await response.json()
        responses.push({ url: response.url(), data })
        console.log('Tmux API response:', data)
      }
    })

    await page.goto('https://apps.srv947487.hstgr.cloud/agent-dashboard/')
    await page.waitForLoadState('networkidle')

    // Wait for tmux polling (3s interval)
    await page.waitForTimeout(5000)

    console.log(`Captured ${responses.length} tmux API responses`)
  })
})
