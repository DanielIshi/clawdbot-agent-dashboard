/**
 * Tests fuer Issue #57: Sprechblasen mit Live-Agent-Output
 */
import { describe, it, expect, beforeAll } from 'vitest'

let speech: typeof import('../../public/three-scene.js')

beforeAll(async () => {
  ;(globalThis as any).__SETTLERS_TEST__ = true
  speech = await import('../../public/three-scene.js')
})

describe('Speech Bubble Helpers', () => {
  it('formatBubbleText trims, collapses whitespace, and truncates', () => {
    const input = '  Hallo   Welt\n  von  Settlers   '
    const formatted = speech.formatBubbleText(input, 40)
    expect(formatted).toBe('Hallo Welt von Settlers')

    const longInput = 'A'.repeat(30)
    const truncated = speech.formatBubbleText(longInput, 10)
    expect(truncated).toBe('AAAAAAAAAA…')
  })

  it('createTypewriterState returns empty state for empty text', () => {
    const state = speech.createTypewriterState('', 0, 10)
    expect(state.fullText).toBe('')
    expect(state.typedLength).toBe(0)
    expect(state.done).toBe(true)
  })

  it('stepTypewriter advances text based on elapsed time', () => {
    const state = speech.createTypewriterState('Hello', 0, 10)

    const noProgress = speech.stepTypewriter(state, 5)
    expect(noProgress.typedLength).toBe(0)

    const oneChar = speech.stepTypewriter(state, 10)
    expect(oneChar.typedLength).toBe(1)
    expect(speech.getTypedText(oneChar)).toBe('H')

    const threeChars = speech.stepTypewriter(oneChar, 35)
    expect(threeChars.typedLength).toBe(3)
    expect(speech.getTypedText(threeChars)).toBe('Hel')
  })

  it('stepTypewriter finishes when enough time passes', () => {
    const state = speech.createTypewriterState('Hey', 0, 10)
    const done = speech.stepTypewriter(state, 100)
    expect(done.done).toBe(true)
    expect(speech.getTypedText(done)).toBe('Hey')
  })
})
