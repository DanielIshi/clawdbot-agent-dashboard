/**
 * QuotaStore Tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useQuotaStore, selectIsClaudeAvailable, selectQuotaPercent } from './quotaStore'

describe('quotaStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useQuotaStore.getState().reset()
  })

  describe('initial state', () => {
    it('should have default values', () => {
      const state = useQuotaStore.getState()
      expect(state.currentProvider).toBe('claude')
      expect(state.requestsRemaining).toBeNull()
      expect(state.tokensRemaining).toBeNull()
      expect(state.isBlocked).toBe(false)
      expect(state.cooldownEndsAt).toBeNull()
    })
  })

  describe('updateQuota', () => {
    it('should update quota values', () => {
      const store = useQuotaStore.getState()
      
      store.updateQuota({
        provider: 'claude',
        requestsRemaining: 800,
        requestsLimit: 1000,
        tokensRemaining: 90000,
        tokensLimit: 100000
      })

      const state = useQuotaStore.getState()
      expect(state.requestsRemaining).toBe(800)
      expect(state.requestsLimit).toBe(1000)
      expect(state.tokensRemaining).toBe(90000)
      expect(state.tokensLimit).toBe(100000)
    })

    it('should ignore updates for different provider', () => {
      const store = useQuotaStore.getState()
      
      store.updateQuota({
        provider: 'minimax',
        requestsRemaining: 500
      })

      const state = useQuotaStore.getState()
      expect(state.requestsRemaining).toBeNull() // Should not update
    })
  })

  describe('setQuotaExhausted', () => {
    it('should set blocked state and cooldown', () => {
      const store = useQuotaStore.getState()
      const now = new Date().toISOString()
      
      store.setQuotaExhausted({
        provider: 'claude',
        timestamp: now,
        cooldownMinutes: 30,
        reason: 'rate_limit_429'
      })

      const state = useQuotaStore.getState()
      expect(state.isBlocked).toBe(true)
      expect(state.last429At).toBe(now)
      expect(state.cooldownEndsAt).not.toBeNull()
      
      // Cooldown should be ~30 minutes from now
      const cooldownEnd = new Date(state.cooldownEndsAt!).getTime()
      const expected = Date.now() + 30 * 60 * 1000
      expect(Math.abs(cooldownEnd - expected)).toBeLessThan(1000) // Within 1 second
    })
  })

  describe('setQuotaRecovered', () => {
    it('should clear blocked state', () => {
      const store = useQuotaStore.getState()
      
      // First set as exhausted
      store.setQuotaExhausted({
        provider: 'claude',
        timestamp: new Date().toISOString(),
        cooldownMinutes: 30,
        reason: 'rate_limit_429'
      })
      
      expect(useQuotaStore.getState().isBlocked).toBe(true)
      
      // Then recover
      store.setQuotaRecovered('claude')
      
      const state = useQuotaStore.getState()
      expect(state.isBlocked).toBe(false)
      expect(state.cooldownEndsAt).toBeNull()
      expect(state.last429At).toBeNull()
    })
  })

  describe('switchProvider', () => {
    it('should switch provider', () => {
      const store = useQuotaStore.getState()
      
      store.switchProvider('minimax')
      
      const state = useQuotaStore.getState()
      expect(state.currentProvider).toBe('minimax')
      expect(state.autoSwitchedAt).not.toBeNull()
    })
  })

  describe('checkAndAutoSwitch', () => {
    it('should auto-switch when quota is low', () => {
      const store = useQuotaStore.getState()
      
      // Set low quota (5%)
      store.updateQuota({
        provider: 'claude',
        requestsRemaining: 50,
        requestsLimit: 1000
      })
      
      const switched = store.checkAndAutoSwitch()
      
      expect(switched).toBe(true)
      expect(useQuotaStore.getState().currentProvider).toBe('minimax')
    })

    it('should not switch when quota is sufficient', () => {
      const store = useQuotaStore.getState()
      
      // Set sufficient quota (50%)
      store.updateQuota({
        provider: 'claude',
        requestsRemaining: 500,
        requestsLimit: 1000
      })
      
      const switched = store.checkAndAutoSwitch()
      
      expect(switched).toBe(false)
      expect(useQuotaStore.getState().currentProvider).toBe('claude')
    })

    it('should auto-switch when blocked', () => {
      const store = useQuotaStore.getState()
      
      store.setQuotaExhausted({
        provider: 'claude',
        timestamp: new Date().toISOString(),
        cooldownMinutes: 30,
        reason: 'rate_limit_429'
      })
      
      const switched = store.checkAndAutoSwitch()
      
      expect(switched).toBe(true)
      expect(useQuotaStore.getState().currentProvider).toBe('minimax')
    })

    it('should not switch if already on minimax', () => {
      const store = useQuotaStore.getState()
      store.switchProvider('minimax')
      
      const switched = store.checkAndAutoSwitch()
      
      expect(switched).toBe(false)
    })
  })

  describe('selectIsClaudeAvailable', () => {
    it('should return true when quota is sufficient', () => {
      const store = useQuotaStore.getState()
      
      store.updateQuota({
        provider: 'claude',
        requestsRemaining: 500,
        requestsLimit: 1000
      })
      
      expect(selectIsClaudeAvailable(useQuotaStore.getState())).toBe(true)
    })

    it('should return false when blocked', () => {
      const store = useQuotaStore.getState()
      
      store.setQuotaExhausted({
        provider: 'claude',
        timestamp: new Date().toISOString(),
        cooldownMinutes: 30,
        reason: 'rate_limit_429'
      })
      
      expect(selectIsClaudeAvailable(useQuotaStore.getState())).toBe(false)
    })

    it('should return false when quota is low', () => {
      const store = useQuotaStore.getState()
      
      store.updateQuota({
        provider: 'claude',
        requestsRemaining: 50,
        requestsLimit: 1000
      })
      
      expect(selectIsClaudeAvailable(useQuotaStore.getState())).toBe(false)
    })
  })

  describe('selectQuotaPercent', () => {
    it('should calculate percentages correctly', () => {
      const store = useQuotaStore.getState()
      
      store.updateQuota({
        provider: 'claude',
        requestsRemaining: 750,
        requestsLimit: 1000,
        tokensRemaining: 25000,
        tokensLimit: 100000
      })
      
      const percent = selectQuotaPercent(useQuotaStore.getState())
      expect(percent.requests).toBe(75)
      expect(percent.tokens).toBe(25)
    })

    it('should return null when no limits set', () => {
      const percent = selectQuotaPercent(useQuotaStore.getState())
      expect(percent.requests).toBeNull()
      expect(percent.tokens).toBeNull()
    })
  })
})
