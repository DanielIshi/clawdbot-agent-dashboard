/**
 * E2E Tests für Issue #32: Agenten-Monolog Übersicht mit Live-Thinking
 * 
 * Diese Playwright E2E Tests überprüfen das vollständige User-Experience
 * für das Agent-Monitor Feature. Tests sind designed to FAIL bis das
 * Feature implementiert ist.
 */

import { test, expect } from '@playwright/test';

test.describe('Issue #32: Agent Monitor E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/agent-dashboard');
    
    // Mock agent data für Tests (über API oder localStorage)
    await page.addInitScript(() => {
      window.mockAgents = [
        {
          id: 'thai-dev',
          name: 'thai-dev',
          status: 'active',
          currentIssue: '#71',
          lastActivity: Date.now() - 30000,
          lastThinking: 'Jetzt Tests laufen lassen...',
          project: 'thai-blitz'
        },
        {
          id: 'icon-dev',
          name: 'icon-dev',
          status: 'active',
          currentIssue: '#46',
          lastActivity: Date.now() - 120000,
          lastThinking: 'UI-Sektion für häufig verwendete Keywords...',
          project: 'icon-generator'
        },
        {
          id: 'qa-rev',
          name: 'qa-rev',
          status: 'idle',
          currentIssue: null,
          lastActivity: Date.now() - 400000,
          lastThinking: null,
          project: 'thai-blitz'
        }
      ];
    });
  });

  // ============================================
  // AC1: Grid-Ansicht
  // ============================================
  test('AC1: Zeigt Agent-Monitor Grid mit allen aktiven Agenten', async ({ page }) => {
    // Navigate zum Agent-Monitor (sollte existieren)
    await page.click('text=Agenten Monitor');
    
    // Grid sollte sichtbar sein
    await expect(page.locator('[data-testid="agent-grid"]')).toBeVisible();
    
    // Überschrift sollte vorhanden sein
    await expect(page.locator('h1:has-text("Agenten Monitor")')).toBeVisible();
    
    // Agenten-Karten sollten sichtbar sein
    await expect(page.locator('[data-testid="agent-card"]:has-text("thai-dev")')).toBeVisible();
    await expect(page.locator('[data-testid="agent-card"]:has-text("icon-dev")')).toBeVisible();
    await expect(page.locator('[data-testid="agent-card"]:has-text("qa-rev")')).toBeVisible();
  });

  test('AC1: Grid zeigt mindestens 10 Karten pro Reihe auf Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.click('text=Agenten Monitor');
    
    const grid = page.locator('[data-testid="agent-grid"]');
    await expect(grid).toBeVisible();
    
    // CSS Grid sollte mindestens 10 Columns haben
    const gridColumns = await grid.evaluate(el => 
      getComputedStyle(el).gridTemplateColumns.split(' ').length
    );
    expect(gridColumns).toBeGreaterThanOrEqual(10);
  });

  // ============================================
  // AC2: Live-Updates
  // ============================================
  test('AC2: Live-Updates funktionieren automatisch', async ({ page }) => {
    await page.click('text=Agenten Monitor');
    
    // Live-Indikator sollte sichtbar sein
    await expect(page.locator('text=🟢 Live')).toBeVisible();
    
    // WebSocket Connection oder Polling aktiv
    const hasConnection = await page.locator('[data-ws-connected="true"], [data-polling="true"]').count();
    expect(hasConnection).toBeGreaterThan(0);
    
    // Simulate new activity (via WebSocket Mock oder API)
    await page.evaluate(() => {
      // Mock new activity
      window.dispatchEvent(new CustomEvent('agentUpdate', {
        detail: { agentId: 'thai-dev', lastThinking: 'New thinking update...' }
      }));
    });
    
    // Card sollte sich automatisch updaten
    await expect(page.locator('[data-testid="agent-card"]:has-text("New thinking update")')).toBeVisible();
  });

  // ============================================
  // AC3: Status-Farben
  // ============================================
  test('AC3: Status-Indikatoren zeigen korrekte Farben und Icons', async ({ page }) => {
    await page.click('text=Agenten Monitor');
    
    // Aktiver Agent: 🟢 Grün
    const activeAgent = page.locator('[data-testid="agent-card"]:has-text("thai-dev")');
    await expect(activeAgent.locator('[data-testid="status-indicator"]')).toContainText('🟢');
    await expect(activeAgent.locator('[data-testid="status-indicator"]')).toHaveClass(/status-active/);
    
    // Idle Agent nach >60s: 🟡 Gelb
    const idleAgent = page.locator('[data-testid="agent-card"]:has-text("icon-dev")');
    await expect(idleAgent.locator('[data-testid="status-indicator"]')).toContainText('🟡');
    await expect(idleAgent.locator('[data-testid="status-indicator"]')).toHaveClass(/status-idle/);
    
    // Pausiert: ⏸️ Grau
    const pausedAgent = page.locator('[data-testid="agent-card"]:has-text("qa-rev")');
    await expect(pausedAgent.locator('[data-testid="status-indicator"]')).toContainText('⏸️');
  });

  // ============================================
  // AC4: Thinking Preview
  // ============================================
  test('AC4: Thinking Preview wird auf Karten angezeigt', async ({ page }) => {
    await page.click('text=Agenten Monitor');
    
    // Thinking mit 💭 Icon
    const thinkingCard = page.locator('[data-testid="agent-card"]:has-text("thai-dev")');
    await expect(thinkingCard.locator('[data-testid="thinking-preview"]')).toContainText('💭');
    await expect(thinkingCard.locator('[data-testid="thinking-preview"]')).toContainText('Jetzt Tests laufen lassen');
    
    // Kein Thinking: — (Strich)
    const noThinkingCard = page.locator('[data-testid="agent-card"]:has-text("qa-rev")');
    await expect(noThinkingCard.locator('[data-testid="thinking-preview"]')).toContainText('—');
  });

  test('AC4: Thinking wird nach 50 Zeichen gekürzt', async ({ page }) => {
    // Mock langen Thinking-Text
    await page.addInitScript(() => {
      window.mockAgents[0].lastThinking = 'Dies ist ein sehr langer Thinking-Text der definitiv mehr als fünfzig Zeichen hat und gekürzt werden muss';
    });
    
    await page.click('text=Agenten Monitor');
    
    const thinkingElement = page.locator('[data-testid="thinking-preview"]').first();
    const text = await thinkingElement.textContent();
    expect(text!.length).toBeLessThanOrEqual(53); // 50 + "💭 " + "..."
    expect(text).toContain('...');
  });

  // ============================================
  // AC5: Detail-View öffnen
  // ============================================
  test('AC5: Detail-View öffnet sich bei Klick auf Karte', async ({ page }) => {
    await page.click('text=Agenten Monitor');
    
    // Klick auf Agent-Karte
    await page.click('[data-testid="agent-card"]:has-text("thai-dev")');
    
    // Detail-View sollte öffnen
    await expect(page.locator('[data-testid="detail-view"]')).toBeVisible();
    
    // Agent-Name im Header
    await expect(page.locator('[data-testid="detail-view"] h2:has-text("thai-dev")')).toBeVisible();
    
    // Issue Number
    await expect(page.locator('[data-testid="detail-view"]:has-text("#71")')).toBeVisible();
    
    // Live-Status
    await expect(page.locator('[data-testid="detail-view"]:has-text("🟢 Live")')).toBeVisible();
  });

  test('AC5: Zurück-Button schließt Detail-View', async ({ page }) => {
    await page.click('text=Agenten Monitor');
    await page.click('[data-testid="agent-card"]:has-text("thai-dev")');
    
    // Detail-View ist offen
    await expect(page.locator('[data-testid="detail-view"]')).toBeVisible();
    
    // Zurück klicken
    await page.click('text=← Zurück');
    
    // Detail-View sollte schließen, Grid wieder sichtbar
    await expect(page.locator('[data-testid="detail-view"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="agent-grid"]')).toBeVisible();
  });

  // ============================================
  // AC6: Timeline mit Icons
  // ============================================
  test('AC6: Timeline zeigt Events mit korrekten Icons', async ({ page }) => {
    await page.click('text=Agenten Monitor');
    await page.click('[data-testid="agent-card"]:has-text("thai-dev")');
    
    const timeline = page.locator('[data-testid="timeline"]');
    await expect(timeline).toBeVisible();
    
    // Icons für verschiedene Event-Types
    await expect(timeline.locator(':has-text("💭")')).toBeVisible(); // Thinking
    await expect(timeline.locator(':has-text("🔧")')).toBeVisible(); // Edit
    await expect(timeline.locator(':has-text("▶️")')).toBeVisible(); // Exec
    await expect(timeline.locator(':has-text("📄")')).toBeVisible(); // Write
    await expect(timeline.locator(':has-text("📖")')).toBeVisible(); // Read
    await expect(timeline.locator(':has-text("✅")')).toBeVisible(); // Success
    await expect(timeline.locator(':has-text("❌")')).toBeVisible(); // Error
  });

  test('AC6: Timeline zeigt Events in chronologischer Reihenfolge (neueste oben)', async ({ page }) => {
    await page.click('text=Agenten Monitor');
    await page.click('[data-testid="agent-card"]:has-text("thai-dev")');
    
    const timestamps = page.locator('[data-testid="event-timestamp"]');
    const firstTimestamp = await timestamps.first().textContent();
    const lastTimestamp = await timestamps.last().textContent();
    
    // Erste sollte neueste Zeit sein
    expect(firstTimestamp).toMatch(/1[6-9]:[0-5][0-9]:[0-5][0-9]/); // Format HH:MM:SS
    
    // Zeit-Vergleich: erste Zeit > letzte Zeit
    const first = new Date(`2024-01-01 ${firstTimestamp}`);
    const last = new Date(`2024-01-01 ${lastTimestamp}`);
    expect(first.getTime()).toBeGreaterThan(last.getTime());
  });

  // ============================================
  // AC7: Auto-Scroll
  // ============================================
  test('AC7: Auto-Scroll Funktionalität', async ({ page }) => {
    await page.click('text=Agenten Monitor');
    await page.click('[data-testid="agent-card"]:has-text("thai-dev")');
    
    // Auto-scroll Checkbox sollte vorhanden und checked sein
    const autoScrollCheckbox = page.locator('input[type="checkbox"]:near(:text("Auto-scroll"))');
    await expect(autoScrollCheckbox).toBeVisible();
    await expect(autoScrollCheckbox).toBeChecked();
    
    // Scroll Position am Ende
    const timeline = page.locator('[data-testid="timeline"]');
    const scrollTop = await timeline.evaluate(el => el.scrollTop);
    const scrollHeight = await timeline.evaluate(el => el.scrollHeight);
    const clientHeight = await timeline.evaluate(el => el.clientHeight);
    
    expect(scrollTop).toBeCloseTo(scrollHeight - clientHeight, 10);
  });

  test('AC7: Auto-Scroll kann deaktiviert werden', async ({ page }) => {
    await page.click('text=Agenten Monitor');
    await page.click('[data-testid="agent-card"]:has-text("thai-dev")');
    
    // Deaktiviere Auto-Scroll
    await page.uncheck('input[type="checkbox"]:near(:text("Auto-scroll"))');
    
    // Checkbox sollte unchecked sein
    await expect(page.locator('input[type="checkbox"]:near(:text("Auto-scroll"))')).not.toBeChecked();
    
    // Bei neuen Events sollte NICHT gescrollt werden
    // (würde in echter Implementierung getestet)
  });

  // ============================================
  // AC8: Filter nach Projekt
  // ============================================
  test('AC8: Projekt-Filter funktioniert', async ({ page }) => {
    await page.click('text=Agenten Monitor');
    
    // Filter-Dropdown sollte vorhanden sein
    const filter = page.locator('[data-testid="project-filter"]');
    await expect(filter).toBeVisible();
    await expect(filter).toHaveValue('alle');
    
    // Dropdown öffnen
    await page.click('[data-testid="project-filter"]');
    
    // Projekte sollten als Optionen verfügbar sein
    await expect(page.locator('option:has-text("thai-blitz")')).toBeVisible();
    await expect(page.locator('option:has-text("icon-generator")')).toBeVisible();
    
    // thai-blitz auswählen
    await page.selectOption('[data-testid="project-filter"]', 'thai-blitz');
    
    // Nur thai-blitz Agenten sollten sichtbar sein
    await expect(page.locator('[data-testid="agent-card"]:has-text("thai-dev")')).toBeVisible();
    await expect(page.locator('[data-testid="agent-card"]:has-text("qa-rev")')).toBeVisible();
    await expect(page.locator('[data-testid="agent-card"]:has-text("icon-dev")')).not.toBeVisible();
  });

  test('AC8: Anzahl aktiver Agenten wird angezeigt', async ({ page }) => {
    await page.click('text=Agenten Monitor');
    
    // Counter sollte sichtbar sein (🟢 + Number)
    await expect(page.locator(':has-text("🟢") >> :has-text(/\d+/)')).toBeVisible();
  });

  // ============================================
  // AC9: Skalierung 40+ Agenten
  // ============================================
  test('AC9: Performance mit vielen Agenten', async ({ page }) => {
    // Mock 50 Agenten
    await page.addInitScript(() => {
      window.mockAgents = Array.from({ length: 50 }, (_, i) => ({
        id: `agent-${i}`,
        name: `agent-${i}`,
        status: i % 5 === 0 ? 'error' : i % 3 === 0 ? 'idle' : 'active',
        currentIssue: `#${100 + i}`,
        lastActivity: Date.now() - (i * 10000),
        lastThinking: `Working on task ${i}...`,
        project: `project-${i % 3}`
      }));
    });
    
    await page.click('text=Agenten Monitor');
    
    // Measure render performance
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="agent-grid"]');
    const endTime = Date.now();
    
    // Should render in under 100ms
    expect(endTime - startTime).toBeLessThan(100);
    
    // Grid should be scrollable
    const grid = page.locator('[data-testid="agent-grid"]');
    const isScrollable = await grid.evaluate(el => 
      el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth
    );
    expect(isScrollable).toBe(true);
    
    // Should show virtualization for performance
    await expect(page.locator('[data-virtualized="true"]')).toBeVisible();
  });

  // ============================================
  // AC10: Mobile-Responsive
  // ============================================
  test('AC10: Mobile-Responsive Design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    await page.click('text=Agenten Monitor');
    
    // Grid sollte 2-3 Columns haben auf Mobile
    const grid = page.locator('[data-testid="agent-grid"]');
    const gridColumns = await grid.evaluate(el => 
      getComputedStyle(el).gridTemplateColumns.split(' ').length
    );
    expect(gridColumns).toBeGreaterThanOrEqual(2);
    expect(gridColumns).toBeLessThanOrEqual(3);
    
    // Karten sollten touch-friendly sein (min 44px)
    const firstCard = page.locator('[data-testid="agent-card"]').first();
    const cardSize = await firstCard.boundingBox();
    expect(cardSize!.height).toBeGreaterThanOrEqual(44);
    expect(cardSize!.width).toBeGreaterThanOrEqual(44);
  });

  test('AC10: Mobile Detail-View nimmt volle Breite', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('text=Agenten Monitor');
    await page.click('[data-testid="agent-card"]', { timeout: 5000 });
    
    const detailView = page.locator('[data-testid="detail-view"]');
    const detailSize = await detailView.boundingBox();
    const viewportWidth = await page.viewportSize();
    
    // Detail-View sollte fast volle Breite haben (minus Padding)
    expect(detailSize!.width).toBeGreaterThan(viewportWidth!.width * 0.9);
  });

  // ============================================
  // Integration Test: Full Workflow
  // ============================================
  test('Integration: Kompletter User-Workflow', async ({ page }) => {
    // 1. Navigate to Agent Monitor
    await page.click('text=Agenten Monitor');
    await expect(page.locator('[data-testid="agent-grid"]')).toBeVisible();
    
    // 2. Filter by project
    await page.selectOption('[data-testid="project-filter"]', 'thai-blitz');
    await expect(page.locator('[data-testid="agent-card"]:has-text("thai-dev")')).toBeVisible();
    
    // 3. Click on agent card
    await page.click('[data-testid="agent-card"]:has-text("thai-dev")');
    await expect(page.locator('[data-testid="detail-view"]')).toBeVisible();
    
    // 4. Check timeline
    await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
    
    // 5. Toggle auto-scroll
    await page.uncheck('input[type="checkbox"]:near(:text("Auto-scroll"))');
    
    // 6. Go back to grid
    await page.click('text=← Zurück');
    await expect(page.locator('[data-testid="agent-grid"]')).toBeVisible();
    
    // 7. Reset filter to show all
    await page.selectOption('[data-testid="project-filter"]', 'alle');
    await expect(page.locator('[data-testid="agent-card"]')).toHaveCount(3);
  });
});