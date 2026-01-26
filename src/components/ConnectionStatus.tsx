/**
 * Connection Status Component - displays WebSocket connection status
 */
import { useConnectionStore } from '../stores/connectionStore'

const STATUS_CONFIG = {
  disconnected: {
    color: 'bg-red-500',
    text: 'Disconnected',
    animate: false
  },
  connecting: {
    color: 'bg-yellow-500',
    text: 'Connecting...',
    animate: true
  },
  connected: {
    color: 'bg-green-500',
    text: 'Connected',
    animate: true
  },
  reconnecting: {
    color: 'bg-orange-500',
    text: 'Reconnecting...',
    animate: true
  }
}

export function ConnectionStatus() {
  const { status, reconnectAttempts, currentSeq } = useConnectionStore()

  const config = STATUS_CONFIG[status]

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${config.color} ${config.animate ? 'animate-pulse' : ''}`}
        ></span>
        <span className="text-gray-400">{config.text}</span>
      </div>

      {status === 'reconnecting' && (
        <span className="text-orange-400 text-xs">
          Attempt {reconnectAttempts}
        </span>
      )}

      {status === 'connected' && currentSeq > 0 && (
        <span className="text-gray-500 text-xs">
          seq: {currentSeq}
        </span>
      )}
    </div>
  )
}

export default ConnectionStatus
