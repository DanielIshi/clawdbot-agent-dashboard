/**
 * Connection Store - manages WebSocket connection state
 */
import { create } from 'zustand'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

interface ConnectionState {
  status: ConnectionStatus
  clientId: string | null
  lastConnected: Date | null
  lastError: string | null
  reconnectAttempts: number
  currentSeq: number

  // Actions
  setStatus: (status: ConnectionStatus) => void
  setClientId: (id: string | null) => void
  setConnected: (clientId: string) => void
  setDisconnected: (error?: string) => void
  setReconnecting: () => void
  updateSeq: (seq: number) => void
  resetReconnectAttempts: () => void
  incrementReconnectAttempts: () => void
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  clientId: null,
  lastConnected: null,
  lastError: null,
  reconnectAttempts: 0,
  currentSeq: 0,

  setStatus: (status) => set({ status }),

  setClientId: (id) => set({ clientId: id }),

  setConnected: (clientId) => set({
    status: 'connected',
    clientId,
    lastConnected: new Date(),
    lastError: null,
    reconnectAttempts: 0
  }),

  setDisconnected: (error) => set({
    status: 'disconnected',
    lastError: error || null
  }),

  setReconnecting: () => set((state) => ({
    status: 'reconnecting',
    reconnectAttempts: state.reconnectAttempts + 1
  })),

  updateSeq: (seq) => set((state) => ({
    currentSeq: Math.max(state.currentSeq, seq)
  })),

  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),

  incrementReconnectAttempts: () => set((state) => ({
    reconnectAttempts: state.reconnectAttempts + 1
  }))
}))
