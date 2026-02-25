/**
 * E2E Tests: SessionSidebar Component
 * Issue #58: Session Sidebar mit Live-Logs
 *
 * AC1: Sidebar-Layout (Rechts, 300px)
 * AC2: Session-Liste mit Status
 * AC4: Session-Click Detail-Ansicht
 * AC5: Status-Badge Farb-Kodierung
 * AC7: Empty-State
 * AC8: Mobile-Collapse
 */

import { test, expect } from '@playwright/test'

test.describe('SessionSidebar', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API response
    await page.route('**/api/sessions', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [
            {
              id: 'session-1',
              status: 'active',
              lastActivity: new Date().toISOString(),
              output: 'Building project... compiling files...'
            },
            {
              id: 'session-2',
              status: 'done',
              lastActivity: new Date(Date.now() - 60000).toISOString(),
              output: 'Build completed successfully'
            },
            {
              id: 'session-3',
              status: 'failed',
              lastActivity: new Date(Date.now() - 120000).toISOString(),
              output: 'Error: Module not found'
            }
          ]
        })
      })
    })

    await page.goto('/')
  })

  /**
   * AC1: Sidebar-Layout (Rechts, 300px Desktop)
   */
  test('AC1: renders sidebar with correct dimensions (Desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    const sidebar = page.locator('[data-testid="session-sidebar"]')
    await expect(sidebar).toBeVisible()

    const box = await sidebar.boundingBox()
    expect(box?.width).toBe(300)

    // Position: rechts
    const viewportWidth = 1280
    expect(box?.x).toBeGreaterThan(viewportWidth - 350)
  })

  test('AC1: renders sidebar fullwidth on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    const sidebar = page.locator('[data-testid="session-sidebar"]')
    await expect(sidebar).toBeVisible()

    const box = await sidebar.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(370) // ~100% width
  })

  /**
   * AC2: Session-Liste mit Status (sortiert nach lastActivity)
   */
  test('AC2: displays sessions sorted by lastActivity', async ({ page }) => {
    const cards = page.locator('[data-testid="session-card"]')
    await expect(cards).toHaveCount(3)

    // Erste Session = neueste (active)
    const firstCard = cards.first()
    await expect(firstCard.locator('[data-testid="session-id"]')).toHaveText('session-1')

    // Screenshot
    await page.screenshot({
      path: 'tests/screenshots/session-sidebar-list.png',
      fullPage: true
    })
  })

  /**
   * AC4: Session-Click Detail-Ansicht (Modal)
   */
  test('AC4: opens modal on session card click', async ({ page }) => {
    const firstCard = page.locator('[data-testid="session-card"]').first()
    await firstCard.click()

    // Modal sichtbar
    const modal = page.locator('[data-testid="session-modal"]')
    await expect(modal).toBeVisible()

    // Close-Button
    const closeButton = modal.locator('[data-testid="modal-close"]')
    await expect(closeButton).toBeVisible()

    await closeButton.click()
    await expect(modal).not.toBeVisible()
  })

  /**
   * AC5: Status-Badge Farb-Kodierung
   */
  test('AC5: displays correct status badge colors', async ({ page }) => {
    // Active (grün, pulse)
    const activeCard = page.locator('[data-testid="session-card"]').first()
    const activeBadge = activeCard.locator('[data-testid="status-badge"]')
    await expect(activeBadge).toHaveCSS('background-color', 'rgb(34, 197, 94)') // green-500

    // Done (blau)
    const doneCard = page.locator('[data-testid="session-card"]').nth(1)
    const doneBadge = doneCard.locator('[data-testid="status-badge"]')
    await expect(doneBadge).toHaveCSS('background-color', 'rgb(59, 130, 246)') // blue-500

    // Failed (rot)
    const failedCard = page.locator('[data-testid="session-card"]').nth(2)
    const failedBadge = failedCard.locator('[data-testid="status-badge"]')
    await expect(failedBadge).toHaveCSS('background-color', 'rgb(239, 68, 68)') // red-500

    // Screenshot
    await page.screenshot({
      path: 'tests/screenshots/session-status-badges.png'
    })
  })

  /**
   * AC7: Empty-State
   */
  test('AC7: displays empty state when no sessions', async ({ page }) => {
    await page.route('**/api/sessions', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sessions: [] })
      })
    })

    await page.reload()

    const emptyState = page.locator('[data-testid="session-empty-state"]')
    await expect(emptyState).toBeVisible()
    await expect(emptyState).toContainText('Keine aktiven Sessions')

    // Screenshot
    await page.screenshot({
      path: 'tests/screenshots/session-empty-state.png'
    })
  })

  /**
   * AC8: Mobile-Collapse (Toggle-Button, Slide-In)
   */
  test('AC8: toggles sidebar on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    const sidebar = page.locator('[data-testid="session-sidebar"]')
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]')

    // Initial: collapsed (off-screen)
    await expect(sidebar).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 375, 0)') // translateX(100%)

    // Open
    await toggleButton.click()
    await expect(sidebar).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)') // translateX(0)

    // Close
    await toggleButton.click()
    await expect(sidebar).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 375, 0)') // translateX(100%)
  })

  /**
   * AC3: Live-Output-Vorschau (Text-Truncation)
   * Tested in Unit Tests (textTruncate.test.ts)
   */
  test('AC3: truncates long output text', async ({ page }) => {
    const firstCard = page.locator('[data-testid="session-card"]').first()
    const output = firstCard.locator('[data-testid="session-output"]')

    const text = await output.textContent()
    expect(text?.length).toBeLessThanOrEqual(60)
  })

  /**
   * AC6: Auto-Refresh (Polling 10s)
   * Tested in Unit Tests (useSessionPolling.test.ts)
   */
  test('AC6: polls API every 10 seconds', async ({ page }) => {
    let requestCount = 0

    await page.route('**/api/sessions', (route) => {
      requestCount++
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sessions: [] })
      })
    })

    await page.goto('/')
    await page.waitForTimeout(11000) // 11s warten

    expect(requestCount).toBeGreaterThanOrEqual(2) // Initial + 1 Poll
  })
})
