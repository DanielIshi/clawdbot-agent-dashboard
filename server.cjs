/**
 * Agent Dashboard - Unified Server
 * Alles in einer Datei: Static Files + REST API + WebSocket
 * Start: node server.cjs
 */

const express = require('express')
const http = require('http')
const { WebSocketServer } = require('ws')
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 3456

app.use(express.json())

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function execAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 5000 }, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout)
    })
  })
}

const SESSION_DIRS = [
  '/home/claude/.codex-agent/sessions',
  '/home/claude/.claude-agent/sessions',
]

function readAgentSessions() {
  const sessions = []
  SESSION_DIRS.forEach(dir => {
    if (!fs.existsSync(dir)) return
    try {
      fs.readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .forEach(file => {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))
            sessions.push({
              name: data.name || file.replace('.json', ''),
              type: dir.includes('codex') ? 'codex' : 'claude',
              source: 'agent',
              status: data.status || 'active',
              project: data.working_dir || data.project || 'unknown',
            })
          } catch { /* skip corrupt file */ }
        })
    } catch { /* skip unreadable dir */ }
  })
  return sessions
}

async function readTmuxSessions() {
  try {
    const out = await execAsync('tmux list-sessions -F "#{session_name}|#{session_created}" 2>/dev/null')
    return out.trim().split('\n').filter(Boolean).map(line => {
      const [name, created] = line.split('|')
      return {
        agent: name,
        tmux_id: name,
        started: created
          ? new Date(parseInt(created) * 1000).toISOString()
          : new Date().toISOString(),
        project: 'tmux-session',
      }
    })
  } catch {
    return []
  }
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '')
}

// ─── WebSocket ────────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server, path: '/ws/agentops' })
const clients = new Map() // clientId → ws

function broadcast(event) {
  const msg = JSON.stringify(event)
  clients.forEach(ws => {
    if (ws.readyState === ws.OPEN) ws.send(msg)
  })
}

wss.on('connection', (ws, req) => {
  const clientId = crypto.randomUUID()
  clients.set(clientId, ws)
  console.log(`[WS] connect ${clientId} from ${req.socket.remoteAddress}`)

  ws.isAlive = true
  ws.on('pong', () => { ws.isAlive = true })

  ws.on('message', data => {
    try {
      const msg = JSON.parse(data.toString())
      switch (msg.type) {
        case 'handshake':
          ws.send(JSON.stringify({ type: 'handshake_ack', client_id: clientId }))
          break
        case 'subscribe':
          ws.send(JSON.stringify({ type: 'subscribe_ack', subscribed: msg.topics || ['all'] }))
          break
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }))
          break
        case 'command':
          if (msg.command === 'get_snapshot') {
            // Send empty snapshot - dashboard reads live data via REST
            ws.send(JSON.stringify({
              type: 'snapshot',
              agents: [],
              issues: [],
              seq: 0
            }))
          }
          break
      }
    } catch { /* ignore bad messages */ }
  })

  ws.on('close', () => {
    clients.delete(clientId)
    console.log(`[WS] disconnect ${clientId}`)
  })

  ws.on('error', err => {
    console.error(`[WS] error ${clientId}:`, err.message)
    clients.delete(clientId)
  })
})

// Heartbeat - detect dead connections
const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) { ws.terminate(); return }
    ws.isAlive = false
    ws.ping()
  })
}, 30000)

wss.on('close', () => clearInterval(heartbeat))

// Broadcast tmux session changes every 5s
let lastSessionCount = -1
setInterval(async () => {
  const sessions = await readTmuxSessions()
  if (sessions.length !== lastSessionCount) {
    lastSessionCount = sessions.length
    broadcast({
      type: 'activity',
      event_type: 'tmux.sessions.updated',
      payload: { count: sessions.length, sessions }
    })
  }
}, 5000)

// ─── REST API ─────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), clients: clients.size })
})

// All sessions (agent files + tmux)
app.get('/api/sessions', async (req, res) => {
  const agentSessions = readAgentSessions()
  const tmuxSessions = await readTmuxSessions()

  // Add tmux sessions not already in agent files
  tmuxSessions.forEach(ts => {
    if (!agentSessions.find(s => s.name === ts.agent)) {
      const agentType = ts.agent.startsWith('claude') ? 'claude'
        : ts.agent.startsWith('codex') ? 'codex'
        : ts.agent.startsWith('gemini') ? 'gemini'
        : ts.agent.startsWith('opencode') ? 'opencode'
        : ts.agent.startsWith('jules') ? 'jules'
        : 'tmux'
      agentSessions.push({
        name: ts.agent,
        type: agentType,
        source: 'tmux',
        status: 'active',
        project: ts.project,
      })
    }
  })

  res.json(agentSessions)
})

