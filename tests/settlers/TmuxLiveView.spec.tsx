/**
 * TmuxLiveView Unit Tests
 * Testet: Rendering, Session-Liste, Output-Polling, Chat-Eingabe
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react' // cleanup used in Session-Liste afterEach
import React from 'react'

// Mock useLiveSessionPolling so we control returned data without network
vi.mock('../../src/hooks/useLiveSessionPolling', () => ({
  useLiveSessionPolling: vi.fn(),
}))

import { TmuxLiveView } from '../../src/components/settlers/TmuxLiveView'
import { useLiveSessionPolling } from '../../src/hooks/useLiveSessionPolling'

// --- Mock-Daten ---

const NAMES = ['alpha', 'bravo', 'charlie', 'delta', 'echo'] as const

const makeSessions = (count = 5) =>
  Array.from({ length: count }, (_, i) => ({
    name: `session-${NAMES[i]}`,
    agentName: `${NAMES[i][0].toUpperCase() + NAMES[i].slice(1)} Agent`,
    order: `Auftrag ${NAMES[i][0].toUpperCase() + NAMES[i].slice(1)}`,
    project: ['auth-service', 'docs', 'billing', 'qa', 'overflow'][i],
    status: 'active',
    lastActivity: new Date(Date.now() - i * 1000).toISOString(),
  }))

const mockTmuxOutput: Record<string, string> = {
  'session-alpha': '$ npm test\n ALL tests passed',
  'session-bravo': '$ git status\nOn branch main',
  'session-charlie': '$ python run.py\nProcessing...',
  'session-delta': '$ docker ps\nCONTAINER ID IMAGE',
}

const mockHook = useLiveSessionPolling as ReturnType<typeof vi.fn>

// --- Tests ---

describe('TmuxLiveView', () => {
  // 1. Rendering Test – synchronous, no timer manipulation needed
  describe('Rendering', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ output: '' }),
      })
    })

    afterEach(() => vi.restoreAllMocks())

    it('zeigt den Seitentitel an', () => {
      mockHook.mockReturnValue({ sessions: [], loading: false, error: null })
      render(<TmuxLiveView />)
      expect(screen.getByText(/Tmux Live Terminal/i)).toBeInTheDocument()
    })

    it('zeigt den Untertitel mit 3s Refresh-Hinweis', () => {
      mockHook.mockReturnValue({ sessions: [], loading: false, error: null })
      render(<TmuxLiveView />)
      expect(screen.getByText(/3s refresh/i)).toBeInTheDocument()
    })

    it('zeigt "Lade..." während loading=true', () => {
      mockHook.mockReturnValue({ sessions: [], loading: true, error: null })
      render(<TmuxLiveView />)
      expect(screen.getByText(/Lade\.\.\./i)).toBeInTheDocument()
    })

    it('blendet "Lade..." aus wenn loading=false', () => {
      mockHook.mockReturnValue({ sessions: [], loading: false, error: null })
      render(<TmuxLiveView />)
      expect(screen.queryByText(/Lade\.\.\./i)).not.toBeInTheDocument()
    })

    it('zeigt Fehlermeldung wenn error gesetzt', () => {
      mockHook.mockReturnValue({ sessions: [], loading: false, error: 'Network Error' })
      render(<TmuxLiveView />)
      expect(screen.getByText(/Fehler:/i)).toBeInTheDocument()
      expect(screen.getByText(/Network Error/i)).toBeInTheDocument()
    })

    it('rendert ein 2×2 Grid mit genau 4 Feldern', () => {
      mockHook.mockReturnValue({ sessions: makeSessions(4), loading: false, error: null })
      render(<TmuxLiveView />)
      const grid = document.querySelector('.grid-cols-2.grid-rows-2')
      expect(grid).toBeInTheDocument()
      expect(grid!.children).toHaveLength(4)
    })
  })

  // 2. Session List Test
  // Sessions kommen synchron vom gemockten Hook – kein async flush nötig
  describe('Session-Liste', () => {
    beforeEach(() => {
      // fetch wird nie aufgerufen (Sessions synchron gemockt), aber vorhanden für useTmuxOutputPolling
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ output: '' }),
      })
    })

    afterEach(() => {
      vi.clearAllMocks() // clearAllMocks preserves mock implementations; restoreAllMocks would disconnect module mocks
    })

    it('zeigt maximal 4 Sessions an – 5. wird nicht angezeigt', () => {
      mockHook.mockReturnValue({ sessions: makeSessions(5), loading: false, error: null })
      render(<TmuxLiveView />)

      // h3 enthält "🖥️ Auftrag Alpha" → Regex für partial match
      expect(screen.getByText(/Auftrag Alpha/)).toBeInTheDocument()
      expect(screen.getByText(/Auftrag Bravo/)).toBeInTheDocument()
      expect(screen.getByText(/Auftrag Charlie/)).toBeInTheDocument()
      expect(screen.getByText(/Auftrag Delta/)).toBeInTheDocument()
      expect(screen.queryByText(/Auftrag Echo/)).not.toBeInTheDocument()
    })

    it('sortiert Sessions nach lastActivity – neueste zuerst, älteste nicht sichtbar', () => {
      // makeSessions: alpha=neueste (index 0), echo=älteste (index 4)
      // Nach Sort+Slice(0,4): alpha, bravo, charlie, delta → echo nicht sichtbar
      const sessions = makeSessions(5)
      mockHook.mockReturnValue({ sessions, loading: false, error: null })
      render(<TmuxLiveView />)

      expect(screen.getByText(/Auftrag Alpha/)).toBeInTheDocument()
      expect(screen.getByText(/Auftrag Delta/)).toBeInTheDocument()
      expect(screen.queryByText(/Auftrag Echo/)).not.toBeInTheDocument()
    })

    it('zeigt Agentname und Projektname pro Quarter', () => {
      mockHook.mockReturnValue({ sessions: makeSessions(2), loading: false, error: null })
      render(<TmuxLiveView />)

      expect(screen.getByText('Alpha Agent')).toBeInTheDocument()
      expect(screen.getByText('auth-service')).toBeInTheDocument()
    })

    it('zeigt "Kein Agent aktiv" für leere Slots bei 2 Sessions', () => {
      mockHook.mockReturnValue({ sessions: makeSessions(2), loading: false, error: null })
      render(<TmuxLiveView />)

      const emptySlots = screen.getAllByText(/Kein Agent aktiv/i)
      expect(emptySlots).toHaveLength(2)
    })

    it('zeigt 4 leere Slots wenn keine Sessions vorhanden', () => {
      mockHook.mockReturnValue({ sessions: [], loading: false, error: null })
      render(<TmuxLiveView />)

      const emptySlots = screen.getAllByText(/Kein Agent aktiv/i)
      expect(emptySlots).toHaveLength(4)
    })
  })

  // 3. Output Polling Test
  describe('Output-Polling', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.useRealTimers()
    })

    it('ruft /api/sessions/{name}/tmux-output für jede top-4 Session ab', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ output: '' }),
      })
      mockHook.mockReturnValue({ sessions: makeSessions(5), loading: false, error: null })

      render(<TmuxLiveView />)

      await vi.waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map(
          ([url]: [string]) => url
        )
        expect(calls).toContain('/api/sessions/session-alpha/tmux-output')
        expect(calls).toContain('/api/sessions/session-bravo/tmux-output')
        expect(calls).toContain('/api/sessions/session-charlie/tmux-output')
        expect(calls).toContain('/api/sessions/session-delta/tmux-output')
      }, { timeout: 1000 })
    })

    it('ruft tmux-output NICHT für die 5. Session ab', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ output: '' }),
      })
      mockHook.mockReturnValue({ sessions: makeSessions(5), loading: false, error: null })

      render(<TmuxLiveView />)

      await vi.waitFor(() => {
        expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
      }, { timeout: 1000 })

      vi.advanceTimersByTime(3000)

      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map(
        ([url]: [string]) => url
      )
      expect(calls.find((u: string) => u.includes('session-echo'))).toBeUndefined()
    })

    it('pollt erneut nach 3 Sekunden', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ output: '' }),
      })
      mockHook.mockReturnValue({ sessions: makeSessions(2), loading: false, error: null })

      render(<TmuxLiveView />)

      await vi.waitFor(() => {
        expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
      }, { timeout: 1000 })

      const callsAfterInit = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length

      vi.advanceTimersByTime(3000)

      await vi.waitFor(() => {
        const callsAfterPoll = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length
        expect(callsAfterPoll).toBeGreaterThan(callsAfterInit)
      }, { timeout: 1000 })
    })

    it('zeigt Platzhaltertext wenn kein Tmux-Output vorhanden', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ output: '' }),
      })
      mockHook.mockReturnValue({ sessions: makeSessions(1), loading: false, error: null })

      render(<TmuxLiveView />)

      // Fetch abwarten und State-Update
      await vi.waitFor(() => {
        expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
      }, { timeout: 1000 })

      // Nach State-Update: Platzhalter bleibt, da output=''
      expect(screen.getByText(/Warte auf Tmux-Output/i)).toBeInTheDocument()
    })

    it('zeigt Terminal-Output wenn tmux-output API Daten liefert', async () => {
      global.fetch = vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString()
        const match = url.match(/\/api\/sessions\/(.+)\/tmux-output/)
        if (match) {
          const name = decodeURIComponent(match[1])
          return Promise.resolve({
            ok: true,
            json: async () => ({ output: mockTmuxOutput[name] || '' }),
          } as Response)
        }
        return Promise.resolve({ ok: false, status: 404 } as Response)
      })

      mockHook.mockReturnValue({ sessions: makeSessions(1), loading: false, error: null })

      render(<TmuxLiveView />)

      // Flush the useEffect + fetch chain + React state update within act()
      await act(async () => {
        await Promise.resolve() // flush useEffect scheduling
        await Promise.resolve() // flush fetch()
        await Promise.resolve() // flush res.json()
        await Promise.resolve() // flush setOutputMap + re-render
      })

      const preElements = document.querySelectorAll('pre')
      const found = Array.from(preElements).some(el => el.textContent?.includes('npm test'))
      expect(found).toBe(true)
    })
  })

  // 4. Chat-Eingabe Test
  // TmuxLiveView ist eine reine Terminal-Ansicht ohne Chat-Eingabe.
  // Diese Tests sichern das Fehlen von Chat-UI gegen Regression ab.
  describe('Chat-Eingabe', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ output: '' }),
      })
    })

    afterEach(() => vi.restoreAllMocks())

    it('enthält kein Texteingabefeld (reine Terminal-Ansicht)', () => {
      mockHook.mockReturnValue({ sessions: makeSessions(4), loading: false, error: null })
      render(<TmuxLiveView />)

      expect(document.querySelector('input[type="text"]')).not.toBeInTheDocument()
      expect(document.querySelector('textarea')).not.toBeInTheDocument()
    })

    it('enthält keinen "Senden"-Button', () => {
      mockHook.mockReturnValue({ sessions: makeSessions(4), loading: false, error: null })
      render(<TmuxLiveView />)

      expect(
        screen.queryByRole('button', { name: /senden|send|submit/i })
      ).not.toBeInTheDocument()
    })
  })
})
