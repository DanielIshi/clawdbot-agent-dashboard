import { test } from '@playwright/test'

test('debug: seite mit base path laden', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  
  // Console errors einfangen
  const errors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  page.on('pageerror', e => errors.push(e.message))
  
  // Die App hat base path /agent-dashboard
  await page.goto('http://localhost:3456')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'test-results/debug-page.png' })

  const html = await page.content()
  console.log('ROOT content:', (await page.locator('#root').innerHTML()).slice(0, 200))
  
  const buttons = await page.locator('button').allTextContents()
  console.log('ALL BUTTONS:', JSON.stringify(buttons.slice(0, 10)))
  console.log('ERRORS:', JSON.stringify(errors.slice(0, 5)))
})
