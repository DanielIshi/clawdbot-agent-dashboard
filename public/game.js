// Canvas 2D fallback: Isometric grid renderer
const gameCanvas = document.getElementById('game-canvas');
const ctx = gameCanvas.getContext('2d');

const GRID = 16;
const TILE = 28;
const HEIGHT = 10;

const AGENT_COLORS = {
  claude: '#36c37c',
  codex: '#4b8bff',
  gpt: '#79a8ff',
  ollama: '#9ca3af'
};

const projectBuildings = new Map();
const buildingSlots = [
  { x: 3, y: 3 },
  { x: 10, y: 3 },
  { x: 5, y: 9 },
  { x: 11, y: 10 },
  { x: 7, y: 13 },
  { x: 13, y: 7 }
];

let agents = [];
let lastFrame = performance.now();
const speechStates = new Map();

function resize() {
  const rect = gameCanvas.getBoundingClientRect();
  gameCanvas.width = rect.width * (window.devicePixelRatio || 1);
  gameCanvas.height = rect.height * (window.devicePixelRatio || 1);
  ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
}

window.addEventListener('resize', resize);
resize();

function heightAt(x, y) {
  return (
    Math.sin(x * 0.7) * 0.6 +
    Math.cos(y * 0.5) * 0.5 +
    Math.sin((x + y) * 0.35) * 0.4
  );
}

function isoToScreen(x, y, z = 0) {
  const centerX = gameCanvas.width / (window.devicePixelRatio || 1) / 2;
  const centerY = gameCanvas.height / (window.devicePixelRatio || 1) / 2 + 40;
  const sx = (x - y) * (TILE / 2);
  const sy = (x + y) * (TILE / 4) - z;
  return { x: sx + centerX, y: sy + centerY };
}

