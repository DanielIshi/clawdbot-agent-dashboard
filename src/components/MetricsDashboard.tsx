/**
 * Metrics Dashboard View
 * Displays real-time metrics charts for agents, rate limits, and token usage
 */
import React from 'react'
import { MetricsChart, RateLimitChart, TokenDonutChart } from '../components/charts'

// Mock data for demonstration
const generateMockData = (hours: number, baseValue: number, variance: number) => {
  const data = []
  const now = new Date()
  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    data.push({
      timestamp: time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      value: Math.max(0, baseValue + (Math.random() - 0.5) * variance),
    })
  }
  return data
}

const mockTokenData = [
  { name: 'Claude API', value: 0.45, color: '#3B82F6' },
  { name: 'GitHub API', value: 0.30, color: '#10B981' },
  { name: 'Other', value: 0.25, color: '#6B7280' },
]

const mockRateLimitData = Array.from({ length: 12 }, (_, i) => {
  const now = new Date()
  const time = new Date(now.getTime() - (11 - i) * 60 * 60 * 1000)
  const used = 100 + Math.floor(Math.random() * 400)
  return {
    timestamp: time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    remaining: 5000 - used,
    limit: 5000,
    used,
  }
})

export function MetricsDashboard() {
  const agentResponseTimeData = generateMockData(12, 250, 150)
  const tokenUsageData = generateMockData(12, 15000, 8000)
  const issueProcessedData = generateMockData(12, 45, 30)
  const errorRateData = generateMockData(12, 2, 4)

  return (
    <div className="p-6 space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Avg Response Time</div>
          <div className="text-2xl font-bold text-white mt-1">245ms</div>
          <div className="text-xs text-green-400 mt-1">↓ 12% from last hour</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Tokens Used Today</div>
          <div className="text-2xl font-bold text-white mt-1">127K</div>
          <div className="text-xs text-gray-400 mt-1">of 1M monthly limit</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Issues Processed</div>
          <div className="text-2xl font-bold text-white mt-1">342</div>
          <div className="text-xs text-green-400 mt-1">↑ 8% from yesterday</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Error Rate</div>
          <div className="text-2xl font-bold text-white mt-1">1.2%</div>
          <div className="text-xs text-green-400 mt-1">↓ 0.3% from last hour</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsChart
          title="Agent Response Time"
          data={agentResponseTimeData}
          dataKey="value"
          color="#3B82F6"
          unit="ms"
        />
        <MetricsChart
          title="Token Usage"
          data={tokenUsageData}
          dataKey="value"
          color="#10B981"
          unit=""
        />
        <RateLimitChart data={mockRateLimitData} />
        <TokenDonutChart
          data={mockTokenData}
          total={127432}
          title="Token Distribution"
        />
        <MetricsChart
          title="Issues Processed per Hour"
          data={issueProcessedData}
          dataKey="value"
          color="#8B5CF6"
          unit=""
        />
        <MetricsChart
          title="Error Rate"
          data={errorRateData}
          dataKey="value"
          color="#EF4444"
          unit="%"
          showArea={false}
        />
      </div>

      {/* Historical Comparison */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">24h Comparison</h3>
        <MetricsChart
          title="Total Requests (24h)"
          data={generateMockData(24, 500, 200)}
          dataKey="value"
          color="#6366F1"
          unit=""
          height={150}
        />
      </div>
    </div>
  )
}
