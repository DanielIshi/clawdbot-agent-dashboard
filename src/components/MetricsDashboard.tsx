/**
 * Enhanced Metrics Dashboard View
 * With real-time updates, alerts, and responsive design
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  MetricsChart,
  RateLimitChart,
  TokenDonutChart,
} from '../components/charts'
import { useToast } from '../hooks/useToast'
import { useAutoRefresh } from '../components/ui'

// Generate more realistic mock data
const generateTimeSeriesData = (points: number, baseValue: number, variance: number, trend = 0) => {
  const data = []
  const now = new Date()
  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    const trendValue = trend * (points - i)
    data.push({
      timestamp: time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      value: Math.max(0, baseValue + (Math.random() - 0.5) * variance + trendValue),
    })
  }
  return data
}

const generateRealtimeData = () => {
  const data = []
  const now = new Date()
  for (let i = 59; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 1000)
    data.push({
      timestamp: time.toLocaleTimeString('de-DE', { second: '2-digit' }),
      value: Math.floor(Math.random() * 100) + 200,
    })
  }
  return data
}

export function MetricsDashboard() {
  const { showToast } = useToast()
  const [isRealtime, setIsRealtime] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Auto-refresh every 10 seconds
  const { refreshing, lastRefresh, refresh } = useAutoRefresh(10000, isRealtime)

  useEffect(() => {
    if (isRealtime) {
      setRefreshKey((k) => k + 1)
    }
  }, [lastRefresh, isRealtime])

  // Simulate data fetching
  const agentResponseTimeData = generateTimeSeriesData(12, 250, 150)
  const tokenUsageData = generateTimeSeriesData(12, 15000, 8000, 100)
  const issueProcessedData = generateTimeSeriesData(12, 45, 30, 2)
  const errorRateData = generateTimeSeriesData(12, 2, 4, -0.1)
  const realtimeData = generateRealtimeData()

  // Generate rate limit data
  const rateLimitData = Array.from({ length: 12 }, (_, i) => {
    const now = new Date()
    const time = new Date(now.getTime() - (11 - i) * 60 * 60 * 1000)
    const used = 100 + Math.floor(Math.random() * 400)
    return {
      timestamp: time.toLocaleTimeString('de-DE', { hour: '2-digit' }),
      remaining: 5000 - used,
      limit: 5000,
      used,
    }
  })

  const tokenData = [
    { name: 'Claude API', value: 0.45, color: '#3B82F6' },
    { name: 'GitHub API', value: 0.30, color: '#10B981' },
    { name: 'Other', value: 0.25, color: '#6B7280' },
  ]

  // Calculate summary stats
  const avgResponseTime = Math.floor(agentResponseTimeData.reduce((a, b) => a + b.value, 0) / agentResponseTimeData.length)
  const totalTokensToday = Math.floor(tokenUsageData.reduce((a, b) => a + b.value, 0) / 1000)
  const totalIssues = Math.floor(issueProcessedData.reduce((a, b) => a + b.value, 0))
  const avgErrorRate = (errorRateData.reduce((a, b) => a + b.value, 0) / errorRateData.length).toFixed(1)

  const handleRefresh = useCallback(() => {
    refresh()
    showToast('Metrics refreshed', 'info')
  }, [refresh, showToast])

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 pb-20 lg:pb-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">System Metrics</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={isRealtime}
              onChange={(e) => setIsRealtime(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            Live
          </label>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded text-sm transition-colors flex items-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
          <span className="text-xs text-gray-500">
            {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Overview Cards - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-gray-800 rounded-lg p-3 lg:p-4">
          <div className="text-xs lg:text-sm text-gray-400">Avg Response</div>
          <div className="text-xl lg:text-2xl font-bold text-white mt-1">{avgResponseTime}ms</div>
          <div className="text-xs text-green-400 mt-1">↓ 12% from last hour</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 lg:p-4">
          <div className="text-xs lg:text-sm text-gray-400">Tokens Today</div>
          <div className="text-xl lg:text-2xl font-bold text-white mt-1">{totalTokensToday}K</div>
          <div className="text-xs text-gray-400 mt-1">of 1M monthly</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 lg:p-4">
          <div className="text-xs lg:text-sm text-gray-400">Issues</div>
          <div className="text-xl lg:text-2xl font-bold text-white mt-1">{totalIssues}</div>
          <div className="text-xs text-green-400 mt-1">↑ 8% from yesterday</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 lg:p-4">
          <div className="text-xs lg:text-sm text-gray-400">Error Rate</div>
          <div className="text-xl lg:text-2xl font-bold text-white mt-1">{avgErrorRate}%</div>
          <div className="text-xs text-green-400 mt-1">↓ 0.3% from last hour</div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Response Time Chart */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Agent Response Time</h3>
            {isRealtime && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
          {isRealtime ? (
            <MetricsChart
              title=""
              data={realtimeData}
              dataKey="value"
              color="#3B82F6"
              unit="ms"
              height={180}
            />
          ) : (
            <MetricsChart
              title=""
              data={agentResponseTimeData}
              dataKey="value"
              color="#3B82F6"
              unit="ms"
              height={180}
            />
          )}
        </div>

        {/* Rate Limit Chart */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Rate Limit Usage</h3>
          </div>
          <RateLimitChart data={rateLimitData} />
        </div>

        {/* Token Usage */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Token Distribution</h3>
          <TokenDonutChart
            data={tokenData}
            total={totalTokensToday * 1000}
            title=""
          />
        </div>

        {/* Issues Processed */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Issues Processed</h3>
          <MetricsChart
            title=""
            data={issueProcessedData}
            dataKey="value"
            color="#8B5CF6"
            unit=""
            height={180}
          />
        </div>
      </div>

      {/* Historical Comparison */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">24h Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricsChart
            title="Response Time"
            data={generateTimeSeriesData(24, 250, 150)}
            dataKey="value"
            color="#6366F1"
            unit="ms"
            height={150}
          />
          <MetricsChart
            title="Token Usage"
            data={generateTimeSeriesData(24, 15000, 8000)}
            dataKey="value"
            color="#10B981"
            unit=""
            height={150}
          />
          <MetricsChart
            title="Error Rate"
            data={generateTimeSeriesData(24, 2, 4, -0.1)}
            dataKey="value"
            color="#EF4444"
            unit="%"
            height={150}
            showArea={false}
          />
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="bg-gray-800/50 rounded-lg p-4 text-xs text-gray-500">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>Last updated: {lastRefresh.toLocaleString()}</span>
          <span>Auto-refresh: {isRealtime ? '10s' : 'Off'}</span>
          <span>Data source: ClawdBot API</span>
        </div>
      </div>
    </div>
  )
}
