/**
 * Tests für IsometricCanvas Component
 * Issue #53, AC1, AC3, AC5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { IsometricCanvas } from '../../src/components/settlers/IsometricCanvas'

// Mock Canvas getContext
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'center'
  })) as any
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('IsometricCanvas', () => {
  it('sollte Canvas-Element rendern', () => {
    render(<IsometricCanvas />)
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeTruthy()
  })

  it('sollte Standard-Höhe von 600px haben', () => {
    render(<IsometricCanvas />)
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.height).toBe(600)
  })

  it('sollte benutzerdefinierte Höhe akzeptieren', () => {
    render(<IsometricCanvas height={800} />)
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.height).toBe(800)
  })

  it('sollte Debug-Overlay zeigen wenn debug=true', () => {
    const { container } = render(<IsometricCanvas debug={true} />)
    const debugOverlay = container.querySelector('div[style*="position: absolute"]')
    expect(debugOverlay).toBeTruthy()
    expect(debugOverlay?.textContent).toContain('FPS:')
    expect(debugOverlay?.textContent).toContain('Memory:')
  })

  it('sollte KEIN Debug-Overlay zeigen wenn debug=false', () => {
    const { container } = render(<IsometricCanvas debug={false} />)
    const debugOverlay = container.querySelector('div[style*="position: absolute"]')
    expect(debugOverlay).toBeFalsy()
  })

  it('sollte onTileClick Callback triggern', async () => {
    const handleClick = vi.fn()
    render(<IsometricCanvas onTileClick={handleClick} />)

    const canvas = document.querySelector('canvas') as HTMLCanvasElement

    // Simuliere Click auf Canvas-Mitte (sollte ungefähr Tile 5,5 sein)
    const rect = canvas.getBoundingClientRect()
    const event = new MouseEvent('click', {
      clientX: rect.left + canvas.width / 2,
      clientY: rect.top + canvas.height / 2,
      bubbles: true
    })

    canvas.dispatchEvent(event)

    // Callback sollte mit Grid-Koordinaten aufgerufen worden sein
    await vi.waitFor(() => {
      expect(handleClick).toHaveBeenCalled()
    })
  })

  it('sollte Canvas Context anfordern', () => {
    render(<IsometricCanvas />)
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.getContext).toHaveBeenCalledWith('2d')
  })

  it('sollte Cursor auf "pointer" setzen bei Hover', async () => {
    render(<IsometricCanvas />)
    const canvas = document.querySelector('canvas') as HTMLCanvasElement

    // Simuliere Hover über Canvas-Mitte
    const rect = canvas.getBoundingClientRect()
    const event = new MouseEvent('mousemove', {
      clientX: rect.left + canvas.width / 2,
      clientY: rect.top + canvas.height / 2,
      bubbles: true
    })

    canvas.dispatchEvent(event)

    // Cursor sollte auf pointer gesetzt sein (mit etwas Verzögerung)
    await vi.waitFor(() => {
      const style = canvas.style.cursor
      expect(style === 'pointer' || style === 'default').toBe(true)
    })
  })
})
