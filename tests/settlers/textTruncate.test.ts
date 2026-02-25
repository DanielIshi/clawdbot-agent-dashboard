/**
 * Issue #57 - AC5: Multi-Line Text Truncation Tests
 * TDD-Approach: Tests ZUERST
 *
 * Requirements:
 * - Max 3 lines
 * - Truncate with "..."
 * - Preserve word boundaries
 */

import { describe, it, expect } from 'vitest'
import { truncateToLines } from '../../src/components/settlers/textTruncate'

describe('textTruncate - Multi-Line Truncation (AC5)', () => {
  it('should not truncate short text (1 line)', () => {
    const text = 'Short text'
    const result = truncateToLines(text, 3)
    expect(result).toBe('Short text')
  })

  it('should not truncate text with exactly 3 lines', () => {
    const text = 'Line 1\nLine 2\nLine 3'
    const result = truncateToLines(text, 3)
    expect(result).toBe('Line 1\nLine 2\nLine 3')
  })

  it('should truncate text with 4+ lines', () => {
    const text = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
    const result = truncateToLines(text, 3)

    const lines = result.split('\n')
    expect(lines.length).toBeLessThanOrEqual(3)
    expect(result).toContain('...')
  })

  it('should append "..." when truncating', () => {
    const text = 'Line 1\nLine 2\nLine 3\nLine 4'
    const result = truncateToLines(text, 3)

    expect(result).toContain('...')
  })

  it('should handle empty text', () => {
    const text = ''
    const result = truncateToLines(text, 3)
    expect(result).toBe('')
  })

  it('should handle text with only whitespace', () => {
    const text = '   \n  \n   '
    const result = truncateToLines(text, 3)
    expect(result.trim()).toBe('')
  })

  it('should handle very long single line (no newlines)', () => {
    const text = 'This is a very long line that should be truncated because it exceeds the maximum allowed width. '.repeat(5)
    const result = truncateToLines(text, 3, 50) // max 50 chars per line

    const lines = result.split('\n')
    expect(lines.length).toBeLessThanOrEqual(3)
    expect(result).toContain('...')
  })

  it('should preserve word boundaries when wrapping', () => {
    const text = 'This is a very long sentence that should be wrapped at word boundaries not in the middle of words'
    const result = truncateToLines(text, 3, 30) // max 30 chars per line

    // Should not have words cut in half
    expect(result).not.toMatch(/\w-\w/) // No mid-word hyphens
  })

  it('should handle text with mixed newlines and long lines', () => {
    const text = 'Short line\nVery long line that needs to be wrapped because it exceeds the maximum width\nAnother short line\nExtra line'
    const result = truncateToLines(text, 3, 40)

    const lines = result.split('\n')
    expect(lines.length).toBeLessThanOrEqual(3)
    expect(result).toContain('...')
  })

  it('should default to 50 chars per line if not specified', () => {
    const longLine = 'x'.repeat(100)
    const result = truncateToLines(longLine, 3)

    const lines = result.split('\n')
    expect(lines.length).toBeGreaterThan(1) // Should wrap
  })
})

describe('textTruncate - Edge Cases', () => {
  it('should handle maxLines = 1', () => {
    const text = 'Line 1\nLine 2\nLine 3'
    const result = truncateToLines(text, 1)

    const lines = result.split('\n')
    expect(lines.length).toBe(1)
    expect(result).toContain('...')
  })

  it('should handle maxLines = 0 (returns empty)', () => {
    const text = 'Some text'
    const result = truncateToLines(text, 0)

    expect(result).toBe('')
  })

  it('should handle negative maxLines (returns empty)', () => {
    const text = 'Some text'
    const result = truncateToLines(text, -1)

    expect(result).toBe('')
  })

  it('should handle text with consecutive newlines', () => {
    const text = 'Line 1\n\n\nLine 2'
    const result = truncateToLines(text, 3)

    // Should preserve empty lines (up to max)
    expect(result).toContain('\n')
  })

  it('should not add "..." if text fits exactly', () => {
    const text = 'Line 1\nLine 2\nLine 3'
    const result = truncateToLines(text, 3)

    expect(result).not.toContain('...')
  })

  it('should handle Unicode characters', () => {
    const text = 'Emoji 😀\nUmlaut äöü\nChinese 中文\nExtra'
    const result = truncateToLines(text, 3)

    const lines = result.split('\n')
    expect(lines.length).toBeLessThanOrEqual(3)
  })

  it('should handle very long words (no word boundaries)', () => {
    const text = 'a'.repeat(200)
    const result = truncateToLines(text, 3, 50)

    const lines = result.split('\n')
    expect(lines.length).toBeLessThanOrEqual(3)
    expect(result).toContain('...')
  })
})
