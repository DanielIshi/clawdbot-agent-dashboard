import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3456;

const HOME = process.env.HOME || '/home/claude';
const SESSIONS_DIR = path.join(HOME, '.codex-agent', 'sessions');
const LOGS_DIR = path.join(HOME, '.codex-agent', 'logs');

app.use(express.static(path.join(__dirname, 'public')));

function getDemoSessions() {
  return [
    {
      name: 'claude-opus',
      type: 'claude',
      status: 'active',
      project: 'agent-dashboard',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      lastActivity: new Date().toISOString(),
      lastOutput: 'Implementing isometric terrain and speech bubble overlay...',
      tool: 'coder'
    },
    {
      name: 'codex-runner',
      type: 'codex',
      status: 'active',
      project: 'api-service',
      startedAt: new Date(Date.now() - 1800000).toISOString(),
      lastActivity: new Date(Date.now() - 5000).toISOString(),
      lastOutput: 'Running tests: 42/50 passed, fixing edge cases...',
      tool: 'runner'
    },
    {
      name: 'gpt-researcher',
      type: 'gpt',
      status: 'done',
      project: 'docs-gen',
      startedAt: new Date(Date.now() - 7200000).toISOString(),
      lastActivity: new Date(Date.now() - 600000).toISOString(),
      lastOutput: 'Research complete: 12 relevant papers summarized.',
      tool: 'researcher'
    }
  ];
}

function detectAgentType(data) {
  const name = `${data.name || ''}`.toLowerCase();
  if (name.includes('codex')) return 'codex';
  if (name.includes('gpt') || name.includes('openai')) return 'gpt';
  if (name.includes('ollama') || name.includes('llama')) return 'ollama';
  return 'claude';
}

function mapStatus(status) {
  if (status === 'running') return 'active';
  if (status === 'completed') return 'done';
  if (status === 'failed' || status === 'error') return 'failed';
  return status || 'active';
}

function parseStreamJson(raw) {
  if (!raw || typeof raw !== 'string') return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed.type === 'result') {
      if (parsed.result) return parsed.result.substring(0, 200);
      if (parsed.subtype === 'success') return 'Task completed successfully';
      if (parsed.subtype === 'error_max_turns') return 'Reached max turns limit';
      return `Finished (${parsed.subtype || 'done'})`;
    }
    if (parsed.type === 'assistant' && parsed.message && parsed.message.content) {
      for (const c of parsed.message.content) {
        if (c.type === 'text' && c.text) return c.text.trim().substring(0, 200);
        if (c.type === 'tool_use') {
          const toolName = c.name || 'tool';
          const desc = c.input && c.input.description ? `: ${c.input.description}` : '';
          return `Using ${toolName}${desc}`.substring(0, 200);
        }
      }
    }
    if (parsed.type === 'system' && parsed.subtype === 'init') {
      return `Initializing session (${parsed.model || 'agent'})`;
    }
    return '';
  } catch {
    return raw.substring(0, 200);
  }
}

function getLastOutput(name) {
  const logFile = path.join(LOGS_DIR, `${name}.log`);
  try {
    if (!fs.existsSync(logFile)) return '';
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter((l) => l.trim());
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 25); i -= 1) {
      const parsed = parseStreamJson(lines[i]);
      if (parsed) return parsed;
    }
    return lines[lines.length - 1] || '';
  } catch {
    return '';
  }
}

function detectProject(data) {
  if (data.project) return data.project;
  const prompt = `${data.prompt || ''}`.toLowerCase();
  const name = `${data.name || ''}`.toLowerCase();
  if (prompt.includes('dashboard') || name.includes('dashboard')) return 'agent-dashboard';
  if (prompt.includes('issue')) return 'issue-work';
  if (prompt.includes('research') || name.includes('research')) return 'research';
  if (prompt.includes('test') || name.includes('test')) return 'testing';
  return name || 'unknown';
}

function getRealSessions() {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) return [];
    const files = fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.json'));
    return files
      .map((file) => {
        try {
          const raw = fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf8');
          const data = JSON.parse(raw);
          const name = data.name || path.basename(file, '.json');
          const parsedOutput = parseStreamJson(data.lastOutput || '');
          const lastOutput =
            parsedOutput ||
            getLastOutput(name) ||
            (data.prompt ? `${data.prompt}`.substring(0, 100) : '');
          return {
            name,
            type: detectAgentType(data),
            status: mapStatus(data.status),
            project: detectProject(data),
            startedAt: data.start_time || data.startedAt || new Date().toISOString(),
            lastActivity: data.lastActivity || new Date().toISOString(),
            lastOutput,
            tool: data.tool || 'coder'
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

app.get('/api/sessions', (req, res) => {
  const real = getRealSessions();
  const payload = real.length > 0 ? real : getDemoSessions();
  res.json(payload);
});

app.get('/api/sessions/:name/log', (req, res) => {
  const logFile = path.join(LOGS_DIR, `${req.params.name}.log`);
  try {
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split('\n').slice(-60);
      res.json({ name: req.params.name, lines });
    } else {
      res.json({ name: req.params.name, lines: ['No log file found.'] });
    }
  } catch {
    res.status(500).json({ error: 'Failed to read log' });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    sessions_dir: SESSIONS_DIR,
    logs_dir: LOGS_DIR
  });
});

app.listen(PORT, () => {
  console.log(`Agent Dashboard running at http://localhost:${PORT}`);
  console.log(`Sessions dir: ${SESSIONS_DIR}`);
  console.log(`Logs dir: ${LOGS_DIR}`);
});
