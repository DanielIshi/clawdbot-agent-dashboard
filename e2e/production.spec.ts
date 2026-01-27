import { test, expect } from '@playwright/test'

/**
 * Production E2E Tests for Agent Dashboard
 * These tests run against the live deployment
 */

test.describe('Production Dashboard', () => {
  test('should load the dashboard', async ({ page }) => {
    await page.goto('/')
    
    // Check page title or header
    await expect(page.locator('h1')).toContainText('Multi-Agent Command Center')
  })

  test('should render main UI elements', async ({ page }) => {
    await page.goto('/')
    
    // Header should be visible
    await expect(page.locator('header')).toBeVisible()
    
    // Navigation tabs
    await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Agenten Monitor' })).toBeVisible()
    
    // Refresh button
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible()
  })

  test('should connect to WebSocket and show Connected status', async ({ page }) => {
    // Capture console messages for debugging
    const consoleLogs: string[] = []
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`)
    })

    await page.goto('/')
    
    // Wait for WebSocket connection
    await page.waitForTimeout(3000)
    
    // Check connection status - should show "Connected"
    const connectionStatus = page.locator('[class*="ConnectionStatus"], [data-testid="connection-status"]')
    
    // If there's a connection indicator, check it
    const statusText = await page.locator('text=/Connected|Disconnected|Connecting/i').first()
    const status = await statusText.textContent()
    
    console.log('Connection status:', status)
    console.log('Console logs:', consoleLogs.join('\n'))
    
    // Should be connected (not disconnected or reconnecting)
    expect(status?.toLowerCase()).toContain('connected')
    expect(status?.toLowerCase()).not.toContain('disconnected')
  })

  test('should display stats in header', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    
    // Should show Agents count
    await expect(page.locator('text=Agents')).toBeVisible()
    
    // Should show Issues count  
    await expect(page.locator('text=Issues')).toBeVisible()
  })

  test('should have no JavaScript errors', async ({ page }) => {
    const errors: string[] = []
    
    page.on('pageerror', err => {
      errors.push(err.message)
    })
    
    await page.goto('/')
    await page.waitForTimeout(3000)
    
    // Log any errors found
    if (errors.length > 0) {
      console.log('JS Errors found:', errors)
    }
    
    // Should have no critical errors
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0)
  })

  test('WebSocket handshake should succeed', async ({ page }) => {
    // Track WebSocket messages
    const wsMessages: { sent: string[], received: string[] } = { sent: [], received: [] }
    
    // Intercept WebSocket
    await page.addInitScript(() => {
      const OriginalWebSocket = window.WebSocket
      window.WebSocket = class extends OriginalWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols)
          
          const originalSend = this.send.bind(this)
          this.send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
            console.log('[WS SENT]', data)
            return originalSend(data)
          }
          
          this.addEventListener('message', (event) => {
            console.log('[WS RECV]', event.data)
          })
        }
      }
    })
    
    const consoleLogs: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(text)
      if (text.includes('[WS')) {
        if (text.includes('SENT')) wsMessages.sent.push(text)
        if (text.includes('RECV')) wsMessages.received.push(text)
      }
    })
    
    await page.goto('/')
    await page.waitForTimeout(4000)
    
    console.log('=== WebSocket Traffic ===')
    console.log('Sent:', wsMessages.sent)
    console.log('Received:', wsMessages.received)
    
    // Verify handshake was sent
    const handshakeSent = wsMessages.sent.some(m => m.includes('handshake'))
    expect(handshakeSent).toBe(true)
    
    // Verify handshake_ack was received
    const handshakeAck = wsMessages.received.some(m => m.includes('handshake_ack'))
    expect(handshakeAck).toBe(true)
    
    // Should NOT have "Unknown message type" error
    const hasTypeError = wsMessages.received.some(m => m.includes('Unknown message type'))
    expect(hasTypeError).toBe(false)
  })
})
