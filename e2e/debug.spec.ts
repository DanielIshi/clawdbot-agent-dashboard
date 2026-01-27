import { test, expect } from '@playwright/test'

test('debug page load', async ({ page }) => {
  const errors: string[] = []
  const logs: string[] = []
  
  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`)
  })
  
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`)
  })
  
  await page.goto('/')
  await page.waitForTimeout(5000)
  
  console.log('\n=== CONSOLE LOGS ===')
  logs.forEach(log => console.log(log))
  
  console.log('\n=== PAGE ERRORS ===')
  errors.forEach(err => console.log(err))
  
  // Get page content
  const html = await page.content()
  console.log('\n=== PAGE HTML (first 2000 chars) ===')
  console.log(html.slice(0, 2000))
  
  // Check if root has content
  const rootContent = await page.locator('#root').innerHTML()
  console.log('\n=== #root innerHTML (first 500 chars) ===')
  console.log(rootContent.slice(0, 500))
  
  expect(errors).toHaveLength(0)
})
