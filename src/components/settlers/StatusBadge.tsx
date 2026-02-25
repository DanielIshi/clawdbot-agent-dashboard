/**
 * StatusBadge Component
 * Issue #58: AC5 - Status-Badge Farb-Kodierung
 *
 * Zeigt Session-Status mit Farben:
 * - Active: Grün (pulse Animation)
 * - Done: Blau
 * - Failed: Rot
 */

import React from 'react'
import type { SessionStatus } from './types'

interface StatusBadgeProps {
  status: SessionStatus
}

const statusConfig: Record<SessionStatus, { label: string; colorClass: string; pulse: boolean }> = {
  active: {
    label: 'Active',
    colorClass: 'bg-green-500',
    pulse: true
  },
  done: {
    label: 'Done',
    colorClass: 'bg-blue-500',
    pulse: false
  },
  failed: {
    label: 'Failed',
    colorClass: 'bg-red-500',
    pulse: false
  }
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status]

  return (
    <span
      data-testid="status-badge"
      className={`
        inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold text-white
        ${config.colorClass}
        ${config.pulse ? 'animate-pulse' : ''}
      `}
    >
      {config.label}
    </span>
  )
}
