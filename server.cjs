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
  SESSION_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(file => {
        try {
          const d = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
          all.push({ name: d.name||file.replace('.json',''), type: dir.includes('codex')?'codex':'claude', status: d.status||'active', project: d.project||'unknown', prompt: d.prompt||'' });
        } catch {}
      });
    }
  });
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

const distPath = __dirname;
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
  app.get('/', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, () => console.log(`Agent Dashboard: http://localhost:${PORT}`));