function drawTile(x, y) {
  const h = heightAt(x, y);
  const z = h * HEIGHT;
  const { x: sx, y: sy } = isoToScreen(x, y, z);

  const shade = h > 0 ? '#496f44' : '#6f553c';
  const highlight = h > 0 ? '#5f8f55' : '#836347';
  const shadow = h > 0 ? '#3a5a35' : '#5a4431';

  ctx.beginPath();
  ctx.moveTo(sx, sy - TILE / 4);
  ctx.lineTo(sx + TILE / 2, sy);
  ctx.lineTo(sx, sy + TILE / 4);
  ctx.lineTo(sx - TILE / 2, sy);
  ctx.closePath();
  ctx.fillStyle = shade;
  ctx.fill();

  ctx.strokeStyle = shadow;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(sx, sy - TILE / 4);
  ctx.lineTo(sx + TILE / 2, sy);
  ctx.lineTo(sx, sy + TILE / 4);
  ctx.lineTo(sx - TILE / 2, sy);
  ctx.closePath();
  ctx.strokeStyle = highlight;
  ctx.globalAlpha = 0.25;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawIsoBox(x, y, w, d, h, color) {
  const base = isoToScreen(x, y, 0);
  const top = isoToScreen(x, y, h);
  const right = isoToScreen(x + w, y, h);
  const left = isoToScreen(x, y + d, h);
  const far = isoToScreen(x + w, y + d, h);

  ctx.fillStyle = shadeColor(color, -12);
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(right.x, right.y + h / 2);
  ctx.lineTo(far.x, far.y + h / 2);
  ctx.lineTo(left.x, left.y + h / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = shadeColor(color, 8);
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(far.x, far.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#0a0e14';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawBuilding(slot, project, index) {
  const color = ['#d28b53', '#9f6b44', '#8c5d3b', '#b57e4d', '#6f4f2a'][index % 5];
  const baseX = slot.x;
  const baseY = slot.y;

  drawIsoBox(baseX, baseY, 1.2, 1.2, 18, color);
  drawIsoBox(baseX + 0.2, baseY + 0.2, 0.8, 0.8, 10, '#5c3f28');

  const label = isoToScreen(baseX + 0.6, baseY + 0.2, 26);
  ctx.font = '10px Jost, sans-serif';
  ctx.fillStyle = '#f0e3c1';
  ctx.textAlign = 'center';
  ctx.fillText(project.slice(0, 12), label.x, label.y - 10);
}

function drawAgent(agent, idx) {
  const project = projectBuildings.get(agent.project);
  const base = project ? project.slot : { x: 7, y: 7 };
  const offsetX = ((idx % 3) - 1) * 0.6;
  const offsetY = ((idx % 2) - 0.5) * 0.8;
  const pos = isoToScreen(base.x + offsetX, base.y + offsetY, 12);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y + 12, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const color = AGENT_COLORS[agent.type] || AGENT_COLORS.claude;
  ctx.fillStyle = color;
  ctx.fillRect(pos.x - 5, pos.y - 16, 10, 12);
  ctx.fillRect(pos.x - 4, pos.y - 24, 8, 6);
  ctx.fillStyle = '#f4e2c6';
  ctx.fillRect(pos.x - 2, pos.y - 21, 4, 3);

  ctx.fillStyle = '#121212';
  ctx.fillRect(pos.x - 3, pos.y - 4, 2, 6);
  ctx.fillRect(pos.x + 1, pos.y - 4, 2, 6);

  const speech = updateSpeechState(agent);
  if (speech) drawSpeechBubble(speech.display, pos.x, pos.y - 28);
}

function updateSpeechState(agent) {
  const text = (agent.lastOutput || '').trim();
  if (!text) return null;
  const prev = speechStates.get(agent.name) || {
    text: '',
    display: '',
    index: 0,
    lastTick: performance.now()
  };

  if (prev.text !== text) {
    prev.text = text;
    prev.display = '';
    prev.index = 0;
  }

  const now = performance.now();
  if (now - prev.lastTick > 24 && prev.index < text.length) {
    prev.display += text[prev.index];
    prev.index += 1;
    prev.lastTick = now;
  }

  speechStates.set(agent.name, prev);
  return prev;
}

function drawSpeechBubble(text, x, y) {
  const max = 44;
  const short = text.length > max ? `${text.slice(0, max)}…` : text;
  ctx.font = '10px Jost, sans-serif';
  const width = ctx.measureText(short).width + 16;
  const height = 20;

  ctx.fillStyle = 'rgba(10, 12, 15, 0.85)';
  ctx.strokeStyle = '#3b2f1e';
  roundRect(x - width / 2, y - height, width, height, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f4e2c6';
  ctx.textAlign = 'center';
  ctx.fillText(short, x, y - 6);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shadeColor(color, percent) {
  const num = parseInt(color.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const r = (num >> 16) + amt;
  const g = ((num >> 8) & 0x00ff) + amt;
  const b = (num & 0x0000ff) + amt;
  return (
    '#' +
    (0x1000000 +
      (r < 255 ? (r < 0 ? 0 : r) : 255) * 0x10000 +
      (g < 255 ? (g < 0 ? 0 : g) : 255) * 0x100 +
      (b < 255 ? (b < 0 ? 0 : b) : 255))
      .toString(16)
      .slice(1)
  );
}

function updateAgents(nextAgents) {
  agents = Array.isArray(nextAgents) ? nextAgents : [];
  const projects = Array.from(new Set(agents.map(a => a.project).filter(Boolean)));
  projects.forEach((project, idx) => {
    if (projectBuildings.has(project)) return;
    const slot = buildingSlots[idx % buildingSlots.length];
    projectBuildings.set(project, { slot, project });
  });
}

function render() {
  const now = performance.now();
  const delta = now - lastFrame;
  lastFrame = now;
  ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

  for (let x = 0; x < GRID; x += 1) {
    for (let y = 0; y < GRID; y += 1) {
      drawTile(x, y);
    }
  }

  projectBuildings.forEach((entry, idx) => {
    drawBuilding(entry.slot, entry.project, idx);
  });

  const sorted = agents.slice().sort((a, b) => {
    const pa = projectBuildings.get(a.project) || { slot: { x: 0, y: 0 } };
    const pb = projectBuildings.get(b.project) || { slot: { x: 0, y: 0 } };
    return pa.slot.y - pb.slot.y;
  });

  sorted.forEach(drawAgent);

  requestAnimationFrame(render);
}

render();

window.updateAgents2D = updateAgents;
if (!window.updateAgents) window.updateAgents = updateAgents;
