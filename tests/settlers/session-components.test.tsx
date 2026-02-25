/**
 * Unit Tests: Session Components (SessionCard, StatusBadge, SessionModal)
 * Issue #58: AC2, AC3, AC4, AC5, AC7
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SessionCard } from '../../src/components/settlers/SessionCard'
import { StatusBadge } from '../../src/components/settlers/StatusBadge'
import { SessionModal } from '../../src/components/settlers/SessionModal'
import type { Session } from '../../src/components/settlers/types'

describe('SessionCard', () => {
  const mockSession: Session = {
    id: 'session-1',
    status: 'active',
    lastActivity: new Date().toISOString(),
    output: 'Building project... compiling files and running tests'
  }

  it('renders session ID', () => {
    render(<SessionCard session={mockSession} onClick={() => {}} />)
    expect(screen.getByTestId('session-id')).toHaveTextContent('session-1')
  })

  it('truncates output to 60 characters', () => {
    const longOutput = 'A'.repeat(100)
    const session = { ...mockSession, output: longOutput }

    render(<SessionCard session={session} onClick={() => {}} />)

    const output = screen.getByTestId('session-output')
    expect(output.textContent?.length).toBeLessThanOrEqual(63) // 60 chars + "..."
  })

  it('displays monospace font for output', () => {
    render(<SessionCard session={mockSession} onClick={() => {}} />)

    const output = screen.getByTestId('session-output')
    expect(output).toHaveStyle({ fontFamily: 'monospace' })
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<SessionCard session={mockSession} onClick={handleClick} />)

    fireEvent.click(screen.getByTestId('session-card'))
    expect(handleClick).toHaveBeenCalledWith(mockSession)
  })

  it('renders StatusBadge', () => {
    render(<SessionCard session={mockSession} onClick={() => {}} />)
    expect(screen.getByTestId('status-badge')).toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  it('renders active status with green color', () => {
    render(<StatusBadge status="active" />)

    const badge = screen.getByTestId('status-badge')
    expect(badge).toHaveTextContent('Active')
    expect(badge).toHaveClass('bg-green-500')
  })

  it('renders done status with blue color', () => {
    render(<StatusBadge status="done" />)

    const badge = screen.getByTestId('status-badge')
    expect(badge).toHaveTextContent('Done')
    expect(badge).toHaveClass('bg-blue-500')
  })

  it('renders failed status with red color', () => {
    render(<StatusBadge status="failed" />)

    const badge = screen.getByTestId('status-badge')
    expect(badge).toHaveTextContent('Failed')
    expect(badge).toHaveClass('bg-red-500')
  })

  it('adds pulse animation for active status', () => {
    render(<StatusBadge status="active" />)

    const badge = screen.getByTestId('status-badge')
    expect(badge).toHaveClass('animate-pulse')
  })

  it('does not add pulse animation for non-active status', () => {
    render(<StatusBadge status="done" />)

    const badge = screen.getByTestId('status-badge')
    expect(badge).not.toHaveClass('animate-pulse')
  })
})

describe('SessionModal', () => {
  const mockSession: Session = {
    id: 'session-1',
    status: 'active',
    lastActivity: new Date().toISOString(),
    output: 'Building project...\nCompiling files...\nRunning tests...'
  }

  it('renders modal when open', () => {
    render(<SessionModal session={mockSession} isOpen={true} onClose={() => {}} />)
    expect(screen.getByTestId('session-modal')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<SessionModal session={mockSession} isOpen={false} onClose={() => {}} />)
    expect(screen.queryByTestId('session-modal')).not.toBeInTheDocument()
  })

  it('displays session ID in header', () => {
    render(<SessionModal session={mockSession} isOpen={true} onClose={() => {}} />)
    expect(screen.getByText('session-1')).toBeInTheDocument()
  })

  it('displays full output (not truncated)', () => {
    render(<SessionModal session={mockSession} isOpen={true} onClose={() => {}} />)

    const output = screen.getByTestId('modal-output')
    expect(output).toHaveTextContent('Building project...')
    expect(output).toHaveTextContent('Compiling files...')
    expect(output).toHaveTextContent('Running tests...')
  })

  it('calls onClose when close button clicked', () => {
    const handleClose = vi.fn()
    render(<SessionModal session={mockSession} isOpen={true} onClose={handleClose} />)

    fireEvent.click(screen.getByTestId('modal-close'))
    expect(handleClose).toHaveBeenCalled()
  })

  it('calls onClose when overlay clicked', () => {
    const handleClose = vi.fn()
    render(<SessionModal session={mockSession} isOpen={true} onClose={handleClose} />)

    fireEvent.click(screen.getByTestId('modal-overlay'))
    expect(handleClose).toHaveBeenCalled()
  })

  it('does not close when content clicked', () => {
    const handleClose = vi.fn()
    render(<SessionModal session={mockSession} isOpen={true} onClose={handleClose} />)

    fireEvent.click(screen.getByTestId('modal-content'))
    expect(handleClose).not.toHaveBeenCalled()
  })
})

describe('SessionEmptyState', () => {
  it('renders empty state message', async () => {
    const { SessionEmptyState } = await import('../../src/components/settlers/SessionSidebar')
    render(<SessionEmptyState />)

    expect(screen.getByTestId('session-empty-state')).toBeInTheDocument()
    expect(screen.getByText(/Keine aktiven Sessions/i)).toBeInTheDocument()
  })

  it('renders hint text', async () => {
    const { SessionEmptyState } = await import('../../src/components/settlers/SessionSidebar')
    render(<SessionEmptyState />)

    expect(screen.getByText(/Starte einen Agent/i)).toBeInTheDocument()
  })
})
