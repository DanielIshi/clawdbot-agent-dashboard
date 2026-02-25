import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3456;

const HOME = process.env.HOME || '/home/claude';
const CODEX_SESSIONS_DIR = path.join(HOME, '.codex-agent', 'sessions');
const CODEX_LOGS_DIR = path.join(HOME, '.codex-agent', 'logs');
const CLAUDE_SESSIONS_DIR = path.join(HOME, '.claude-agent', 'sessions');
const CLAUDE_LOGS_DIR = path.join(HOME, '.claude-agent', 'logs');

app.use(express.static(path.join(__dirname, 'public')));

function getDemoSessions() {
  return [
    {
      name: 'claude-builder',
      type: 'claude',
      status: 'active',
      project: 'agent-dashboard',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      lastActivity: new Date().toISOString(),
      lastOutput: 'Implementing isometric tile renderer with Three.js...',
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
      lastOutput: 'Research complete: 12 relevant papers on CRDT sync.',
      tool: 'researcher'
    }
  ];
}

function detectAgentType(data) {
  const name = (data.name || '').toLowerCase();
  if (name.includes('codex')) return 'codex';
  if (name.includes('jules')) return 'jules';
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
  if (!raw || typeof raw !== 'string') return raw || '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed.type === 'result') {
      if (parsed.result) return parsed.result.substring(0, 200);
      if (parsed.subtype === 'success') return 'Task completed successfully';
      if (parsed.subtype === 'error_max_turns') return 'Reached max turns limit';
      return `Finished (${parsed.subtype || 'done'})`;
    }
    if (parsed.type === 'assistant' && parsed.message && parsed.message.content) {
      const contents = parsed.message.content;
      for (const c of contents) {
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

function getLastOutput(name, logsDir) {
  const logFile = path.join(logsDir, `${name}.log`);
  try {
    if (!fs.existsSync(logFile)) return '';
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter((l) => l.trim());
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 30); i -= 1) {
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
  const prompt = (data.prompt || '').toLowerCase();
  const name = (data.name || '').toLowerCase();
  if (prompt.includes('dashboard') || name.includes('dashboard')) return 'agent-dashboard';
  if (prompt.includes('issue')) return 'issue-work';
  if (prompt.includes('research') || name.includes('research')) return 'research';
  if (prompt.includes('test') || name.includes('test')) return 'testing';
  return name || 'unknown';
}

function readSessionsFrom(dir, logsDir) {
  try {
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    return files.map((f) => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        const name = data.name || path.basename(f, '.json');
        const rawOutput = data.lastOutput || '';
        const parsedOutput = parseStreamJson(rawOutput);
        const lastOutput = parsedOutput || getLastOutput(name, logsDir) || (data.prompt ? data.prompt.substring(0, 100) : '');
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
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function getRealSessions() {
  const codexSessions = readSessionsFrom(CODEX_SESSIONS_DIR, CODEX_LOGS_DIR);
  const claudeSessions = readSessionsFrom(CLAUDE_SESSIONS_DIR, CLAUDE_LOGS_DIR);
  return [...codexSessions, ...claudeSessions];
}

app.get('/api/sessions', (req, res) => {
  const real = getRealSessions();
  res.json(real.length > 0 ? real : getDemoSessions());
});

app.get('/api/sessions/:name/log', (req, res) => {
  const name = req.params.name;
  const logFile = [
    path.join(CODEX_LOGS_DIR, `${name}.log`),
    path.join(CLAUDE_LOGS_DIR, `${name}.log`)
  ].find((candidate) => fs.existsSync(candidate));

  try {
    if (logFile) {
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split('\n').slice(-50);
      res.json({ name, lines });
    } else {
      res.json({ name, lines: ['No log file found.'] });
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
    codex_sessions: CODEX_SESSIONS_DIR,
    claude_sessions: CLAUDE_SESSIONS_DIR,
    logs: CODEX_LOGS_DIR
  });
});

app.listen(PORT, () => {
  console.log(`Agent Dashboard running at http://localhost:${PORT}`);
  console.log(`Codex sessions: ${CODEX_SESSIONS_DIR}`);
  console.log(`Claude sessions: ${CLAUDE_SESSIONS_DIR}`);
});
