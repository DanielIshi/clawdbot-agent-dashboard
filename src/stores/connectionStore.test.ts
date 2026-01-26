/**
 * Tests für Connection Store (Issue #24)
 * Akzeptanzkriterien:
 * - [x] Retry-Logik für WebSocket-Reconnect
 * - [x] Connection Status tracking
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useConnectionStore } from './connectionStore'

describe('Connection Store (Issue #24)', () => {
  beforeEach(() => {
    // Reset store to initial state
    useConnectionStore.setState({
      status: 'disconnected',
      clientId: null,
      lastConnected: null,
      lastError: null,
      reconnectAttempts: 0,
      currentSeq: 0
    })
  })

  describe('Connection Status', () => {
    it('sollte initialen Status "disconnected" haben', () => {
      expect(useConnectionStore.getState().status).toBe('disconnected')
    })

    it('sollte Status ändern können', () => {
      useConnectionStore.getState().setStatus('connecting')
      expect(useConnectionStore.getState().status).toBe('connecting')
    })

    it('sollte auf connected setzen mit clientId', () => {
      useConnectionStore.getState().setConnected('client-123')

      const state = useConnectionStore.getState()
      expect(state.status).toBe('connected')
      expect(state.clientId).toBe('client-123')
      expect(state.lastConnected).not.toBeNull()
      expect(state.lastError).toBeNull()
      expect(state.reconnectAttempts).toBe(0)
    })

    it('sollte auf disconnected setzen mit optionalem Error', () => {
      useConnectionStore.getState().setConnected('client-123')
      useConnectionStore.getState().setDisconnected('Connection lost')

      const state = useConnectionStore.getState()
      expect(state.status).toBe('disconnected')
      expect(state.lastError).toBe('Connection lost')
    })
  })

  describe('Reconnect Logic', () => {
    it('sollte reconnectAttempts inkrementieren', () => {
      useConnectionStore.getState().setReconnecting()
      expect(useConnectionStore.getState().reconnectAttempts).toBe(1)

      useConnectionStore.getState().setReconnecting()
      expect(useConnectionStore.getState().reconnectAttempts).toBe(2)
    })

    it('sollte Status auf "reconnecting" setzen', () => {
      useConnectionStore.getState().setReconnecting()
      expect(useConnectionStore.getState().status).toBe('reconnecting')
    })

    it('sollte reconnectAttempts zurücksetzen können', () => {
      useConnectionStore.getState().setReconnecting()
      useConnectionStore.getState().setReconnecting()
      useConnectionStore.getState().resetReconnectAttempts()

      expect(useConnectionStore.getState().reconnectAttempts).toBe(0)
    })

    it('sollte reconnectAttempts bei erfolgreicher Verbindung zurücksetzen', () => {
      useConnectionStore.getState().setReconnecting()
      useConnectionStore.getState().setReconnecting()
      useConnectionStore.getState().setConnected('client-123')

      expect(useConnectionStore.getState().reconnectAttempts).toBe(0)
    })
  })

  describe('Sequence Number Tracking', () => {
    it('sollte currentSeq aktualisieren', () => {
      useConnectionStore.getState().updateSeq(5)
      expect(useConnectionStore.getState().currentSeq).toBe(5)
    })

    it('sollte nur höhere seq akzeptieren', () => {
      useConnectionStore.getState().updateSeq(10)
      useConnectionStore.getState().updateSeq(5) // Lower, should be ignored
      useConnectionStore.getState().updateSeq(15)

      expect(useConnectionStore.getState().currentSeq).toBe(15)
    })

    it('sollte gleiche seq ignorieren', () => {
      useConnectionStore.getState().updateSeq(10)
      useConnectionStore.getState().updateSeq(10)

      expect(useConnectionStore.getState().currentSeq).toBe(10)
    })
  })

  describe('Client ID', () => {
    it('sollte clientId setzen können', () => {
      useConnectionStore.getState().setClientId('test-client')
      expect(useConnectionStore.getState().clientId).toBe('test-client')
    })

    it('sollte clientId auf null setzen können', () => {
      useConnectionStore.getState().setClientId('test-client')
      useConnectionStore.getState().setClientId(null)
      expect(useConnectionStore.getState().clientId).toBeNull()
    })
  })
})
