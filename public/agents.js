const API_BASE = '';
const SESSION_POLL_MS = 3000;

const sessionList = document.getElementById('session-list');
const sessionLog = document.getElementById('session-log');
const selectedSession = document.getElementById('selected-session');
const connectionStatus = document.getElementById('connection-status');
const agentCount = document.getElementById('agent-count');

let sessions = [];
let selected = null;

function formatElapsed(startedAt) {
  const start = Date.parse(startedAt || '') || Date.now();
  const diff = Date.now() - start;
  const minutes = Math.max(0, Math.floor(diff / 60000));
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function statusLabel(status) {
  if (status === 'done') return 'Done';
  if (status === 'failed') return 'Failed';
  return 'Active';
}

function renderSessions() {
  sessionList.innerHTML = '';
  sessions.forEach((session) => {
    const card = document.createElement('div');
    card.className = `session-card ${session.status}` + (selected && selected.name === session.name ? ' selected' : '');

    const header = document.createElement('div');
    header.className = 'session-header';

    const name = document.createElement('div');
    name.className = 'session-name';
    name.textContent = session.name;

    const status = document.createElement('div');
    status.className = `session-status ${session.status}`;
    status.textContent = statusLabel(session.status);

    header.appendChild(name);
    header.appendChild(status);

    const meta = document.createElement('div');
    meta.className = 'session-meta';
    const typeLabel = session.type ? session.type.toUpperCase() : 'AGENT';
    meta.textContent = `${typeLabel} · ${session.project || 'unknown'} · ${formatElapsed(session.startedAt)}`;

    const output = document.createElement('div');
    output.className = 'session-output';
    output.textContent = session.lastOutput || '';

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(output);

    card.addEventListener('click', () => {
      selected = session;
      renderSessions();
      fetchSessionLog(session.name);
    });

    sessionList.appendChild(card);
  });

  agentCount.textContent = `${sessions.length} Agents`;
  if (window.updateAgents) {
    window.updateAgents(sessions);
  }
}

async function fetchSessions() {
  try {
    const res = await fetch(`${API_BASE}/api/sessions`);
    const data = await res.json();
    sessions = Array.isArray(data) ? data : [];
    connectionStatus.textContent = 'Verbunden';
    renderSessions();
  } catch (err) {
    connectionStatus.textContent = 'Offline';
  }
}

async function fetchSessionLog(name) {
  if (!name) return;
  try {
    const res = await fetch(`${API_BASE}/api/sessions/${encodeURIComponent(name)}/log`);
    const data = await res.json();
    selectedSession.textContent = name;
    sessionLog.textContent = (data.lines || []).join('\n');
  } catch (err) {
    sessionLog.textContent = 'Fehler beim Laden der Logs.';
  }
}

fetchSessions();
setInterval(fetchSessions, SESSION_POLL_MS);
