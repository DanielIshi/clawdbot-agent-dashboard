import { test, expect } from '@playwright/test';

const BASE_URL = 'https://apps.srv947487.hstgr.cloud';

test.describe('Cost Dashboard E2E', () => {

  test('API: /api/cost/models returns models', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/cost/models`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.models).toBeDefined();
    expect(data.models.length).toBeGreaterThan(0);
    console.log('Models:', data.models);
  });

  test('API: /api/cost/summary returns today data', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/cost/summary?period=today`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.period).toBe('today');
    expect(data.total_cost).toBeGreaterThanOrEqual(0);
    expect(data.request_count).toBeGreaterThanOrEqual(0);
    expect(data.by_model).toBeDefined();
    expect(data.by_category).toBeDefined();
    expect(data.budget).toBeDefined();
    console.log(`Today: $${data.total_cost.toFixed(2)}, ${data.request_count} requests`);
  });

  test('API: /api/cost/timeseries returns hourly buckets', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/cost/timeseries?interval=1h`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.interval).toBe('1h');
    expect(data.buckets).toBeDefined();
    expect(Array.isArray(data.buckets)).toBeTruthy();
    console.log(`Timeseries: ${data.buckets.length} hourly buckets`);
  });

  test('API: /api/cost/timeseries supports all intervals', async ({ request }) => {
    for (const interval of ['1m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']) {
      const res = await request.get(`${BASE_URL}/api/cost/timeseries?interval=${interval}`);
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data.interval).toBe(interval);
      console.log(`  ${interval}: ${data.buckets.length} buckets`);
    }
  });

  test('API: /api/cost/budget returns budget config', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/cost/budget`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.budget).toBeDefined();
    expect(data.budget.daily_budget).toBeGreaterThan(0);
    expect(data.budget.monthly_budget).toBeGreaterThan(0);
    console.log(`Budget: $${data.budget.daily_budget}/day, $${data.budget.monthly_budget}/month`);
  });

  test('Dashboard: page loads and shows Cost tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/agent-dashboard/`);
    await page.waitForLoadState('networkidle');

    // Desktop nav has Kosten button - use first() since it appears in desktop nav, drawer, and bottom nav
    const kostenTab = page.getByRole('button', { name: 'Kosten' }).first();
    await expect(kostenTab).toBeVisible();
  });

  test('Dashboard: Cost view renders with data', async ({ page }) => {
    await page.goto(`${BASE_URL}/agent-dashboard/`);
    await page.waitForLoadState('networkidle');

    // Click Kosten tab (desktop nav button)
    await page.getByRole('button', { name: 'Kosten' }).first().click();

    // Wait for cost dashboard to load
    await page.waitForTimeout(2000);

    // Check main elements
    await expect(page.getByText('Cost Analysis').first()).toBeVisible();
    await expect(page.getByText('Today').first()).toBeVisible();
    await expect(page.getByText('This Week').first()).toBeVisible();
    await expect(page.getByText('This Month').first()).toBeVisible();

    // Check interval selector buttons exist
    for (const iv of ['1m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']) {
      await expect(page.getByRole('button', { name: iv, exact: true }).first()).toBeVisible();
    }

    // Check cost data is displayed (dollar amounts)
    const pageText = await page.textContent('body');
    expect(pageText).toContain('$');

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/cost-dashboard.png', fullPage: true });
    console.log('Screenshot saved: e2e/screenshots/cost-dashboard.png');
  });

  test('Dashboard: interval switching works', async ({ page }) => {
    await page.goto(`${BASE_URL}/agent-dashboard/`);
    await page.waitForLoadState('networkidle');

    // Click Kosten tab
    await page.getByRole('button', { name: 'Kosten' }).first().click();
    await page.waitForTimeout(2000);

    // Click different intervals and verify they're active
    for (const iv of ['1d', '1h', '15m']) {
      await page.getByRole('button', { name: iv, exact: true }).first().click();
      await page.waitForTimeout(1000);

      // The active button should have blue background
      const btn = page.getByRole('button', { name: iv, exact: true }).first();
      const classes = await btn.getAttribute('class');
      expect(classes).toContain('bg-blue-600');
    }

    // Take final screenshot
    await page.screenshot({ path: 'e2e/screenshots/cost-dashboard-15m.png', fullPage: true });
  });

  test('Dashboard: budget bars show when over limit', async ({ page }) => {
    await page.goto(`${BASE_URL}/agent-dashboard/`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Kosten' }).first().click();
    await page.waitForTimeout(2000);

    // Budget section should be visible
    await expect(page.getByText('Budget').first()).toBeVisible();
    await expect(page.getByText('Daily').first()).toBeVisible();
    await expect(page.getByText('Monthly').first()).toBeVisible();
  });
});
