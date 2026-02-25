/**
 * Live Agent Stream View Tests
 * Feature #64: Live Agent Stream View mit Split-Screen
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { LiveAgentStreamView } from '../../src/components/settlers/LiveAgentStreamView'

const mockSessions = [
  {
    name: 'agent-alpha',
    order: 'Order Alpha',
    task: 'Fix authentication flow',
    project: 'auth-service',
    status: 'active',
    lastActivity: new Date().toISOString(),
    lastOutput: 'Initial output A'
  },
  {
    name: 'agent-bravo',
    order: 'Order Bravo',
    task: 'Update API docs',
    project: 'docs',
    status: 'active',
    lastActivity: new Date(Date.now() - 1000).toISOString(),
    lastOutput: 'Initial output B'
  },
  {
    name: 'agent-charlie',
    order: 'Order Charlie',
    task: 'Refactor billing module',
    project: 'billing',
    status: 'active',
    lastActivity: new Date(Date.now() - 2000).toISOString(),
    lastOutput: 'Initial output C'
  },
  {
    name: 'agent-delta',
    order: 'Order Delta',
    task: 'Run regression tests',
    project: 'qa',
    status: 'active',
    lastActivity: new Date(Date.now() - 3000).toISOString(),
    lastOutput: 'Initial output D'
  },
  {
    name: 'agent-echo',
    order: 'Order Echo',
    task: 'Extra session not shown',
    project: 'overflow',
    status: 'active',
    lastActivity: new Date(Date.now() - 4000).toISOString(),
    lastOutput: 'Initial output E'
  }
]

const mockLogs: Record<string, string[]> = {
  'agent-alpha': ['Alpha line 1', 'Alpha line 2'],
  'agent-bravo': ['Bravo line 1'],
  'agent-charlie': ['Charlie line 1', 'Charlie line 2', 'Charlie line 3'],
  'agent-delta': ['Delta line 1']
}

const mockFetch = () => {
  global.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url === '/api/sessions') {
      return Promise.resolve({
        ok: true,
        json: async () => mockSessions
      } as Response)
    }

    const match = url.match(/\/api\/sessions\/(.+)\/log/)
    if (match) {
      const name = decodeURIComponent(match[1])
      return Promise.resolve({
        ok: true,
        json: async () => ({ name, lines: mockLogs[name] || [] })
      } as Response)
    }

    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    } as Response)
  })
}

describe('LiveAgentStreamView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders split-screen grid with 4 agent quarters and streamed output', async () => {
    render(<LiveAgentStreamView />)

    const grid = await screen.findByTestId('live-agent-stream')
    expect(grid).toHaveClass('grid')
    expect(grid).toHaveClass('grid-cols-2')
    expect(grid).toHaveClass('grid-rows-2')

    await waitFor(() => {
      expect(screen.getAllByTestId('live-agent-quarter')).toHaveLength(4)
    })

    expect(screen.getByText('Order Alpha')).toBeInTheDocument()
    expect(screen.getByText('Fix authentication flow')).toBeInTheDocument()
    expect(screen.getByText('auth-service')).toBeInTheDocument()

    expect(screen.getByText('Order Delta')).toBeInTheDocument()
    expect(screen.queryByText('Order Echo')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Alpha line 1')).toBeInTheDocument()
    })
    expect(screen.getByText('Alpha line 2')).toBeInTheDocument()
  })

  it('polls sessions and log output on intervals', async () => {
    render(<LiveAgentStreamView />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    const initialCallCount = (global.fetch as any).mock.calls.length

    vi.advanceTimersByTime(10000)
    await vi.runOnlyPendingTimersAsync()

    const afterSessionPollCount = (global.fetch as any).mock.calls.length
    expect(afterSessionPollCount).toBeGreaterThan(initialCallCount)

    vi.advanceTimersByTime(5000)
    await vi.runOnlyPendingTimersAsync()

    const afterLogPollCount = (global.fetch as any).mock.calls.length
    expect(afterLogPollCount).toBeGreaterThan(afterSessionPollCount)
  })
})
