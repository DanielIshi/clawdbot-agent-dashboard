const sessionListEl = document.getElementById('session-list');
const sessionLogEl = document.getElementById('session-log');
const agentCountEl = document.getElementById('agent-count');
const connectionStatusEl = document.getElementById('connection-status');
const sceneCanvas = document.getElementById('scene-canvas');
const gameCanvas = document.getElementById('game-canvas');

let sessions = [];
let selectedSession = null;
let lastLogFetch = 0;

function setConnection(connected) {
  if (connected) {
    connectionStatusEl.textContent = 'verbunden';
    connectionStatusEl.classList.add('connected');
    connectionStatusEl.classList.remove('disconnected');
  } else {
    connectionStatusEl.textContent = 'getrennt';
    connectionStatusEl.classList.add('disconnected');
    connectionStatusEl.classList.remove('connected');
  }
}

function formatElapsed(startedAt) {
  if (!startedAt) return 'unknown';
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return 'unknown';
  const diff = Date.now() - start;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hours}h ${rem}m`;
}

function typeLabel(type) {
  if (!type) return 'Agent';
  return type.toUpperCase();
}

function renderSessions() {
  sessionListEl.innerHTML = '';
  sessions.forEach((session) => {
    const card = document.createElement('div');
    card.className = `session-card ${session.status || ''}`;
    if (selectedSession && selectedSession.name === session.name) {
      card.classList.add('selected');
    }

    const header = document.createElement('div');
    header.className = 'session-header';

    const name = document.createElement('div');
    name.className = 'session-name';
    name.textContent = session.name || 'unknown';

    const status = document.createElement('div');
    status.className = `session-status ${session.status || 'active'}`;
    status.textContent = session.status || 'active';

    header.appendChild(name);
    header.appendChild(status);

    const meta = document.createElement('div');
    meta.className = 'session-meta';
    meta.textContent = `${typeLabel(session.type)} · ${session.project || 'unknown'} · ${formatElapsed(session.startedAt)}`;

    const output = document.createElement('div');
    output.className = 'session-output';
    output.textContent = session.lastOutput || '[no output]';

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(output);

    card.addEventListener('click', () => {
      selectedSession = session;
      renderSessions();
      fetchLog(session.name);
    });

    sessionListEl.appendChild(card);
  });
}

async function fetchSessions() {
  try {
    const res = await fetch('/api/sessions');
    if (!res.ok) throw new Error('bad response');
    sessions = await res.json();
    setConnection(true);
  } catch (err) {
    setConnection(false);
    return;
  }

  agentCountEl.textContent = `${sessions.length} Agents`;
  renderSessions();

  if (window.updateAgents) {
    window.updateAgents(sessions);
  }
  if (window.updateAgents2D) {
    window.updateAgents2D(sessions);
  }

  if (selectedSession) {
    const stillThere = sessions.find((s) => s.name === selectedSession.name);
    if (!stillThere) {
      selectedSession = null;
      sessionLogEl.textContent = 'Session nicht mehr aktiv.';
    }
  }
}

async function fetchLog(name) {
  if (!name) return;
  const now = Date.now();
  if (now - lastLogFetch < 800) return;
  lastLogFetch = now;

  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(name)}/log`);
    if (!res.ok) throw new Error('log failed');
    const data = await res.json();
    sessionLogEl.textContent = (data.lines || []).join('\n');
  } catch (err) {
    sessionLogEl.textContent = 'Log konnte nicht geladen werden.';
  }
}

function toggleFallback() {
  const useThree = window.__THREE_OK === true;
  sceneCanvas.style.display = useThree ? 'block' : 'none';
  gameCanvas.style.display = useThree ? 'none' : 'block';
}

setTimeout(toggleFallback, 800);

fetchSessions();
setInterval(fetchSessions, 3000);
