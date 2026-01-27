/**
 * Metrics Chart Component
 * Visualizes agent metrics, rate limits, and token usage over time
 */
import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts'

interface MetricsDataPoint {
  timestamp: string
  value: number
}

interface MetricsChartProps {
  title: string
  data: MetricsDataPoint[]
  dataKey: string
  color?: string
  unit?: string
  showArea?: boolean
  height?: number
}

export function MetricsChart({
  title,
  data,
  dataKey,
  color = '#3B82F6',
  unit = '',
  showArea = true,
  height = 200,
}: MetricsChartProps) {
  const formatValue = (val: number) => `${val}${unit}`

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {showArea ? (
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="timestamp"
              stroke="#6B7280"
              fontSize={11}
              tickFormatter={(val) => val.split(':').slice(0, 2).join(':')}
            />
            <YAxis stroke="#6B7280" fontSize={11} tickFormatter={formatValue} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#9CA3AF' }}
              formatter={(val: number) => [formatValue(val), title]}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={`url(#gradient-${dataKey})`}
              strokeWidth={2}
            />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="timestamp"
              stroke="#6B7280"
              fontSize={11}
              tickFormatter={(val) => val.split(':').slice(0, 2).join(':')}
            />
            <YAxis stroke="#6B7280" fontSize={11} tickFormatter={formatValue} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#9CA3AF' }}
              formatter={(val: number) => [formatValue(val), title]}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Multi-Metric Chart
 * Shows multiple metrics on the same chart for comparison
 */
interface MultiMetricDataPoint {
  timestamp: string
  [key: string]: string | number
}

interface MultiMetricChartProps {
  title: string
  data: MultiMetricDataPoint[]
  metrics: Array<{
    dataKey: string
    name: string
    color: string
  }>
  height?: number
}

export function MultiMetricChart({
  title,
  data,
  metrics,
  height = 250,
}: MultiMetricChartProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="timestamp"
            stroke="#6B7280"
            fontSize={11}
            tickFormatter={(val) => val.split(':').slice(0, 2).join(':')}
          />
          <YAxis stroke="#6B7280" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#9CA3AF' }}
          />
          <Legend />
          {metrics.map((metric) => (
            <Line
              key={metric.dataKey}
              type="monotone"
              dataKey={metric.dataKey}
              name={metric.name}
              stroke={metric.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Token Usage Donut Chart
 */
interface TokenUsageData {
  name: string
  value: number
  color: string
}

interface TokenDonutChartProps {
  data: TokenUsageData[]
  total: number
  title: string
}

export function TokenDonutChart({ data, total, title }: TokenDonutChartProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">{title}</h3>
      <div className="flex items-center justify-between">
        <ResponsiveContainer width="60%" height={180}>
          <AreaChart data={data} stackOffset="expand" layout="vertical">
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={11} width={80} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              formatter={(val: number, name: string) => [
                `${(val * 100).toFixed(1)}%`,
                name,
              ]}
            />
            <Area
              dataKey="value"
              stroke="none"
              stackId="a"
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="w-1/3">
          <div className="text-3xl font-bold text-white mb-1">
            {total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Total Tokens</div>
          <div className="mt-3 space-y-2">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Rate Limit Timeline
 */
interface RateLimitData {
  timestamp: string
  remaining: number
  limit: number
  used: number
}

interface RateLimitChartProps {
  data: RateLimitData[]
}

export function RateLimitChart({ data }: RateLimitChartProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Rate Limit Usage</h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="rateLimitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="80%" stopColor="#EF4444" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="timestamp"
            stroke="#6B7280"
            fontSize={11}
            tickFormatter={(val) => val.split(':').slice(0, 2).join(':')}
          />
          <YAxis stroke="#6B7280" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#9CA3AF' }}
            formatter={(val: number, name: string) => [
              val.toLocaleString(),
              name === 'remaining' ? 'Remaining' : 'Used',
            ]}
          />
          <Area
            type="monotone"
            dataKey="remaining"
            stroke="#10B981"
            fill="url(#rateLimitGradient)"
            strokeWidth={2}
            name="Remaining"
          />
          <Line
            type="monotone"
            dataKey="limit"
            stroke="#6B7280"
            strokeDasharray="5 5"
            dot={false}
            name="Limit"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
