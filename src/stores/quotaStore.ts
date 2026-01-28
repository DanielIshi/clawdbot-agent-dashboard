/**
 * Quota Store - manages API quota state
 */
import { create } from 'zustand'
import type { QuotaState, QuotaUpdatePayload, QuotaExhaustedPayload } from '../types/quota'
import { isQuotaLow, isInCooldown } from '../types/quota'

interface QuotaStoreState extends QuotaState {
  // Actions
  updateQuota: (payload: QuotaUpdatePayload) => void
  setQuotaExhausted: (payload: QuotaExhaustedPayload) => void
  setQuotaRecovered: (provider: 'claude' | 'minimax') => void
  switchProvider: (provider: 'claude' | 'minimax') => void
  checkAndAutoSwitch: () => boolean // Returns true if switched
  reset: () => void
}

const initialState: QuotaState = {
  requestsRemaining: null,
  tokensRemaining: null,
  requestsLimit: null,
  tokensLimit: null,
  requestsResetAt: null,
  tokensResetAt: null,
  last429At: null,
  cooldownEndsAt: null,
  isBlocked: false,
  autoSwitchedAt: null,
  currentProvider: 'claude',
  updatedAt: new Date().toISOString()
}

export const useQuotaStore = create<QuotaStoreState>((set, get) => ({
  ...initialState,

  updateQuota: (payload) => set((state) => {
    const newState: Partial<QuotaState> = {
      updatedAt: new Date().toISOString()
    }

    // Only update if this is for the current provider
    if (payload.provider !== state.currentProvider) {
      return state
    }

    if (payload.requestsRemaining !== undefined) {
      newState.requestsRemaining = payload.requestsRemaining
    }
    if (payload.tokensRemaining !== undefined) {
      newState.tokensRemaining = payload.tokensRemaining
    }
    if (payload.requestsLimit !== undefined) {
      newState.requestsLimit = payload.requestsLimit
    }
    if (payload.tokensLimit !== undefined) {
      newState.tokensLimit = payload.tokensLimit
    }
    if (payload.requestsResetAt !== undefined) {
      newState.requestsResetAt = payload.requestsResetAt
    }
    if (payload.tokensResetAt !== undefined) {
      newState.tokensResetAt = payload.tokensResetAt
    }

    return { ...state, ...newState }
  }),

  setQuotaExhausted: (payload) => set((state) => {
    const cooldownEndsAt = new Date(Date.now() + payload.cooldownMinutes * 60 * 1000).toISOString()
    
    return {
      ...state,
      last429At: payload.timestamp,
      cooldownEndsAt,
      isBlocked: true,
      updatedAt: new Date().toISOString()
    }
  }),

  setQuotaRecovered: (provider) => set((state) => {
    if (provider !== 'claude') return state
    
    return {
      ...state,
      last429At: null,
      cooldownEndsAt: null,
      isBlocked: false,
      updatedAt: new Date().toISOString()
    }
  }),

  switchProvider: (provider) => set((state) => ({
    ...state,
    currentProvider: provider,
    autoSwitchedAt: provider !== state.currentProvider ? new Date().toISOString() : state.autoSwitchedAt,
    updatedAt: new Date().toISOString()
  })),

  checkAndAutoSwitch: () => {
    const state = get()
    
    // Already on minimax
    if (state.currentProvider === 'minimax') {
      return false
    }

    // Check if we need to switch
    const shouldSwitch = 
      state.isBlocked ||
      isInCooldown(state.cooldownEndsAt) ||
      isQuotaLow(state.requestsRemaining, state.requestsLimit) ||
      isQuotaLow(state.tokensRemaining, state.tokensLimit)

    if (shouldSwitch) {
      set({
        currentProvider: 'minimax',
        autoSwitchedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      return true
    }

    return false
  },

  reset: () => set(initialState)
}))

// Selectors
export const selectIsClaudeAvailable = (state: QuotaStoreState): boolean => {
  if (state.isBlocked) return false
  if (isInCooldown(state.cooldownEndsAt)) return false
  if (isQuotaLow(state.requestsRemaining, state.requestsLimit)) return false
  if (isQuotaLow(state.tokensRemaining, state.tokensLimit)) return false
  return true
}

export const selectQuotaPercent = (state: QuotaStoreState): { requests: number | null; tokens: number | null } => {
  const requests = state.requestsLimit && state.requestsRemaining !== null
    ? Math.round((state.requestsRemaining / state.requestsLimit) * 100)
    : null
  const tokens = state.tokensLimit && state.tokensRemaining !== null
    ? Math.round((state.tokensRemaining / state.tokensLimit) * 100)
    : null
  return { requests, tokens }
}
