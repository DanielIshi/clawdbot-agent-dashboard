import { create } from 'zustand';

export type CostInterval = '1m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';

export interface ModelCostBreakdown {
  total_cost: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  request_count: number;
}

export interface TimeseriesBucket {
  timestamp: string;
  total_cost: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  request_count: number;
  by_model: Record<string, ModelCostBreakdown>;
}

export interface BudgetInfo {
  daily_budget: number;
  monthly_budget: number;
  alert_threshold: number;
  daily_spent: number;
  monthly_spent: number;
  daily_percent: number;
  monthly_percent: number;
}

export interface CostSummary {
  period: string;
  total_cost: number;
  request_count: number;
  avg_cost_per_request: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  by_model: Record<string, ModelCostBreakdown>;
  by_category: {
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
  };
  budget: BudgetInfo | null;
}

export interface CostStore {
  interval: CostInterval;
  dateRange: { from: string; to: string } | null;
  selectedModels: string[];
  timeseriesData: TimeseriesBucket[];
  summaryData: {
    today: CostSummary | null;
    week: CostSummary | null;
    month: CostSummary | null;
  };
  models: string[];
  isLoading: boolean;
  error: string | null;

  setInterval: (interval: CostInterval) => void;
  setDateRange: (range: { from: string; to: string } | null) => void;
  setSelectedModels: (models: string[]) => void;
  fetchTimeseries: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  fetchModels: () => Promise<void>;
}

const API_BASE = '/api/cost';

export const useCostStore = create<CostStore>((set, get) => ({
  interval: '1h',
  dateRange: null,
  selectedModels: [],
  timeseriesData: [],
  summaryData: {
    today: null,
    week: null,
    month: null,
  },
  models: [],
  isLoading: false,
  error: null,

  setInterval: (interval) => {
    set({ interval });
  },

  setDateRange: (range) => {
    set({ dateRange: range });
  },

  setSelectedModels: (models) => {
    set({ selectedModels: models });
  },

  fetchTimeseries: async () => {
    const { interval, dateRange, selectedModels } = get();
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams({ interval });
      if (dateRange?.from) params.set('from', dateRange.from);
      if (dateRange?.to) params.set('to', dateRange.to);
      if (selectedModels.length === 1) params.set('model', selectedModels[0]);

      const response = await fetch(`${API_BASE}/timeseries?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      set({ timeseriesData: data.buckets || [], isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch timeseries',
        isLoading: false,
      });
    }
  },

  fetchSummary: async () => {
    try {
      const [todayRes, weekRes, monthRes] = await Promise.all([
        fetch(`${API_BASE}/summary?period=today`),
        fetch(`${API_BASE}/summary?period=week`),
        fetch(`${API_BASE}/summary?period=month`),
      ]);

      const [today, week, month] = await Promise.all([
        todayRes.json(),
        weekRes.json(),
        monthRes.json(),
      ]);

      set({
        summaryData: { today, week, month },
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch summary',
      });
    }
  },

  fetchModels: async () => {
    try {
      const response = await fetch(`${API_BASE}/models`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      set({ models: data.models || [] });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch models',
      });
    }
  },
}));
