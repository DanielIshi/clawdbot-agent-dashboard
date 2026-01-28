/**
 * QuotaStatus Component - Live quota monitoring display
 */
import { useEffect, useState } from 'react'
import { useQuotaStore, selectIsClaudeAvailable, selectQuotaPercent } from '../stores/quotaStore'
import { getRemainingCooldownMinutes } from '../types/quota'

interface QuotaBarProps {
  label: string
  percent: number | null
  remaining?: number | null
  limit?: number | null
}

function QuotaBar({ label, percent, remaining, limit }: QuotaBarProps) {
  if (percent === null) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">{label}</span>
          <span className="text-gray-500">--</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gray-700 w-0" />
        </div>
      </div>
    )
  }

  // Color based on percentage
  let barColor = 'bg-green-500'
  if (percent < 10) {
    barColor = 'bg-red-500'
  } else if (percent < 30) {
    barColor = 'bg-yellow-500'
  } else if (percent < 50) {
    barColor = 'bg-blue-500'
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className={percent < 10 ? 'text-red-400 font-medium' : 'text-gray-300'}>
          {percent}%
          {remaining != null && limit != null && (
            <span className="text-gray-500 ml-1">
              ({remaining.toLocaleString()}/{limit.toLocaleString()})
            </span>
          )}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

interface QuotaStatusProps {
  compact?: boolean
}

export function QuotaStatus({ compact = false }: QuotaStatusProps) {
  const quota = useQuotaStore()
  const isClaudeAvailable = useQuotaStore(selectIsClaudeAvailable)
  const quotaPercent = useQuotaStore(selectQuotaPercent)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  // Update cooldown timer every minute
  useEffect(() => {
    const updateCooldown = () => {
      setCooldownRemaining(getRemainingCooldownMinutes(quota.cooldownEndsAt))
    }
    
    updateCooldown()
    const interval = setInterval(updateCooldown, 60000)
    return () => clearInterval(interval)
  }, [quota.cooldownEndsAt])

  // Compact version for header
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Provider indicator */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
          quota.currentProvider === 'claude' 
            ? isClaudeAvailable 
              ? 'bg-orange-900/50 text-orange-300'
              : 'bg-red-900/50 text-red-300'
            : 'bg-purple-900/50 text-purple-300'
        }`}>
          {quota.currentProvider === 'claude' ? (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              Claude
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z"/>
              </svg>
              Minimax
            </>
          )}
        </div>

        {/* Quota mini bar */}
        {quotaPercent.requests !== null && (
          <div className="flex items-center gap-1">
            <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  quotaPercent.requests < 10 ? 'bg-red-500' : 
                  quotaPercent.requests < 30 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${quotaPercent.requests}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{quotaPercent.requests}%</span>
          </div>
        )}

        {/* Cooldown indicator */}
        {cooldownRemaining > 0 && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
            </svg>
            {cooldownRemaining}m
          </span>
        )}
      </div>
    )
  }

  // Full version for dashboard
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          API Quota
        </h3>

        {/* Current provider badge */}
        <div className={`px-2 py-1 rounded-md text-xs font-medium ${
          quota.currentProvider === 'claude' 
            ? isClaudeAvailable 
              ? 'bg-orange-900/50 text-orange-300 border border-orange-700'
              : 'bg-red-900/50 text-red-300 border border-red-700'
            : 'bg-purple-900/50 text-purple-300 border border-purple-700'
        }`}>
          {quota.currentProvider === 'claude' ? 'Claude' : 'Minimax'}
          {quota.autoSwitchedAt && quota.currentProvider === 'minimax' && (
            <span className="ml-1 text-purple-400">(auto)</span>
          )}
        </div>
      </div>

      {/* Quota bars */}
      <div className="space-y-3 mb-4">
        <QuotaBar 
          label="Requests" 
          percent={quotaPercent.requests}
          remaining={quota.requestsRemaining}
          limit={quota.requestsLimit}
        />
        <QuotaBar 
          label="Tokens" 
          percent={quotaPercent.tokens}
          remaining={quota.tokensRemaining}
          limit={quota.tokensLimit}
        />
      </div>

      {/* Status messages */}
      {!isClaudeAvailable && quota.currentProvider === 'claude' && (
        <div className="bg-red-900/30 border border-red-800 rounded-md p-3 mb-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
            <div>
              <p className="text-red-300 text-sm font-medium">Claude nicht verfügbar</p>
              <p className="text-red-400 text-xs mt-1">
                {quota.isBlocked ? 'Rate Limit erreicht (429)' : 'Quota erschöpft'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cooldown timer */}
      {cooldownRemaining > 0 && (
        <div className="bg-yellow-900/30 border border-yellow-800 rounded-md p-3 mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
            </svg>
            <span className="text-yellow-300 text-sm">
              Cooldown: <strong>{cooldownRemaining} Min</strong> verbleibend
            </span>
          </div>
        </div>
      )}

      {/* Last 429 timestamp */}
      {quota.last429At && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <span>Letzter 429:</span>
          <span className="text-red-400">
            {new Date(quota.last429At).toLocaleTimeString('de-DE')}
          </span>
        </div>
      )}

      {/* Auto-switch notification */}
      {quota.autoSwitchedAt && quota.currentProvider === 'minimax' && (
        <div className="mt-3 text-xs text-purple-400 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
          </svg>
          Auto-Switch zu Minimax um {new Date(quota.autoSwitchedAt).toLocaleTimeString('de-DE')}
        </div>
      )}
    </div>
  )
}

export default QuotaStatus
