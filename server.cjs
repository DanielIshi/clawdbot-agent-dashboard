/**
 * Agent Dashboard Server
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3456;

const SESSION_DIRS = ['/home/claude/.codex-agent/sessions', '/home/claude/.claude-agent/sessions'];
const LOG_DIRS = ['/home/claude/.codex-agent/logs', '/home/claude/.claude-agent/logs'];

app.get('/api/sessions', (req, res) => {
  const all = [];
  const seenIds = new Set();

  // 1) Read sessions from JSON files
  SESSION_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(file => {
        try {
          const d = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
          const id = d.name || file.replace('.json', '');
          const stat = fs.statSync(path.join(dir, file));

          // Map status to frontend SessionStatus: 'active' | 'done' | 'failed'
          let status = 'active';
          if (d.status === 'completed' || d.status === 'done') status = 'done';
          else if (d.status === 'failed' || d.status === 'error') status = 'failed';
          else if (d.status === 'active' || d.status === 'running') status = 'active';

          seenIds.add(id);
          all.push({
            id,
            status,
            lastActivity: d.lastActivity || d.end_time || d.start_time || stat.mtime.toISOString(),
            output: d.prompt || d.task || d.lastOutput || '',
            // Extra fields for compatibility
            name: id,
            type: dir.includes('codex') ? 'codex' : 'claude',
            project: d.project || 'unknown',
            tmux_session: d.tmux_session || null,
          });
        } catch {}
      });
    }
  });

  // 2) Detect live tmux sessions
  try {
    const { execSync } = require('child_process');
    const tmuxOutput = execSync('tmux list-sessions -F "#{session_name}|#{session_created}|#{session_activity}" 2>/dev/null', { encoding: 'utf-8' });
    tmuxOutput.trim().split('\n').filter(Boolean).forEach(line => {
      const [name, created, activity] = line.split('|');
      if (!name) return;
      // Skip if already found in JSON files
      if (seenIds.has(name)) {
        // Update existing entry to active if tmux session is live
        const existing = all.find(s => s.id === name || s.tmux_session === name);
        if (existing) existing.status = 'active';
        return;
      }
      seenIds.add(name);

      // Capture last few lines of tmux pane as output
      let output = '';
      try {
        output = execSync(`tmux capture-pane -t ${name} -p -S -5 2>/dev/null`, { encoding: 'utf-8' }).trim();
      } catch {}

      all.push({
        id: name,
        status: 'active',
        lastActivity: activity ? new Date(parseInt(activity) * 1000).toISOString() : new Date().toISOString(),
        output: output || `tmux session: ${name}`,
        name,
        type: 'tmux',
        project: 'unknown',
        tmux_session: name,
      });
    });
  } catch {}

  // Sort by lastActivity (newest first)
  all.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

  res.json(all);
});

app.get('/api/sessions/:name/log', (req, res) => {
  const name = req.params.name;
  let logContent = '';
  LOG_DIRS.forEach(dir => {
    const p = path.join(dir, name + '.log');
    if (fs.existsSync(p)) logContent = fs.readFileSync(p, 'utf-8');
  });

  const lines = logContent.split('\n').filter(l => l.trim()).slice(-100);

  // Parse log lines into chat format
  const chat = lines.map(line => {
    let role = 'system';
    let text = line;

    // Detect role from line content
    if (line.includes('USER:') || line.includes('👤')) {
      role = 'user';
      text = line.replace(/^.*?(USER:|👤)\s*/, '');
    } else if (line.includes('AGENT:') || line.includes('ASSISTANT:') || line.includes('🤖')) {
      role = 'assistant';
      text = line.replace(/^.*?(AGENT:|ASSISTANT:|🤖)\s*/, '');
    } else if (line.includes('THINK:') || line.includes('💭')) {
      role = 'thinking';
      text = line.replace(/^.*?(THINK:|💭)\s*/, '');
    } else if (line.includes('TOOL:') || line.includes('🔧')) {
      role = 'tool';
      text = line.replace(/^.*?(TOOL:|🔧)\s*/, '');
    } else if (line.includes('✅') || line.includes('DONE:')) {
      role = 'tool_done';
      text = line.replace(/^.*?(DONE:|✅)\s*/, '');
    } else if (line.includes('📊') || line.includes('SUMMARY:')) {
      role = 'summary';
      text = line.replace(/^.*?(SUMMARY:|📊)\s*/, '');
    }

    // Extract timestamp if present
    const timeMatch = line.match(/\[(\d{2}:\d{2}:\d{2})\]|\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]/);
    const time = timeMatch ? (timeMatch[1] || timeMatch[2]) : undefined;

    return { role, text: text.trim(), time };
  });

  res.json({ chat, name });
});

// NEW: Tmux output capture endpoint
app.get('/api/sessions/:name/tmux-output', (req, res) => {
  const name = req.params.name;

  // Load session JSON to get tmux_session field
  let sessionData = null;
  SESSION_DIRS.forEach(dir => {
    const p = path.join(dir, name + '.json');
    if (fs.existsSync(p)) {
      try {
        sessionData = JSON.parse(fs.readFileSync(p, 'utf-8'));
      } catch (e) {}
    }
  });

  if (!sessionData || !sessionData.tmux_session) {
    return res.json({ output: '', error: 'No tmux session registered', name });
  }

  // Execute tmux capture-pane
  exec(`tmux capture-pane -t ${sessionData.tmux_session} -p -S -100`, (error, stdout) => {
    if (error) {
      return res.json({ output: '', error: error.message, name, session: sessionData.tmux_session });
    }
    res.json({ output: stdout, name, session: sessionData.tmux_session });
  });
});

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  const mimeHeaders = {
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filepath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filepath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html');
      }
    }
  };
  // Serve at root AND under /agent-dashboard/ prefix (Vite base path)
  app.use(express.static(distPath, mimeHeaders));
  app.use('/agent-dashboard', express.static(distPath, mimeHeaders));
  // SPA fallback: serve index.html for all non-API routes (React Router support)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      next();
    }
  });
}

app.listen(PORT, () => console.log(`Agent Dashboard: http://localhost:${PORT}`));
