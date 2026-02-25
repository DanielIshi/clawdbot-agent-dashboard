import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts';
import { useCostStore, CostInterval, TimeseriesBucket } from '../stores/costStore';
import { useCostData } from '../hooks/useCostData';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const INTERVALS: CostInterval[] = ['1m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];

const MODEL_COLORS: Record<string, string> = {
  'claude-sonnet':     '#3b82f6', // blue
  'claude-sonnet-4':   '#3b82f6',
  'claude-opus':       '#8b5cf6', // purple
  'claude-opus-4-5':   '#8b5cf6',
  'gpt-4o':            '#22c55e', // green
  'gpt-4o-mini':       '#86efac', // light green
  'minimax':           '#f97316', // orange
  'MiniMax-M2.1':      '#f97316',
  'gemini':            '#14b8a6', // teal
  'gemini-pro':        '#14b8a6',
};

const FALLBACK_COLORS = [
  '#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#14b8a6',
  '#ef4444', '#eab308', '#ec4899', '#06b6d4', '#a855f7',
];

const CATEGORY_COLORS: Record<string, string> = {
  input:       '#3b82f6',
  output:      '#8b5cf6',
  cache_read:  '#22c55e',
  cache_write: '#f97316',
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
function formatUSD(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatPercent(value: number): string {
  return `${Math.min(value, 999).toFixed(1)}%`;
}

function getModelColor(model: string, index: number): string {
  // Check for partial match in known models
  for (const [key, color] of Object.entries(MODEL_COLORS)) {
    if (model.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        alert
          ? 'border-red-500/50 bg-red-950/30'
          : 'border-gray-800 bg-gray-900/60'
      }`}
    >
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${alert ? 'text-red-400' : 'text-gray-100'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function IntervalSelector({
  current,
  onChange,
}: {
  current: CostInterval;
  onChange: (i: CostInterval) => void;
}) {
  return (
    <div className="flex gap-1 bg-gray-900/80 rounded-lg p-1 border border-gray-800">
      {INTERVALS.map((iv) => (
        <button
          key={iv}
          onClick={() => onChange(iv)}
          className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
            iv === current
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          {iv}
        </button>
      ))}
    </div>
  );
}

function BudgetBar({
  label,
  spent,
  budget,
  percent,
}: {
  label: string;
  spent: number;
  budget: number;
  percent: number;
}) {
  const clampedPercent = Math.min(percent, 100);
  const isOver = percent > 100;
  const isWarning = percent > 80;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className={isOver ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-gray-300'}>
          {formatUSD(spent)} / {formatUSD(budget)} ({formatPercent(percent)})
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip for AreaChart
// ---------------------------------------------------------------------------
function CostTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl text-xs">
      <p className="text-gray-400 mb-2">{label ? new Date(label).toLocaleString(undefined, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : ""}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.dataKey}</span>
          <span className="text-gray-200 font-mono">{formatUSD(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function CostDashboard() {
  useCostData();

  const interval = useCostStore((s) => s.interval);
  const setInterval = useCostStore((s) => s.setInterval);
  const timeseriesData = useCostStore((s) => s.timeseriesData);
  const summaryData = useCostStore((s) => s.summaryData);
  const models = useCostStore((s) => s.models);
  const isLoading = useCostStore((s) => s.isLoading);
  const error = useCostStore((s) => s.error);

  // Flatten timeseries for stacked area chart: one key per model
  const chartData = useMemo(() => {
    return timeseriesData.map((bucket: TimeseriesBucket) => {
      const point: Record<string, any> = { timestamp: bucket.timestamp };
      for (const [model, data] of Object.entries(bucket.by_model)) {
        point[model] = data.total_cost;
      }
      return point;
    });
  }, [timeseriesData]);

  // Unique models found in timeseries data
  const chartModels = useMemo(() => {
    const set = new Set<string>();
    for (const bucket of timeseriesData) {
      for (const model of Object.keys(bucket.by_model)) {
        set.add(model);
      }
    }
    return Array.from(set).sort();
  }, [timeseriesData]);

  // Model breakdown for bar chart (from today's summary)
  const modelBarData = useMemo(() => {
    if (!summaryData.today?.by_model) return [];
    return Object.entries(summaryData.today.by_model)
      .map(([model, data]) => ({
        model,
        total_cost: data.total_cost,
        request_count: data.request_count,
      }))
      .sort((a, b) => b.total_cost - a.total_cost);
  }, [summaryData.today]);

  // Category pie data
  const categoryPieData = useMemo(() => {
    if (!summaryData.today?.by_category) return [];
    const cat = summaryData.today.by_category;
    return [
      { name: 'Input', value: cat.input, color: CATEGORY_COLORS.input },
      { name: 'Output', value: cat.output, color: CATEGORY_COLORS.output },
      { name: 'Cache Read', value: cat.cache_read, color: CATEGORY_COLORS.cache_read },
      { name: 'Cache Write', value: cat.cache_write, color: CATEGORY_COLORS.cache_write },
    ].filter((d) => d.value > 0);
  }, [summaryData.today]);

  const today = summaryData.today;
  const week = summaryData.week;
  const month = summaryData.month;
  const budget = today?.budget ?? null;

  const dailyOverBudget = budget ? budget.daily_percent > 100 : false;
  const monthlyOverBudget = budget ? budget.monthly_percent > 100 : false;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cost Analysis</h1>
          <p className="text-sm text-gray-500">API usage and spending overview</p>
        </div>
        <IntervalSelector current={interval} onChange={setInterval} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Today"
          value={formatUSD(today?.total_cost ?? 0)}
          sub={
            budget
              ? `Budget: ${formatUSD(budget.daily_budget)} (${formatPercent(budget.daily_percent)})`
              : `${today?.request_count ?? 0} requests`
          }
          alert={dailyOverBudget}
        />
        <SummaryCard
          label="This Week"
          value={formatUSD(week?.total_cost ?? 0)}
          sub={`${week?.request_count ?? 0} requests`}
        />
        <SummaryCard
          label="This Month"
          value={formatUSD(month?.total_cost ?? 0)}
          sub={
            budget
              ? `Budget: ${formatUSD(budget.monthly_budget)} (${formatPercent(budget.monthly_percent)})`
              : `${month?.request_count ?? 0} requests`
          }
          alert={monthlyOverBudget}
        />
        <SummaryCard
          label="Avg / Request"
          value={formatUSD(today?.avg_cost_per_request ?? 0)}
          sub={`${formatTokens((today?.input_tokens ?? 0) + (today?.output_tokens ?? 0))} tokens today`}
        />
      </div>

      {/* Budget Progress Bars */}
      {budget && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Budget</h2>
          <BudgetBar
            label="Daily"
            spent={budget.daily_spent}
            budget={budget.daily_budget}
            percent={budget.daily_percent}
          />
          <BudgetBar
            label="Monthly"
            spent={budget.monthly_spent}
            budget={budget.monthly_budget}
            percent={budget.monthly_percent}
          />
        </div>
      )}

      {/* Main Timeseries Chart */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
          Cost Over Time
          {isLoading && (
            <span className="ml-2 text-xs text-gray-500 font-normal animate-pulse">
              Loading...
            </span>
          )}
        </h2>
        {chartData.length === 0 ? (
          <EmptyState message="No cost data available for this time range" />
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <defs>
                {chartModels.map((model, i) => {
                  const color = getModelColor(model, i);
                  return (
                    <linearGradient key={model} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="timestamp"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  if (interval === '1d' || interval === '1w' || interval === '1M') {
                    return d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
                  }
                  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
                }}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              />
              <Tooltip content={<CostTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
              />
              {chartModels.map((model, i) => {
                const color = getModelColor(model, i);
                return (
                  <Area
                    key={model}
                    type="monotone"
                    dataKey={model}
                    stackId="cost"
                    stroke={color}
                    fill={`url(#gradient-${i})`}
                    strokeWidth={2}
                  />
                );
              })}
              <Brush
                dataKey="timestamp"
                height={30}
                stroke="#4b5563"
                fill="#111827"
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
                }}
                travellerWidth={10}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two-column: Model Breakdown + Cost Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Breakdown Bar Chart */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
            Model Breakdown (Today)
          </h2>
          {modelBarData.length === 0 ? (
            <EmptyState message="No model data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={modelBarData}
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                />
                <YAxis
                  type="category"
                  dataKey="model"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [formatUSD(value), 'Cost']}
                />
                <Bar dataKey="total_cost" radius={[0, 4, 4, 0]}>
                  {modelBarData.map((entry, i) => (
                    <Cell key={entry.model} fill={getModelColor(entry.model, i)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cost Categories Donut */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
            Cost Categories (Today)
          </h2>
          {categoryPieData.length === 0 ? (
            <EmptyState message="No category data available" />
          ) : (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    strokeWidth={0}
                  >
                    {categoryPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [formatUSD(value), 'Cost']}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Available Models */}
      {models.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
            Available Models
          </h2>
          <div className="flex flex-wrap gap-2">
            {models.map((model, i) => (
              <span
                key={model}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border border-gray-700 bg-gray-800/50"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getModelColor(model, i) }}
                />
                {model}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-xs text-gray-600 text-center">
        Auto-refreshing every{' '}
        {interval === '1m'
          ? '60s'
          : ['15m', '30m'].includes(interval)
          ? '5 min'
          : '15 min'}
      </p>
    </div>
  );
}
