import { useEffect, useRef } from 'react';
import { useCostStore, CostInterval } from '../stores/costStore';

/**
 * Refresh intervals mapped by data interval.
 * Shorter data intervals get more frequent refreshes.
 */
const REFRESH_MS: Record<CostInterval, number> = {
  '1m':  60_000,      // every 60s
  '15m': 300_000,     // every 5min
  '30m': 300_000,     // every 5min
  '1h':  900_000,     // every 15min
  '4h':  900_000,     // every 15min
  '1d':  900_000,     // every 15min
  '1w':  900_000,     // every 15min
  '1M':  900_000,     // every 15min
};

/**
 * Hook that fetches cost data on mount/interval change and sets up auto-refresh.
 *
 * Usage:
 * ```tsx
 * function CostDashboard() {
 *   useCostData();
 *   const { timeseriesData, summaryData } = useCostStore();
 *   // render ...
 * }
 * ```
 */
export function useCostData() {
  const interval = useCostStore((s) => s.interval);
  const fetchTimeseries = useCostStore((s) => s.fetchTimeseries);
  const fetchSummary = useCostStore((s) => s.fetchSummary);
  const fetchModels = useCostStore((s) => s.fetchModels);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial fetch of models (once)
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Fetch data on interval change + auto-refresh
  useEffect(() => {
    // Immediate fetch
    fetchTimeseries();
    fetchSummary();

    // Set up auto-refresh
    const refreshMs = REFRESH_MS[interval] || 900_000;
    timerRef.current = setInterval(() => {
      fetchTimeseries();
      fetchSummary();
    }, refreshMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [interval, fetchTimeseries, fetchSummary]);
}
