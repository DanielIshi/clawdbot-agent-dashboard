/**
 * Issue #57 - AC6: Live-Output API Polling Tests
 * TDD-Approach: Tests ZUERST (SIMPLIFIED)
 *
 * Requirements:
 * - Poll API alle 5 Sekunden
 * - Update Bubble-Text bei neuen Daten
 * - Cleanup on unmount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgentOutputPolling } from '../../src/components/settlers/useAgentOutputPolling'

// Mock fetch
global.fetch = vi.fn()

describe('useAgentOutputPolling - API Polling (AC6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return empty map initially', () => {
    ;(global.fetch as any).mockImplementation(() => new Promise(() => {})) // Never resolves

    const { result } = renderHook(() => useAgentOutputPolling('/api/agents/output'))

    expect(result.current.size).toBe(0)
  })

  it('should fetch agent output on mount', async () => {
    const mockResponse = {
      'agent-1': 'Processing task...',
      'agent-2': 'Waiting for input'
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const { result } = renderHook(() => useAgentOutputPolling('/api/agents/output'))

    // Wait for promise to resolve
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    expect(global.fetch).toHaveBeenCalled()
    expect(result.current.get('agent-1')).toBe('Processing task...')
    expect(result.current.get('agent-2')).toBe('Waiting for input')
  })

  it('should handle empty API response', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    })

    const { result } = renderHook(() => useAgentOutputPolling('/api/agents/output'))

    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    expect(result.current.size).toBe(0)
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useAgentOutputPolling('/api/agents/output'))

    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    // Should return empty map on error
    expect(result.current.size).toBe(0)
  })

  it('should handle non-ok response status', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    const { result } = renderHook(() => useAgentOutputPolling('/api/agents/output'))

    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    // Should return empty map on error
    expect(result.current.size).toBe(0)
  })

  it('should cleanup interval on unmount', () => {
    const mockClearInterval = vi.spyOn(global, 'clearInterval')

    ;(global.fetch as any).mockImplementation(() => new Promise(() => {}))

    const { unmount } = renderHook(() => useAgentOutputPolling('/api/agents/output'))

    unmount()

    expect(mockClearInterval).toHaveBeenCalled()
  })
})

describe('useAgentOutputPolling - Integration Tests', () => {
  it('should integrate with SpeechBubbleManager', async () => {
    const mockResponse = {
      'agent-1': 'Building project...'
    }

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    })

    const { result } = renderHook(() => useAgentOutputPolling('/api/agents/output'))

    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    const outputMap = result.current

    // Can be passed to SpeechBubbleManager
    expect(outputMap).toBeInstanceOf(Map)
    expect(outputMap.get('agent-1')).toBe('Building project...')
  })
})
