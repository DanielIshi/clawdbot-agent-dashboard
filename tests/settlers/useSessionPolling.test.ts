/**
 * Unit Tests: useSessionPolling Hook
 * Issue #58: AC6 - Auto-Refresh (Polling 10s)
 */

import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSessionPolling } from '../../src/hooks/useSessionPolling'

describe('useSessionPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('fetches sessions on mount', async () => {
    const mockSessions = [{ id: 'session-1', status: 'active' }]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessions: mockSessions })
    })

    const { result } = renderHook(() => useSessionPolling())

    // Wait for initial fetch
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 1000 })

    expect(result.current.sessions).toEqual(mockSessions)
    expect(global.fetch).toHaveBeenCalledWith('/api/sessions')
  })

  it('polls every 10 seconds', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ sessions: [] })
    })

    const { result } = renderHook(() => useSessionPolling())

    // Wait for initial fetch
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 1000 })

    expect(global.fetch).toHaveBeenCalledTimes(1)

    // Nach 10s
    vi.advanceTimersByTime(10000)
    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    }, { timeout: 1000 })

    // Nach weiteren 10s
    vi.advanceTimersByTime(10000)
    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3)
    }, { timeout: 1000 })
  })

  it('cleans up interval on unmount', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ sessions: [] })
    })

    const { result, unmount } = renderHook(() => useSessionPolling())

    // Wait for initial fetch
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 1000 })

    expect(global.fetch).toHaveBeenCalledTimes(1)

    unmount()

    // Interval sollte gestoppt sein
    const callCountBeforeUnmount = (global.fetch as any).mock.calls.length

    vi.advanceTimersByTime(10000)
    expect((global.fetch as any).mock.calls.length).toBe(callCountBeforeUnmount)
  })

  it('handles fetch errors gracefully', async () => {
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useSessionPolling())

    await vi.waitFor(() => {
      expect(result.current.error).toBe('Network error')
    }, { timeout: 1000 })

    expect(result.current.sessions).toEqual([])
  })

  it('sets loading state correctly', async () => {
    ;(global.fetch as any).mockImplementation(() =>
      new Promise((resolve) =>
        setTimeout(() => resolve({ ok: true, json: async () => ({ sessions: [] }) }), 100)
      )
    )

    const { result } = renderHook(() => useSessionPolling())

    expect(result.current.loading).toBe(true)

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 1000 })
  })
})
