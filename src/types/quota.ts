/**
 * Quota Types for API Rate Limiting
 */

export interface QuotaLimits {
  requestsLimit: number
  tokensLimit: number
}

export interface QuotaState {
  // Remaining quota values
  requestsRemaining: number | null
  tokensRemaining: number | null
  
  // Limits (from headers)
  requestsLimit: number | null
  tokensLimit: number | null
  
  // Reset timestamps
  requestsResetAt: string | null
  tokensResetAt: string | null
  
  // 429 tracking
  last429At: string | null
  cooldownEndsAt: string | null
  
  // Status
  isBlocked: boolean
  autoSwitchedAt: string | null
  currentProvider: 'claude' | 'minimax'
  
  // Timestamps
  updatedAt: string
}

export interface QuotaUpdatePayload {
  provider: 'claude' | 'minimax'
  requestsRemaining?: number
  tokensRemaining?: number
  requestsLimit?: number
  tokensLimit?: number
  requestsResetAt?: string
  tokensResetAt?: string
}

export interface QuotaExhaustedPayload {
  provider: 'claude' | 'minimax'
  timestamp: string
  cooldownMinutes: number
  reason: 'rate_limit_429' | 'quota_threshold'
}

export interface QuotaRecoveredPayload {
  provider: 'claude' | 'minimax'
  timestamp: string
}

// Constants
export const QUOTA_THRESHOLD_PERCENT = 10 // Auto-switch when below 10%
export const COOLDOWN_MINUTES = 30 // Default cooldown after 429

// Helper to calculate percentage
export function calculateQuotaPercent(remaining: number | null, limit: number | null): number | null {
  if (remaining === null || limit === null || limit === 0) return null
  return Math.round((remaining / limit) * 100)
}

// Helper to check if quota is low
export function isQuotaLow(remaining: number | null, limit: number | null): boolean {
  const percent = calculateQuotaPercent(remaining, limit)
  return percent !== null && percent < QUOTA_THRESHOLD_PERCENT
}

// Helper to check if in cooldown
export function isInCooldown(cooldownEndsAt: string | null): boolean {
  if (!cooldownEndsAt) return false
  return new Date(cooldownEndsAt) > new Date()
}

// Helper to get remaining cooldown time in minutes
export function getRemainingCooldownMinutes(cooldownEndsAt: string | null): number {
  if (!cooldownEndsAt) return 0
  const remaining = new Date(cooldownEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(remaining / 60000))
}