// Tmux sessions only (for TmuxLiveView + SettlersWorldView)
app.get('/api/tmux-sessions', async (req, res) => {
  res.json(await readTmuxSessions())
})

// Tmux terminal output
app.get('/api/sessions/:name/tmux-output', async (req, res) => {
  const name = safeName(req.params.name)
  try {
    const output = await execAsync(`tmux capture-pane -t ${name} -p -S -200 2>/dev/null`)
    res.json({ output })
  } catch {
    res.json({ output: '' })
  }
})

app.get('/api/tmux/:name/output', async (req, res) => {
  const name = safeName(req.params.name)
  try {
    const output = await execAsync(`tmux capture-pane -t ${name} -p -S -200 2>/dev/null`)
    res.json({ active: true, output, name })
  } catch (e) {
    res.json({ active: false, output: '', name })
  }
})

// Send message to tmux session
app.post('/api/tmux/:name/chat', async (req, res) => {
  const name = safeName(req.params.name)
  const { message } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })
  try {
    const escaped = message.replace(/'/g, "'\\''")
    await execAsync(`tmux send-keys -t ${name} '${escaped}' Enter`)
    broadcast({ type: 'activity', event_type: 'agent.message', payload: { session: name, message } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/sessions/:name/chat', async (req, res) => {
  const name = safeName(req.params.name)
  const { message } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })
  try {
    const escaped = message.replace(/'/g, "'\\''")
    await execAsync(`tmux send-keys -t ${name} '${escaped}' Enter`)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Send Enter key
app.post('/api/tmux/:name/send-enter', async (req, res) => {
  const name = safeName(req.params.name)
  try {
    await execAsync(`tmux send-keys -t ${name} '' Enter`)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Kill tmux session
app.delete('/api/tmux-sessions/:name', async (req, res) => {
  const name = safeName(req.params.name)
  try {
    await execAsync(`tmux kill-session -t ${name}`)
    broadcast({ type: 'activity', event_type: 'session.killed', payload: { name } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Start new tmux session
app.post('/api/tmux-sessions/start', async (req, res) => {
  const { type = 'claude', name, prompt = '', cwd = '/home/claude' } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const sName = safeName(name)
  const safeCwd = cwd.replace(/[^a-zA-Z0-9/_.-]/g, '')

  try {
    await execAsync(`tmux new-session -d -s ${sName} -c ${safeCwd}`)
    if (prompt) {
      const escaped = prompt.replace(/'/g, "'\\''")
      await execAsync(`tmux send-keys -t ${sName} '${escaped}' Enter`)
    }
    broadcast({ type: 'activity', event_type: 'session.started', payload: { name: sName, type } })
    res.json({ success: true, name: sName })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Stub endpoints so frontend doesn't get 404s
app.get('/api/agents', (req, res) => res.json([]))
app.get('/api/issues', (req, res) => res.json([]))
app.get('/api/stats', (req, res) => res.json({ agents: 0, issues: 0, events: 0 }))
app.get('/api/clawdbot-status', (req, res) => res.json({ active: false }))
app.get('/api/cost/summary', (req, res) => res.json({ total: 0, entries: [] }))

// ─── Static Frontend ──────────────────────────────────────────────────────────

const distPath = path.join(__dirname, 'dist')
if (fs.existsSync(distPath)) {
  // Serve static assets at both / and /agent-dashboard/ (Vite base path)
  app.use(express.static(distPath))
  app.use('/agent-dashboard', express.static(distPath))
  // SPA fallback - all non-API routes serve index.html
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/ws/')) return next()
    res.sendFile(path.join(distPath, 'index.html'))
  })
} else {
  console.warn('[!] dist/ not found - run: npm run build')
}

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         Agent Dashboard - Unified Server             ║
╠══════════════════════════════════════════════════════╣
║  URL:       http://localhost:${PORT}                   ║
║  WebSocket: ws://localhost:${PORT}/ws/agentops          ║
╚══════════════════════════════════════════════════════╝
  `)
})

process.on('SIGINT', () => {
  console.log('\nShutting down...')
  server.close(() => process.exit(0))
})
