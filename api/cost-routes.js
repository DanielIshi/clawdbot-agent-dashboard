import { Router } from 'express';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// ---------------------------------------------------------------------------
// Database helper
// ---------------------------------------------------------------------------
const DB_PATH = join(__dirname, '..', 'data', 'cost-data.sqlite');

function getDb() {
  if (!existsSync(DB_PATH)) return null;
  const db = new Database(DB_PATH, { readonly: false, fileMustExist: true });
  
  return db;
}

// ---------------------------------------------------------------------------
// Interval helpers
// ---------------------------------------------------------------------------
const INTERVAL_SQL = {
  '1m':  `strftime('%Y-%m-%dT%H:%M:00Z', timestamp)`,
  '15m': `strftime('%Y-%m-%dT%H:', timestamp) || printf('%02d', (cast(strftime('%M', timestamp) as integer) / 15) * 15) || ':00Z'`,
  '30m': `strftime('%Y-%m-%dT%H:', timestamp) || printf('%02d', (cast(strftime('%M', timestamp) as integer) / 30) * 30) || ':00Z'`,
  '1h':  `strftime('%Y-%m-%dT%H:00:00Z', timestamp)`,
  '4h':  `strftime('%Y-%m-%dT', timestamp) || printf('%02d', (cast(strftime('%H', timestamp) as integer) / 4) * 4) || ':00:00Z'`,
  '1d':  `strftime('%Y-%m-%dT00:00:00Z', timestamp)`,
  '1w':  `strftime('%Y-W%W', timestamp)`,
  '1M':  `strftime('%Y-%m-01T00:00:00Z', timestamp)`,
};

const DEFAULT_LOOKBACK = {
  '1m':  '1 hour',
  '15m': '6 hours',
  '30m': '12 hours',
  '1h':  '24 hours',
  '4h':  '7 days',
  '1d':  '30 days',
  '1w':  '30 days',
  '1M':  '365 days',
};

// Map human-readable durations to SQLite datetime modifier strings
function lookbackToModifier(lookback) {
  const map = {
    '1 hour':    '-1 hours',
    '6 hours':   '-6 hours',
    '12 hours':  '-12 hours',
    '24 hours':  '-24 hours',
    '7 days':    '-7 days',
    '30 days':   '-30 days',
    '365 days':  '-365 days',
  };
  return map[lookback] || '-24 hours';
}

