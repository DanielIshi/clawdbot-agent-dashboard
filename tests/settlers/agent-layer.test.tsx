/**
 * Tests für AgentLayer Component (TDD)
 * Issue #55, AC7: Depth-Sorted Agent Rendering
 *
 * AgentLayer ist eine Canvas-Overlay-Komponente die:
 * - Agents nach Y-Koordinate depth-sorted rendert
 * - Jeden Agent als Voxel-Sprite zeichnet (drawAgentVoxels)
 * - Animations-State über requestAnimationFrame aktualisiert
 * - Cleanup bei Unmount durchführt (cancelAnimationFrame)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { AgentSprite, ViewportConfig } from '../../src/components/settlers/types'

// -----------------------------------------------------------------------
// Canvas Context Mock
// -----------------------------------------------------------------------
const createMockContext = () => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 50 })),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  fillStyle: '' as string,
  strokeStyle: '' as string,
  lineWidth: 1,
  font: '',
  textAlign: 'center' as CanvasTextAlign,
  globalAlpha: 1,
})

// -----------------------------------------------------------------------
// requestAnimationFrame / cancelAnimationFrame Mocks
// -----------------------------------------------------------------------
let rafCallback: FrameRequestCallback | null = null
let rafIdCounter = 0

beforeEach(() => {
  rafCallback = null
  rafIdCounter = 0

  HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockContext()) as any

  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
    rafCallback = cb
    rafIdCounter += 1
    return rafIdCounter
  }))

  vi.stubGlobal('cancelAnimationFrame', vi.fn())

  // ResizeObserver nicht in jsdom verfügbar – echter Konstruktor nötig
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

// -----------------------------------------------------------------------
// Test-Fixtures
// -----------------------------------------------------------------------
const makeAgent = (overrides: Partial<AgentSprite> = {}): AgentSprite => ({
  id: 'agent-test',
  name: 'Test Agent',
  type: 'claude',
  position: { x: 3, y: 4 },
  status: 'idle',
  color: '#36c37c',
  animation: {
    type: 'idle',
    frame: 0,
    progress: 0,
    startTime: 1000,
  },
  ...overrides,
})

const defaultViewport: ViewportConfig = {
  width: 800,
  height: 600,
  offsetX: 400,
  offsetY: 100,
}

// -----------------------------------------------------------------------
// Import der zu testenden Komponente (noch nicht implementiert – TDD)
// -----------------------------------------------------------------------
import { AgentLayer } from '../../src/components/settlers/AgentLayer'
import { sortAgentsByDepth } from '../../src/components/settlers/agentSorting'

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------
describe('AgentLayer', () => {
  // 1. Sollte ohne Agents rendern (leeres Array)
  it('sollte ohne Agents rendern (leeres Array)', () => {
    expect(() =>
      render(<AgentLayer agents={[]} viewport={defaultViewport} />)
    ).not.toThrow()

    const canvas = document.querySelector('canvas')
    expect(canvas).toBeTruthy()
  })

  // 2. Sollte Canvas-Element erstellen
  it('sollte ein Canvas-Element erstellen', () => {
    render(<AgentLayer agents={[]} viewport={defaultViewport} />)

    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
  })

  // 2a. Canvas sollte viewport-Dimensionen übernehmen
  it('sollte Canvas-Dimensionen aus viewport übernehmen', () => {
    render(<AgentLayer agents={[]} viewport={defaultViewport} />)

    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.width).toBe(defaultViewport.width)
    expect(canvas.height).toBe(defaultViewport.height)
  })

  // 2b. Canvas sollte absolut positioniert sein (Overlay über IsometricCanvas)
  it('sollte als absolut positioniertes Overlay gerendert werden', () => {
    const { container } = render(<AgentLayer agents={[]} viewport={defaultViewport} />)

    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    // Overlay bedeutet: position: absolute und pointer-events: none
    expect(canvas.style.position).toBe('absolute')
  })

  // 3. Sollte Agents nach Depth sortieren bevor gezeichnet wird
  it('sollte Agents nach Y-Koordinate depth-sortieren vor dem Zeichnen', () => {
    const agents: AgentSprite[] = [
      makeAgent({ id: 'front', position: { x: 0, y: 9 } }),
      makeAgent({ id: 'back',  position: { x: 0, y: 1 } }),
      makeAgent({ id: 'mid',   position: { x: 0, y: 5 } }),
    ]

    // sortAgentsByDepth direkt prüfen (Unit-Grundlage für den Komponenten-Test)
    const sorted = sortAgentsByDepth(agents)

    expect(sorted[0].id).toBe('back')   // y=1 zuerst
    expect(sorted[1].id).toBe('mid')    // y=5 als zweites
    expect(sorted[2].id).toBe('front')  // y=9 zuletzt

    // Komponente muss ohne Fehler rendern
    expect(() =>
      render(<AgentLayer agents={agents} viewport={defaultViewport} />)
    ).not.toThrow()
  })

  // 3a. Original-Array darf nicht mutiert werden
  it('sollte das originale agents-Array nicht verändern', () => {
    const agents: AgentSprite[] = [
      makeAgent({ id: 'front', position: { x: 0, y: 9 } }),
      makeAgent({ id: 'back',  position: { x: 0, y: 1 } }),
    ]

    const originalOrder = agents.map(a => a.id)
    render(<AgentLayer agents={agents} viewport={defaultViewport} />)

    // Original-Array bleibt unverändert
    expect(agents.map(a => a.id)).toEqual(originalOrder)
  })

  // 4. Sollte drawAgentVoxels für jeden Agent aufrufen
  it('sollte Canvas 2D-Kontext anfordern', () => {
    render(<AgentLayer agents={[makeAgent()]} viewport={defaultViewport} />)

    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.getContext).toHaveBeenCalledWith('2d')
  })

  it('sollte clearRect beim ersten Render aufrufen (Canvas wird geleert)', () => {
    const mockCtx = createMockContext()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as any

    render(<AgentLayer agents={[makeAgent()]} viewport={defaultViewport} />)

    // Trigger des ersten Animation-Frames
    if (rafCallback) {
      rafCallback(performance.now())
    }

    expect(mockCtx.clearRect).toHaveBeenCalledWith(
      0,
      0,
      defaultViewport.width,
      defaultViewport.height
    )
  })

  it('sollte beginPath für jeden Agent aufrufen (Voxel-Zeichnung startet)', () => {
    const mockCtx = createMockContext()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as any

    const agents = [
      makeAgent({ id: 'a1' }),
      makeAgent({ id: 'a2', position: { x: 5, y: 5 } }),
    ]

    render(<AgentLayer agents={agents} viewport={defaultViewport} />)

    if (rafCallback) {
      rafCallback(performance.now())
    }

    // beginPath wird mehrfach aufgerufen (mindestens einmal pro Voxel-Fläche pro Agent)
    expect(mockCtx.beginPath).toHaveBeenCalled()
  })

  // 5. Sollte einen AgentSpriteInfo anzeigen wenn showLabels=true
  it('sollte Agent-Label anzeigen wenn showLabels=true', () => {
    const mockCtx = createMockContext()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as any

    const agent = makeAgent({ name: 'Labelled Agent' })

    render(
      <AgentLayer
        agents={[agent]}
        viewport={defaultViewport}
        showLabels={true}
      />
    )

    if (rafCallback) {
      rafCallback(performance.now())
    }

    // fillText wird für den Label-Text aufgerufen
    expect(mockCtx.fillText).toHaveBeenCalled()
    const calls = mockCtx.fillText.mock.calls
    const labelCall = calls.find(args => String(args[0]).includes('Labelled Agent'))
    expect(labelCall).toBeDefined()
  })

  it('sollte KEIN Agent-Label zeichnen wenn showLabels=false', () => {
    const mockCtx = createMockContext()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as any

    const agent = makeAgent({ name: 'Hidden Agent' })

    render(
      <AgentLayer
        agents={[agent]}
        viewport={defaultViewport}
        showLabels={false}
      />
    )

    if (rafCallback) {
      rafCallback(performance.now())
    }

    const calls = mockCtx.fillText.mock.calls
    const labelCall = calls.find(args => String(args[0]).includes('Hidden Agent'))
    expect(labelCall).toBeUndefined()
  })

  it('sollte showLabels standardmaessig auf false setzen', () => {
    const mockCtx = createMockContext()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as any

    const agent = makeAgent({ name: 'Default Label Agent' })

    // Kein showLabels prop -> default false
    render(<AgentLayer agents={[agent]} viewport={defaultViewport} />)

    if (rafCallback) {
      rafCallback(performance.now())
    }

    const calls = mockCtx.fillText.mock.calls
    const labelCall = calls.find(args => String(args[0]).includes('Default Label Agent'))
    expect(labelCall).toBeUndefined()
  })

  // 6. Sollte cleanup bei Unmount durchführen (cancelAnimationFrame)
  it('sollte requestAnimationFrame beim Mount starten', () => {
    render(<AgentLayer agents={[]} viewport={defaultViewport} />)

    expect(requestAnimationFrame).toHaveBeenCalled()
  })

  it('sollte cancelAnimationFrame beim Unmount aufrufen', () => {
    const { unmount } = render(
      <AgentLayer agents={[makeAgent()]} viewport={defaultViewport} />
    )

    unmount()

    expect(cancelAnimationFrame).toHaveBeenCalled()
  })

  it('sollte die korrekte RAF-ID bei Unmount stornieren', () => {
    const { unmount } = render(
      <AgentLayer agents={[makeAgent()]} viewport={defaultViewport} />
    )

    // rafIdCounter ist 1 nach dem ersten requestAnimationFrame-Aufruf
    unmount()

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })

  it('sollte keine neuen RAF-Frames nach Unmount anfordern', () => {
    const { unmount } = render(
      <AgentLayer agents={[makeAgent()]} viewport={defaultViewport} />
    )

    const callsBefore = (requestAnimationFrame as ReturnType<typeof vi.fn>).mock.calls.length
    unmount()

    // Ersten Frame auslösen – nach Unmount sollte kein weiterer RAF gestartet werden
    if (rafCallback) {
      rafCallback(performance.now())
    }

    const callsAfter = (requestAnimationFrame as ReturnType<typeof vi.fn>).mock.calls.length
    // Nach Unmount keine weiteren RAF-Aufrufe
    expect(callsAfter).toBe(callsBefore)
  })

  // -----------------------------------------------------------------------
  // Edge Cases
  // -----------------------------------------------------------------------
  it('sollte bei viewport-Aenderung Canvas-Groesse aktualisieren', () => {
    const { rerender } = render(
      <AgentLayer agents={[]} viewport={defaultViewport} />
    )

    const newViewport: ViewportConfig = {
      width: 1024,
      height: 768,
      offsetX: 512,
      offsetY: 150,
    }

    rerender(<AgentLayer agents={[]} viewport={newViewport} />)

    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.width).toBe(newViewport.width)
    expect(canvas.height).toBe(newViewport.height)
  })

  it('sollte mit einem einzelnen Agent rendern', () => {
    const agent = makeAgent()

    expect(() =>
      render(<AgentLayer agents={[agent]} viewport={defaultViewport} />)
    ).not.toThrow()
  })

  it('sollte mit vielen Agents rendern (Performance-Test: 50 Agents)', () => {
    const agents: AgentSprite[] = Array.from({ length: 50 }, (_, i) =>
      makeAgent({
        id: `agent-${i}`,
        position: { x: i % 10, y: Math.floor(i / 10) },
      })
    )

    expect(() =>
      render(<AgentLayer agents={agents} viewport={defaultViewport} />)
    ).not.toThrow()
  })

  it('sollte pointer-events: none haben (kein Blockieren von Klicks)', () => {
    const { container } = render(
      <AgentLayer agents={[]} viewport={defaultViewport} />
    )

    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.style.pointerEvents).toBe('none')
  })
})
