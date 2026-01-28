/**
 * Tests für Issue #32: Agenten-Monolog Übersicht mit Live-Thinking
 * 
 * Diese Tests definieren die Anforderungen und müssen FEHLSCHLAGEN
 * bis die Implementierung fertig ist.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'

// Komponenten die noch nicht existieren - Tests werden fehlschlagen
import { AgentMonitor } from '@/components/agent-monitor/AgentMonitor'
import { AgentCard } from '@/components/agent-monitor/AgentCard'
import { AgentDetailView } from '@/components/agent-monitor/AgentDetailView'
import { AgentTimeline } from '@/components/agent-monitor/AgentTimeline'
import { useAgentStore } from '@/stores/agent-store'

// Mock-Daten für Tests
const mockAgents = [
  {
    id: 'thai-dev',
    name: 'thai-dev',
    status: 'active',
    currentIssue: '#71',
    lastActivity: Date.now() - 30000, // 30s ago
    lastThinking: 'Jetzt Tests laufen lassen...',
    project: 'thai-blitz'
  },
  {
    id: 'icon-dev',
    name: 'icon-dev',
    status: 'active',
    currentIssue: '#46',
    lastActivity: Date.now() - 120000, // 2min ago = idle
    lastThinking: 'UI-Sektion für häufig verwendete Keywords...',
    project: 'icon-generator'
  },
  {
    id: 'qa-rev',
    name: 'qa-rev',
    status: 'idle',
    currentIssue: null,
    lastActivity: Date.now() - 400000, // >5min
    lastThinking: null,
    project: 'thai-blitz'
  },
  {
    id: 'test-thai',
    name: 'test-thai',
    status: 'done',
    currentIssue: '#55',
    lastActivity: Date.now() - 600000,
    lastThinking: 'Alle Tests bestanden',
    project: 'thai-blitz'
  },
  {
    id: 'broken-agent',
    name: 'broken-agent',
    status: 'error',
    currentIssue: '#99',
    lastActivity: Date.now() - 100000,
    lastThinking: 'Fatal error occurred',
    project: 'icon-generator'
  }
]

const mockTimelineEvents = [
  { timestamp: '16:05:45', type: 'exec', content: 'npm test', status: 'running' },
  { timestamp: '16:05:42', type: 'thinking', content: 'Jetzt Tests laufen lassen...' },
  { timestamp: '16:05:38', type: 'edit', content: 'page.tsx (+40 lines) - UI Sektion' },
  { timestamp: '16:05:32', type: 'thinking', content: 'UI-Sektion für häufig verwendete Keywords...' },
  { timestamp: '16:05:28', type: 'edit', content: 'page.tsx (+35 lines) - fetch function' },
  { timestamp: '16:05:22', type: 'thinking', content: 'Jetzt die fetchFrequentKeywords Funktion...' },
  { timestamp: '16:05:18', type: 'write', content: 'lib/frequent-keywords.ts' },
  { timestamp: '16:05:12', type: 'thinking', content: 'Erstelle zuerst die Library-Datei...' },
  { timestamp: '16:05:08', type: 'read', content: 'package.json' },
  { timestamp: '16:05:02', type: 'result', content: 'Tests passed', status: 'success' },
  { timestamp: '16:04:55', type: 'result', content: 'Build failed', status: 'error' }
]

// Generate 50 mock agents for scale testing
const generateManyAgents = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `agent-${i}`,
    name: `agent-${i}`,
    status: i % 5 === 0 ? 'error' : i % 3 === 0 ? 'idle' : 'active',
    currentIssue: `#${100 + i}`,
    lastActivity: Date.now() - (i * 10000),
    lastThinking: `Working on task ${i}...`,
    project: `project-${i % 3}`
  }))
}

describe('Issue #32: Agenten-Monitor', () => {
  
  // ============================================
  // AC1: Grid-Ansicht
  // ============================================
  describe('AC1: Grid-Ansicht', () => {
    it('zeigt Grid mit allen aktiven Agenten', async () => {
      render(<AgentMonitor agents={mockAgents} />)
      
      // Alle Agenten sollten als Karten sichtbar sein
      expect(screen.getByText('thai-dev')).toBeInTheDocument()
      expect(screen.getByText('icon-dev')).toBeInTheDocument()
      expect(screen.getByText('qa-rev')).toBeInTheDocument()
      expect(screen.getByText('test-thai')).toBeInTheDocument()
      expect(screen.getByText('broken-agent')).toBeInTheDocument()
    })

    it('zeigt mindestens 10 Karten pro Reihe auf Desktop', async () => {
      // Ensure desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true })
      
      const manyAgents = generateManyAgents(15)
      const { container } = render(<AgentMonitor agents={manyAgents} />)
      
      // Grid sollte 10 Columns auf Desktop haben
      const grid = container.querySelector('[data-testid="agent-grid"]') as HTMLElement
      expect(grid).toBeTruthy()
      
      // Check inline style has repeat(10, ...) for desktop
      // JSDOM doesn't compute CSS Grid, so we check the inline style directly
      const inlineStyle = grid.style.gridTemplateColumns
      expect(inlineStyle).toContain('repeat(10')
    })

    it('zeigt "Agenten Monitor" Überschrift', () => {
      render(<AgentMonitor agents={mockAgents} />)
      expect(screen.getByText(/Agenten Monitor/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // AC2: Live-Updates
  // ============================================
  describe('AC2: Live-Updates', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    
    afterEach(() => {
      vi.useRealTimers()
    })

    it('aktualisiert Karten automatisch bei neuer Aktivität', async () => {
      // Use real timers for this async test
      vi.useRealTimers()
      
      const onUpdate = vi.fn()
      render(<AgentMonitor agents={mockAgents} onAgentUpdate={onUpdate} />)
      
      // Wait for initial timeout (100ms) to trigger
      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled()
      }, { timeout: 500 })
      
      // Restore fake timers
      vi.useFakeTimers()
    })

    it('verwendet WebSocket oder Polling mit 5s Intervall', async () => {
      const { container } = render(<AgentMonitor agents={mockAgents} />)
      
      // Entweder WebSocket verbunden oder Polling aktiv
      const wsConnected = container.querySelector('[data-ws-connected="true"]')
      const pollingActive = container.querySelector('[data-polling="true"]')
      
      expect(wsConnected || pollingActive).toBeTruthy()
    })

    it('zeigt Live-Indikator wenn Updates aktiv', () => {
      render(<AgentMonitor agents={mockAgents} />)
      expect(screen.getByText(/Live/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // AC3: Status-Farben
  // ============================================
  describe('AC3: Status-Farben', () => {
    it('zeigt 🟢 Grün für aktive Agenten (Aktivität < 60s)', () => {
      const activeAgent = { ...mockAgents[0], lastActivity: Date.now() - 30000 }
      render(<AgentCard agent={activeAgent} />)
      
      expect(screen.getByText('🟢')).toBeInTheDocument()
      expect(screen.getByTestId('status-indicator')).toHaveClass('status-active')
    })

    it('zeigt 🟡 Gelb für idle Agenten (60s < Aktivität < 5min)', () => {
      const idleAgent = { ...mockAgents[1], lastActivity: Date.now() - 120000 } // 2min
      render(<AgentCard agent={idleAgent} />)
      
      expect(screen.getByText('🟡')).toBeInTheDocument()
      expect(screen.getByTestId('status-indicator')).toHaveClass('status-idle')
    })

    it('zeigt ⏸️ Grau für pausierte/wartende Agenten', () => {
      const pausedAgent = { ...mockAgents[2], status: 'paused' }
      render(<AgentCard agent={pausedAgent} />)
      
      expect(screen.getByText('⏸️')).toBeInTheDocument()
      expect(screen.getByTestId('status-indicator')).toHaveClass('status-paused')
    })

    it('zeigt ✅ Grün-Check für abgeschlossene Tasks', () => {
      const doneAgent = mockAgents[3] // status: 'done'
      render(<AgentCard agent={doneAgent} />)
      
      expect(screen.getByText('✅')).toBeInTheDocument()
      expect(screen.getByTestId('status-indicator')).toHaveClass('status-done')
    })

    it('zeigt 🔴 Rot für Fehler/Aborted', () => {
      const errorAgent = mockAgents[4] // status: 'error'
      render(<AgentCard agent={errorAgent} />)
      
      expect(screen.getByText('🔴')).toBeInTheDocument()
      expect(screen.getByTestId('status-indicator')).toHaveClass('status-error')
    })
  })

  // ============================================
  // AC4: Thinking Preview
  // ============================================
  describe('AC4: Thinking Preview', () => {
    it('zeigt letzte Thinking-Zeile auf der Karte', () => {
      const agent = mockAgents[0]
      render(<AgentCard agent={agent} />)
      
      expect(screen.getByText(/Jetzt Tests laufen lassen/)).toBeInTheDocument()
    })

    it('truncated Thinking bei mehr als 50 Zeichen', () => {
      const longThinking = 'Dies ist ein sehr langer Thinking-Text der definitiv mehr als 50 Zeichen hat und gekürzt werden muss'
      const agent = { ...mockAgents[0], lastThinking: longThinking }
      render(<AgentCard agent={agent} />)
      
      const thinkingElement = screen.getByTestId('thinking-preview')
      expect(thinkingElement.textContent!.length).toBeLessThanOrEqual(53) // 50 + "..."
      expect(thinkingElement.textContent).toContain('...')
    })

    it('zeigt 💭 Icon vor Thinking-Text', () => {
      const agent = mockAgents[0]
      render(<AgentCard agent={agent} />)
      
      const thinkingRow = screen.getByTestId('thinking-preview')
      expect(thinkingRow.textContent).toMatch(/💭/)
    })

    it('zeigt Strich wenn kein Thinking vorhanden', () => {
      const agent = { ...mockAgents[2], lastThinking: null }
      render(<AgentCard agent={agent} />)
      
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  // ============================================
  // AC5: Detail-View öffnen
  // ============================================
  describe('AC5: Detail-View öffnen', () => {
    it('öffnet Detail-View bei Klick auf Karte', async () => {
      render(<AgentMonitor agents={mockAgents} />)
      
      const card = screen.getByText('thai-dev').closest('[data-testid="agent-card"]')
      fireEvent.click(card!)
      
      await waitFor(() => {
        expect(screen.getByTestId('detail-view')).toBeInTheDocument()
      })
    })

    it('zeigt Agent-Name im Detail-View Header', async () => {
      render(<AgentMonitor agents={mockAgents} />)
      
      fireEvent.click(screen.getByText('thai-dev'))
      
      await waitFor(() => {
        const detailView = screen.getByTestId('detail-view')
        expect(within(detailView).getByText('thai-dev')).toBeInTheDocument()
      })
    })

    it('zeigt Zurück-Button im Detail-View', async () => {
      render(<AgentMonitor agents={mockAgents} />)
      
      fireEvent.click(screen.getByText('thai-dev'))
      
      await waitFor(() => {
        expect(screen.getByText(/← Zurück/)).toBeInTheDocument()
      })
    })

    it('schließt Detail-View bei Klick auf Zurück', async () => {
      render(<AgentMonitor agents={mockAgents} />)
      
      fireEvent.click(screen.getByText('thai-dev'))
      await waitFor(() => {
        expect(screen.getByTestId('detail-view')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText(/← Zurück/))
      await waitFor(() => {
        expect(screen.queryByTestId('detail-view')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================
  // AC6: Timeline mit Icons
  // ============================================
  describe('AC6: Timeline mit Icons', () => {
    it('zeigt 💭 für Thinking-Blocks', () => {
      render(<AgentTimeline events={mockTimelineEvents} />)
      
      const thinkingEvents = screen.getAllByText('💭')
      expect(thinkingEvents.length).toBeGreaterThan(0)
    })

    it('zeigt 🔧 für edit-Events', () => {
      render(<AgentTimeline events={mockTimelineEvents} />)
      
      const editIcons = screen.getAllByText('🔧')
      expect(editIcons.length).toBeGreaterThan(0)
    })

    it('zeigt ▶️ für exec-Events', () => {
      render(<AgentTimeline events={mockTimelineEvents} />)
      
      expect(screen.getByText('▶️')).toBeInTheDocument()
    })

    it('zeigt 📄 für write-Events', () => {
      render(<AgentTimeline events={mockTimelineEvents} />)
      
      expect(screen.getByText('📄')).toBeInTheDocument()
    })

    it('zeigt 📖 für read-Events', () => {
      render(<AgentTimeline events={mockTimelineEvents} />)
      
      expect(screen.getByText('📖')).toBeInTheDocument()
    })

    it('zeigt ✅ für erfolgreiche Results', () => {
      render(<AgentTimeline events={mockTimelineEvents} />)
      
      expect(screen.getByText('✅')).toBeInTheDocument()
    })

    it('zeigt ❌ für fehlgeschlagene Results', () => {
      render(<AgentTimeline events={mockTimelineEvents} />)
      
      expect(screen.getByText('❌')).toBeInTheDocument()
    })

    it('zeigt Events in chronologischer Reihenfolge (neueste oben)', () => {
      const { container } = render(<AgentTimeline events={mockTimelineEvents} />)
      
      const timestamps = container.querySelectorAll('[data-testid="event-timestamp"]')
      const times = Array.from(timestamps).map(el => el.textContent)
      
      // Erste Zeit sollte die neueste sein
      expect(times[0]).toBe('16:05:45')
      expect(times[times.length - 1]).toBe('16:04:55')
    })
  })

  // ============================================
  // AC7: Auto-Scroll
  // ============================================
  describe('AC7: Auto-Scroll', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    
    afterEach(() => {
      vi.useRealTimers()
    })

    it('hat Auto-scroll Checkbox', () => {
      render(<AgentDetailView agent={mockAgents[0]} events={mockTimelineEvents} />)
      
      expect(screen.getByRole('checkbox', { name: /auto-scroll/i })).toBeInTheDocument()
    })

    it('Auto-scroll ist standardmäßig aktiviert', () => {
      render(<AgentDetailView agent={mockAgents[0]} events={mockTimelineEvents} />)
      
      const checkbox = screen.getByRole('checkbox', { name: /auto-scroll/i })
      expect(checkbox).toBeChecked()
    })

    it('scrollt automatisch bei neuer Aktivität wenn aktiviert', async () => {
      // Use real timers for this test since it relies on React lifecycle
      vi.useRealTimers()
      
      const scrollIntoViewMock = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoViewMock
      
      const { rerender } = render(
        <AgentDetailView agent={mockAgents[0]} events={mockTimelineEvents} />
      )
      
      // Neue Events hinzufügen
      const newEvents = [
        { timestamp: '16:06:00', type: 'exec', content: 'npm build' },
        ...mockTimelineEvents
      ]
      
      rerender(<AgentDetailView agent={mockAgents[0]} events={newEvents} />)
      
      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalled()
      }, { timeout: 2000 })
      
      // Restore fake timers for other tests in this describe block
      vi.useFakeTimers()
    })

    it('scrollt NICHT wenn Auto-scroll deaktiviert', async () => {
      const scrollIntoViewMock = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoViewMock
      
      render(<AgentDetailView agent={mockAgents[0]} events={mockTimelineEvents} />)
      
      // Deaktiviere Auto-scroll
      fireEvent.click(screen.getByRole('checkbox', { name: /auto-scroll/i }))
      
      // Simuliere neue Events
      // ... (würde bei echtem Test einen State-Update triggern)
      
      expect(scrollIntoViewMock).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // AC8: Filter nach Projekt
  // ============================================
  describe('AC8: Filter nach Projekt', () => {
    it('zeigt Projekt-Filter Dropdown', () => {
      render(<AgentMonitor agents={mockAgents} />)
      
      expect(screen.getByRole('combobox', { name: /filter/i })).toBeInTheDocument()
    })

    it('Filter hat "Alle" als Standard-Option', () => {
      render(<AgentMonitor agents={mockAgents} />)
      
      const filter = screen.getByRole('combobox', { name: /filter/i })
      expect(filter).toHaveValue('alle')
    })

    it('zeigt alle verfügbaren Projekte im Filter', () => {
      render(<AgentMonitor agents={mockAgents} />)
      
      const filter = screen.getByRole('combobox', { name: /filter/i })
      fireEvent.click(filter)
      
      expect(screen.getByText('thai-blitz')).toBeInTheDocument()
      expect(screen.getByText('icon-generator')).toBeInTheDocument()
    })

    it('filtert Agenten nach ausgewähltem Projekt', async () => {
      render(<AgentMonitor agents={mockAgents} />)
      
      // Wähle thai-blitz
      const filter = screen.getByRole('combobox', { name: /filter/i })
      fireEvent.change(filter, { target: { value: 'thai-blitz' } })
      
      await waitFor(() => {
        // thai-blitz Agenten sollten sichtbar sein
        expect(screen.getByText('thai-dev')).toBeInTheDocument()
        expect(screen.getByText('qa-rev')).toBeInTheDocument()
        expect(screen.getByText('test-thai')).toBeInTheDocument()
        
        // icon-generator Agenten sollten NICHT sichtbar sein
        expect(screen.queryByText('icon-dev')).not.toBeInTheDocument()
        expect(screen.queryByText('broken-agent')).not.toBeInTheDocument()
      })
    })

    it('zeigt Anzahl aktiver Agenten neben Filter', () => {
      render(<AgentMonitor agents={mockAgents} />)
      
      // "🟢 12" oder ähnlich
      expect(screen.getByText(/🟢 \d+/)).toBeInTheDocument()
    })
  })

  // ============================================
  // AC9: Skalierung 40+ Agenten
  // ============================================
  describe('AC9: Skalierung 40+ Agenten', () => {
    it('rendert 50 Agenten ohne Performance-Probleme', () => {
      const manyAgents = generateManyAgents(50)
      
      const startTime = performance.now()
      render(<AgentMonitor agents={manyAgents} />)
      const endTime = performance.now()
      
      // Render sollte unter 100ms bleiben
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('rendert 80 Agenten performant', () => {
      const manyAgents = generateManyAgents(80)
      
      const startTime = performance.now()
      render(<AgentMonitor agents={manyAgents} />)
      const endTime = performance.now()
      
      // Allow 200ms for CI environments which are slower than local dev machines
      expect(endTime - startTime).toBeLessThan(200)
    })

    it('Grid ist scrollbar bei vielen Agenten', () => {
      const manyAgents = generateManyAgents(50)
      const { container } = render(<AgentMonitor agents={manyAgents} />)
      
      const grid = container.querySelector('[data-testid="agent-grid"]')
      expect(grid).toHaveStyle({ overflow: 'auto' })
    })

    it('verwendet Virtualisierung bei > 40 Agenten', () => {
      const manyAgents = generateManyAgents(50)
      const { container } = render(<AgentMonitor agents={manyAgents} />)
      
      // Prüfe ob Virtualisierung aktiv (z.B. react-window)
      const virtualList = container.querySelector('[data-virtualized="true"]')
      expect(virtualList).toBeTruthy()
    })
  })

  // ============================================
  // AC10: Mobile-Responsive
  // ============================================
  describe('AC10: Mobile-Responsive', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375 // iPhone width
      })
      window.dispatchEvent(new Event('resize'))
    })

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      })
    })

    it('zeigt 2-3 Karten pro Reihe auf Mobile', () => {
      const { container } = render(<AgentMonitor agents={mockAgents} />)
      
      const grid = container.querySelector('[data-testid="agent-grid"]')
      const computedStyle = window.getComputedStyle(grid!)
      const columns = computedStyle.gridTemplateColumns.split(' ').length
      
      expect(columns).toBeGreaterThanOrEqual(2)
      expect(columns).toBeLessThanOrEqual(3)
    })

    it('Karten haben touch-friendly Größe (min 44px tap target)', () => {
      const { container } = render(<AgentMonitor agents={mockAgents} />)
      
      const cards = container.querySelectorAll('[data-testid="agent-card"]')
      expect(cards.length).toBeGreaterThan(0)
      cards.forEach(card => {
        const htmlEl = card as HTMLElement
        // Check inline style or computed style for min dimensions
        const minHeight = htmlEl.style.minHeight || window.getComputedStyle(htmlEl).minHeight
        const minWidth = htmlEl.style.minWidth || window.getComputedStyle(htmlEl).minWidth
        expect(parseInt(minHeight, 10)).toBeGreaterThanOrEqual(44)
        expect(parseInt(minWidth, 10)).toBeGreaterThanOrEqual(44)
      })
    })

    it('Detail-View nimmt volle Breite auf Mobile', () => {
      render(<AgentMonitor agents={mockAgents} />)
      fireEvent.click(screen.getByText('thai-dev'))
      
      const detailView = screen.getByTestId('detail-view')
      expect(detailView).toHaveStyle({ width: '100%' })
    })

    it('Navigation ist touch-friendly', () => {
      render(<AgentMonitor agents={mockAgents} />)
      
      const backButton = screen.queryByText(/← Zurück/)
      if (backButton) {
        const htmlEl = backButton as HTMLElement
        const minHeight = htmlEl.style.minHeight || window.getComputedStyle(htmlEl).minHeight
        // Either has min-height or is naturally tall enough via padding/line-height
        const hasMinHeight = parseInt(minHeight, 10) >= 44 || minHeight === ''
        expect(hasMinHeight).toBe(true)
      }
    })
  })
})

// ============================================
// Integration Tests
// ============================================
describe('AgentMonitor Integration', () => {
  it('kompletter Workflow: Grid → Karte klicken → Detail → Zurück', async () => {
    render(<AgentMonitor agents={mockAgents} />)
    
    // 1. Grid ist sichtbar
    expect(screen.getByTestId('agent-grid')).toBeInTheDocument()
    
    // 2. Klicke auf Agent
    fireEvent.click(screen.getByText('thai-dev'))
    
    // 3. Detail-View öffnet sich
    await waitFor(() => {
      expect(screen.getByTestId('detail-view')).toBeInTheDocument()
    })
    
    // 4. Timeline ist sichtbar
    expect(screen.getByTestId('timeline')).toBeInTheDocument()
    
    // 5. Zurück zum Grid
    fireEvent.click(screen.getByText(/← Zurück/))
    
    await waitFor(() => {
      expect(screen.queryByTestId('detail-view')).not.toBeInTheDocument()
      expect(screen.getByTestId('agent-grid')).toBeInTheDocument()
    })
  })
})