// ---------------------------------------------------------------------------
// GET /api/cost/timeseries
// ---------------------------------------------------------------------------
router.get('/timeseries', (req, res) => {
  const db = getDb();
  if (!db) {
    return res.json({ buckets: [], interval: req.query.interval || '1h' });
  }

  try {
    const interval = INTERVAL_SQL[req.query.interval] ? req.query.interval : '1h';
    const bucketExpr = INTERVAL_SQL[interval];
    const model = req.query.model || null;
    const from = req.query.from || null;
    const to = req.query.to || null;

    const conditions = [];
    const params = {};

    if (from) {
      conditions.push(`timestamp >= :from`);
      params.from = from;
    } else {
      const modifier = lookbackToModifier(DEFAULT_LOOKBACK[interval]);
      conditions.push(`timestamp >= datetime('now', '${modifier}')`);
    }

    if (to) {
      conditions.push(`timestamp <= :to`);
      params.to = to;
    }

    if (model) {
      conditions.push(`model = :model`);
      params.model = model;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Aggregate buckets
    const sql = `
      SELECT
        ${bucketExpr} AS bucket,
        model,
        SUM(cost_total) AS total_cost,
        SUM(input_tokens) AS input_tokens,
        SUM(output_tokens) AS output_tokens,
        SUM(cache_read_tokens) AS cache_read_tokens,
        SUM(cache_write_tokens) AS cache_write_tokens,
        COUNT(*) AS request_count
      FROM cost_events
      ${whereClause}
      GROUP BY bucket, model
      ORDER BY bucket ASC
    `;

    const rows = db.prepare(sql).all(params);

    // Group by bucket, nest models
    const bucketMap = new Map();
    for (const row of rows) {
      if (!bucketMap.has(row.bucket)) {
        bucketMap.set(row.bucket, {
          timestamp: row.bucket,
          total_cost: 0,
          input_tokens: 0,
          output_tokens: 0,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          request_count: 0,
          by_model: {},
        });
      }
      const b = bucketMap.get(row.bucket);
      b.total_cost += row.total_cost || 0;
      b.input_tokens += row.input_tokens || 0;
      b.output_tokens += row.output_tokens || 0;
      b.cache_read_tokens += row.cache_read_tokens || 0;
      b.cache_write_tokens += row.cache_write_tokens || 0;
      b.request_count += row.request_count || 0;
      b.by_model[row.model] = {
        total_cost: row.total_cost || 0,
        input_tokens: row.input_tokens || 0,
        output_tokens: row.output_tokens || 0,
        cache_read_tokens: row.cache_read_tokens || 0,
        cache_write_tokens: row.cache_write_tokens || 0,
        request_count: row.request_count || 0,
      };
    }

    db.close();
    return res.json({
      interval,
      buckets: Array.from(bucketMap.values()),
    });
  } catch (err) {
    db.close();
    console.error('[cost-routes] timeseries error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/cost/summary?period=today|week|month
// ---------------------------------------------------------------------------
router.get('/summary', (req, res) => {
  const db = getDb();
  if (!db) {
    return res.json({
      period: req.query.period || 'today',
      total_cost: 0,
      request_count: 0,
      avg_cost_per_request: 0,
      input_tokens: 0,
      output_tokens: 0,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      by_model: {},
      by_category: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
      budget: null,
    });
  }

  try {
    const period = req.query.period || 'today';
    let dateFilter;
    switch (period) {
      case 'today':
        dateFilter = `timestamp >= datetime('now', 'start of day')`;
        break;
      case 'week':
        dateFilter = `timestamp >= datetime('now', '-7 days')`;
        break;
      case 'month':
        dateFilter = `timestamp >= datetime('now', 'start of month')`;
        break;
      default:
        dateFilter = `timestamp >= datetime('now', 'start of day')`;
    }

    // Total aggregates
    const totalRow = db.prepare(`
      SELECT
        SUM(cost_total) AS total_cost,
        SUM(input_tokens) AS input_tokens,
        SUM(output_tokens) AS output_tokens,
        SUM(cache_read_tokens) AS cache_read_tokens,
        SUM(cache_write_tokens) AS cache_write_tokens,
        SUM(cost_input) AS cost_input,
        SUM(cost_output) AS cost_output,
        SUM(cost_cache_read) AS cost_cache_read,
        SUM(cost_cache_write) AS cost_cache_write,
        COUNT(*) AS request_count
      FROM cost_events
      WHERE ${dateFilter}
    `).get();

    // Per-model breakdown
    const modelRows = db.prepare(`
      SELECT
        model,
        SUM(cost_total) AS total_cost,
        SUM(input_tokens) AS input_tokens,
        SUM(output_tokens) AS output_tokens,
        COUNT(*) AS request_count
      FROM cost_events
      WHERE ${dateFilter}
      GROUP BY model
      ORDER BY total_cost DESC
    `).all();

    const byModel = {};
    for (const m of modelRows) {
      byModel[m.model] = {
        total_cost: m.total_cost || 0,
        input_tokens: m.input_tokens || 0,
        output_tokens: m.output_tokens || 0,
        request_count: m.request_count || 0,
      };
    }

    // Budget config
    let budget = null;
    try {
      const budgetRow = db.prepare(`SELECT * FROM budget_config LIMIT 1`).get();
      if (budgetRow) {
        const dailyCost = db.prepare(`
          SELECT SUM(cost_total) AS cost
          FROM cost_events
          WHERE timestamp >= datetime('now', 'start of day')
        `).get();
        const monthlyCost = db.prepare(`
          SELECT SUM(cost_total) AS cost
          FROM cost_events
          WHERE timestamp >= datetime('now', 'start of month')
        `).get();

        budget = {
          daily_budget: budgetRow.daily_budget,
          monthly_budget: budgetRow.monthly_budget,
          alert_threshold: budgetRow.alert_threshold,
          daily_spent: dailyCost?.cost || 0,
          monthly_spent: monthlyCost?.cost || 0,
          daily_percent: budgetRow.daily_budget > 0
            ? ((dailyCost?.cost || 0) / budgetRow.daily_budget) * 100
            : 0,
          monthly_percent: budgetRow.monthly_budget > 0
            ? ((monthlyCost?.cost || 0) / budgetRow.monthly_budget) * 100
            : 0,
        };
      }
    } catch {
      // budget_config table may not exist yet
    }

    const requestCount = totalRow?.request_count || 0;
    const totalCost = totalRow?.total_cost || 0;

    db.close();
    return res.json({
      period,
      total_cost: totalCost,
      request_count: requestCount,
      avg_cost_per_request: requestCount > 0 ? totalCost / requestCount : 0,
      input_tokens: totalRow?.input_tokens || 0,
      output_tokens: totalRow?.output_tokens || 0,
      cache_read_tokens: totalRow?.cache_read_tokens || 0,
      cache_write_tokens: totalRow?.cache_write_tokens || 0,
      by_model: byModel,
      by_category: {
        input: totalRow?.cost_input || 0,
        output: totalRow?.cost_output || 0,
        cache_read: totalRow?.cost_cache_read || 0,
        cache_write: totalRow?.cost_cache_write || 0,
      },
      budget,
    });
  } catch (err) {
    db.close();
    console.error('[cost-routes] summary error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/cost/models
// ---------------------------------------------------------------------------
router.get('/models', (req, res) => {
  const db = getDb();
  if (!db) {
    return res.json({ models: [] });
  }

  try {
    const rows = db.prepare(`
      SELECT DISTINCT model
      FROM cost_events
      ORDER BY model ASC
    `).all();

    db.close();
    return res.json({ models: rows.map(r => r.model) });
  } catch (err) {
    db.close();
    console.error('[cost-routes] models error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/cost/budget
// ---------------------------------------------------------------------------
router.get('/budget', (req, res) => {
  const db = getDb();
  if (!db) {
    return res.json({ budget: null });
  }

  try {
    let budget = null;
    const budgetRow = db.prepare(`SELECT * FROM budget_config LIMIT 1`).get();

    if (budgetRow) {
      const dailyCost = db.prepare(`
        SELECT SUM(cost_total) AS cost
        FROM cost_events
        WHERE timestamp >= datetime('now', 'start of day')
      `).get();
      const monthlyCost = db.prepare(`
        SELECT SUM(cost_total) AS cost
        FROM cost_events
        WHERE timestamp >= datetime('now', 'start of month')
      `).get();

      budget = {
        daily_budget: budgetRow.daily_budget,
        monthly_budget: budgetRow.monthly_budget,
        alert_threshold: budgetRow.alert_threshold,
        daily_spent: dailyCost?.cost || 0,
        monthly_spent: monthlyCost?.cost || 0,
        daily_percent: budgetRow.daily_budget > 0
          ? ((dailyCost?.cost || 0) / budgetRow.daily_budget) * 100
          : 0,
        monthly_percent: budgetRow.monthly_budget > 0
          ? ((monthlyCost?.cost || 0) / budgetRow.monthly_budget) * 100
          : 0,
      };
    }

    db.close();
    return res.json({ budget });
  } catch (err) {
    db.close();
    console.error('[cost-routes] budget error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
