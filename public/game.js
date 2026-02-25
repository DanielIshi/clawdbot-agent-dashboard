import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('scene-canvas');
const indicatorLayer = document.getElementById('agent-indicators');
const speechLayer = document.getElementById('speech-layer');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a0e14, 35, 120);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
camera.position.set(16, 18, 20);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 10;
controls.maxDistance = 55;
controls.target.set(8, 0, 8);

const ambient = new THREE.AmbientLight(0x9aa38b, 0.7);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xf6e1b0, 1.2);
sun.position.set(20, 30, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 80;
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x7aa0b8, 0.45);
fill.position.set(-15, 12, -10);
scene.add(fill);

const groundGroup = new THREE.Group();
scene.add(groundGroup);

const TILE_SIZE = 1.6;
const GRID = 12;
const heightMap = new Map();

function heightAt(x, z) {
  const key = `${x}:${z}`;
  if (heightMap.has(key)) return heightMap.get(key);
  const h = (Math.sin(x * 0.6) + Math.cos(z * 0.5)) * 0.35 + Math.sin((x + z) * 0.3) * 0.2;
  heightMap.set(key, h);
  return h;
}

function makeTile(x, z) {
  const h = heightAt(x, z);
  const isGrass = h > 0.05;
  const color = isGrass ? 0x4a7c4c : 0x7d5a3b;
  const geom = new THREE.BoxGeometry(TILE_SIZE, 0.6 + h, TILE_SIZE);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(x * TILE_SIZE, 0.3 + h / 2, z * TILE_SIZE);
  mesh.receiveShadow = true;
  return mesh;
}

for (let x = 0; x < GRID; x += 1) {
  for (let z = 0; z < GRID; z += 1) {
    groundGroup.add(makeTile(x, z));
  }
}

const waterGeom = new THREE.PlaneGeometry(GRID * TILE_SIZE * 1.2, GRID * TILE_SIZE * 1.2);
const waterMat = new THREE.MeshStandardMaterial({ color: 0x2a3f4f, transparent: true, opacity: 0.6 });
const water = new THREE.Mesh(waterGeom, waterMat);
water.rotation.x = -Math.PI / 2;
water.position.set(GRID * TILE_SIZE * 0.45, 0.08, GRID * TILE_SIZE * 0.45);
water.receiveShadow = true;
scene.add(water);

const projectColors = [0xd28b53, 0x9f6b44, 0x8c5d3b, 0xb57e4d, 0x6f4f2a];
const projectBuildings = new Map();

const buildingSlots = [
  { x: TILE_SIZE * 2.2, z: TILE_SIZE * 2.2 },
  { x: TILE_SIZE * 7.8, z: TILE_SIZE * 2.4 },
  { x: TILE_SIZE * 3.2, z: TILE_SIZE * 7.4 },
  { x: TILE_SIZE * 8.4, z: TILE_SIZE * 7.2 },
  { x: TILE_SIZE * 5.5, z: TILE_SIZE * 10.2 }
];

const STATUS_COLORS = {
  active: 0x7fe5b3,
  done: 0x8bb6ff,
  failed: 0xe8846b,
  idle: 0xf2d29b
};

function mixColors(base, tint, ratio) {
  const b = new THREE.Color(base);
  const t = new THREE.Color(tint);
  return b.lerp(t, ratio).getHex();
}

function addProjectBuilding(projectState, slot) {
  if (projectBuildings.has(projectState.project)) return projectBuildings.get(projectState.project);
  const color = projectColors[projectBuildings.size % projectColors.length];

  const baseMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE * 1.6, 1.4, TILE_SIZE * 1.6), baseMat);
  base.position.set(slot.x, 0.9, slot.z);
  base.castShadow = true;
  base.receiveShadow = true;

  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5c3f28, roughness: 0.9 });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(TILE_SIZE * 0.9, 1.2, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(slot.x, 2.1, slot.z);
  roof.castShadow = true;

  const bannerMat = new THREE.MeshStandardMaterial({ color: 0xf2d29b, transparent: true, opacity: 0.9 });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(TILE_SIZE * 1.4, 0.4), bannerMat);
  banner.position.set(slot.x, 1.4, slot.z + TILE_SIZE * 0.82);
  banner.rotation.x = -0.05;
  banner.castShadow = false;

  const flagGroup = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.7 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8), poleMat);
  pole.position.set(slot.x + TILE_SIZE * 0.8, 1.6, slot.z - TILE_SIZE * 0.6);
  pole.castShadow = true;
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xf2d29b, transparent: true, opacity: 0.9 });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), flagMat);
  flag.position.set(slot.x + TILE_SIZE * 1.2, 2.2, slot.z - TILE_SIZE * 0.6);
  flag.rotation.y = Math.PI / 8;
  flagGroup.add(pole, flag);
  flagGroup.visible = false;

  const scaffoldGroup = new THREE.Group();
  const scaffoldMat = new THREE.MeshStandardMaterial({ color: 0xc5a46b, roughness: 0.8 });
  const postGeom = new THREE.BoxGeometry(0.08, 1.6, 0.08);
  const beamGeom = new THREE.BoxGeometry(1.8, 0.08, 0.08);
  const posts = [
    new THREE.Mesh(postGeom, scaffoldMat),
    new THREE.Mesh(postGeom, scaffoldMat),
    new THREE.Mesh(postGeom, scaffoldMat),
    new THREE.Mesh(postGeom, scaffoldMat)
  ];
  posts[0].position.set(slot.x - 0.9, 1.1, slot.z - 0.9);
  posts[1].position.set(slot.x + 0.9, 1.1, slot.z - 0.9);
  posts[2].position.set(slot.x - 0.9, 1.1, slot.z + 0.9);
  posts[3].position.set(slot.x + 0.9, 1.1, slot.z + 0.9);
  const beamA = new THREE.Mesh(beamGeom, scaffoldMat);
  beamA.position.set(slot.x, 1.8, slot.z - 0.9);
  const beamB = new THREE.Mesh(beamGeom, scaffoldMat);
  beamB.position.set(slot.x, 1.8, slot.z + 0.9);
  const beamC = new THREE.Mesh(beamGeom, scaffoldMat);
  beamC.rotation.y = Math.PI / 2;
  beamC.position.set(slot.x - 0.9, 1.8, slot.z);
  const beamD = new THREE.Mesh(beamGeom, scaffoldMat);
  beamD.rotation.y = Math.PI / 2;
  beamD.position.set(slot.x + 0.9, 1.8, slot.z);
  scaffoldGroup.add(...posts, beamA, beamB, beamC, beamD);
  scaffoldGroup.visible = false;

  const group = new THREE.Group();
  group.add(base, roof, banner, flagGroup, scaffoldGroup);
  scene.add(group);

  const entry = {
    group,
    baseMat,
    roofMat,
    bannerMat,
    flagGroup,
    flagMat,
    scaffoldGroup,
    color,
    slot
  };

  projectBuildings.set(projectState.project, entry);
  updateProjectBuilding(entry, projectState);
  return entry;
}

function updateProjectBuilding(entry, projectState) {
  const statusColor = STATUS_COLORS[projectState.status] || STATUS_COLORS.idle;
  const baseColor = mixColors(entry.color, statusColor, 0.35);
  entry.baseMat.color.setHex(baseColor);
  entry.roofMat.color.setHex(mixColors(0x5c3f28, statusColor, 0.15));
  entry.bannerMat.color.setHex(mixColors(0xf2d29b, statusColor, 0.25));
  entry.flagMat.color.setHex(statusColor);

  entry.flagGroup.visible = projectState.hasPr;
  entry.scaffoldGroup.visible = projectState.hasIssue;
}

function extractProjectKey(value) {
  if (!value) return 'unknown';
  const cleaned = String(value).trim();
  if (!cleaned) return 'unknown';
  return cleaned.toLowerCase().replace(/\s+/g, '-');
}

function summarizeProjects(sessions) {
  const summary = new Map();
  sessions.forEach((agent) => {
    const project = extractProjectKey(agent.project || agent.name || 'unknown');
    const text = `${agent.name || ''} ${agent.project || ''} ${agent.lastOutput || ''} ${agent.tool || ''}`.toLowerCase();
    const status = agent.status || 'active';
    const hasIssue = /issue|#\d+/.test(text);
    const hasPr = /\bpr\b|pull request/.test(text);

    if (!summary.has(project)) {
      summary.set(project, {
        project,
        status: status,
        hasIssue,
        hasPr
      });
    } else {
      const state = summary.get(project);
      if (status === 'failed') state.status = 'failed';
      else if (status === 'active' && state.status !== 'failed') state.status = 'active';
      else if (status === 'done' && state.status !== 'failed' && state.status !== 'active') state.status = 'done';
      state.hasIssue = state.hasIssue || hasIssue;
      state.hasPr = state.hasPr || hasPr;
    }
  });
  return summary;
}

const AGENT_STYLES = {
  claude: { shirt: '#22c55e', logo: '#dcfce7', logoType: 'leaf' },
  codex: { shirt: '#3b82f6', logo: '#dbeafe', logoType: 'brackets' },
  jules: { shirt: '#f59e0b', logo: '#fef3c7', logoType: 'circle' },
  gpt: { shirt: '#60a5fa', logo: '#e0f2fe', logoType: 'spark' },
  ollama: { shirt: '#9ca3af', logo: '#f3f4f6', logoType: 'dot' }
};

const DEFAULT_AGENT_STYLE = AGENT_STYLES.claude;

const agentsGroup = new THREE.Group();
scene.add(agentsGroup);

const indicatorMap = new Map();
const bubbleMap = new Map();
const speechStates = new Map();
let agentByName = new Map();
let agentSprites = new Map();

const WAITING_THRESHOLD_MS = 90000;
const SPEECH_MAX_CHARS = 48;
const TYPE_INTERVAL_MS = 22;
const SCROLL_INTERVAL_MS = 120;

function getActivityType(agent) {
  if (agent.status !== 'active') return null;
  const now = Date.now();
  const lastActivity = Date.parse(agent.lastActivity || '') || now;
  if (now - lastActivity > WAITING_THRESHOLD_MS) return 'running';

  const text = `${agent.tool || ''} ${agent.lastOutput || ''}`.toLowerCase();
  if (/(build|compile|bundle|deploy)/.test(text)) return 'hammer';
  if (/(test|pytest|runner|processing|indexing|train|install|execute|benchmark)/.test(text)) return 'loading';
  if (/(wait|idle|sleep|blocked)/.test(text)) return 'running';
  if (/(code|coding|edit|fix|refactor|implement|write)/.test(text)) return 'typing';
  if ((agent.tool || '').toLowerCase().includes('runner')) return 'loading';
  return 'typing';
}

function indicatorSvg(activity) {
  if (activity === 'hammer') {
    return `
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="5" y="7" width="14" height="6" rx="1.5" fill="#f59e0b" />
        <rect x="16" y="10" width="4" height="14" rx="1.5" fill="#cbd5f5" />
        <rect x="13" y="20" width="6" height="8" rx="1.5" fill="#a78bfa" />
      </svg>
    `;
  }
  if (activity === 'typing') {
    return `
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle class="typing-dot" cx="8" cy="16" r="3" fill="#e2e8f0" />
        <circle class="typing-dot" cx="16" cy="16" r="3" fill="#e2e8f0" />
        <circle class="typing-dot" cx="24" cy="16" r="3" fill="#e2e8f0" />
      </svg>
    `;
  }
  if (activity === 'running') {
    return `
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="12" cy="9" r="3" fill="#fde68a" />
        <path d="M12 12 L12 20" stroke="#fef3c7" stroke-width="2" stroke-linecap="round" />
        <path d="M12 16 L7 21" stroke="#fef3c7" stroke-width="2" stroke-linecap="round" />
        <path d="M12 16 L19 21" stroke="#fef3c7" stroke-width="2" stroke-linecap="round" />
        <path d="M12 14 L18 15" stroke="#fef3c7" stroke-width="2" stroke-linecap="round" />
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="10" stroke="#7dd3fc" stroke-width="3" stroke-linecap="round" stroke-dasharray="38 14" />
    </svg>
  `;
}

function ensureIndicator(agent) {
  let indicator = indicatorMap.get(agent.name);
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'activity-indicator';
    indicatorLayer.appendChild(indicator);
    indicatorMap.set(agent.name, indicator);
  }

  const activity = getActivityType(agent);
  const current = indicator.dataset.activity || '';
  if (activity && current !== activity) {
    indicator.dataset.activity = activity;
    indicator.innerHTML = indicatorSvg(activity);
  } else if (!activity) {
    indicator.dataset.activity = '';
  }

  indicator.classList.toggle('is-active', Boolean(activity));
}

function updateIndicatorPositions() {
  const rect = renderer.domElement.getBoundingClientRect();
  agentSprites.forEach((sprite, name) => {
    const indicator = indicatorMap.get(name);
    const agent = agentByName.get(name);
    if (!indicator || !agent) return;
    if (!indicator.classList.contains('is-active')) return;

    const position = sprite.position.clone();
    position.y += 1.2;
    position.project(camera);

    const x = (position.x * 0.5 + 0.5) * rect.width;
    const y = (-position.y * 0.5 + 0.5) * rect.height - 16;

    indicator.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  });
}

function ensureSpeechBubble(agent) {
  let bubble = bubbleMap.get(agent.name);
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.innerHTML = '<span class="label"></span><span class="text"></span>';
    speechLayer.appendChild(bubble);
    bubbleMap.set(agent.name, bubble);
  }
  return bubble;
}

function getSpeechText(agent) {
  const text = (agent.lastOutput || '').trim();
  if (text) return text;
  if (agent.status === 'active') return '[RUN]';
  return '';
}

function updateSpeechState(agent, now) {
  const text = getSpeechText(agent);
  if (!text) {
    speechStates.delete(agent.name);
    return null;
  }

  let state = speechStates.get(agent.name);
  if (!state || state.fullText !== text) {
    state = {
      fullText: text,
      display: '',
      index: 0,
      scrollIndex: 0,
      mode: 'typing',
      lastTick: now
    };
    speechStates.set(agent.name, state);
  }

  const maxChars = SPEECH_MAX_CHARS;
  const canType = now - state.lastTick >= TYPE_INTERVAL_MS;
  const canScroll = now - state.lastTick >= SCROLL_INTERVAL_MS;

  if (state.mode === 'typing' && canType) {
    state.index += 1;
    state.lastTick = now;
    state.display = state.fullText.slice(0, Math.min(state.index, maxChars));
    if (state.index >= Math.min(state.fullText.length, maxChars)) {
      if (state.fullText.length > maxChars) {
        state.mode = 'scroll';
      }
    }
  } else if (state.mode === 'scroll' && canScroll) {
    state.scrollIndex = (state.scrollIndex + 1) % (state.fullText.length - maxChars + 1);
    state.display = state.fullText.slice(state.scrollIndex, state.scrollIndex + maxChars);
    state.lastTick = now;
  }

  return state;
}

function updateSpeechPositions() {
  const rect = renderer.domElement.getBoundingClientRect();
  const now = Date.now();
  agentSprites.forEach((sprite, name) => {
    const agent = agentByName.get(name);
    if (!agent) return;
    const bubble = ensureSpeechBubble(agent);
    const speechState = updateSpeechState(agent, now);
    const hasText = speechState && speechState.display;
    bubble.classList.toggle('is-active', Boolean(hasText));
    if (!hasText) return;

    const label = bubble.querySelector('.label');
    const text = bubble.querySelector('.text');
    label.textContent = agent.name || 'Agent';
    text.textContent = speechState.display;

    const position = sprite.position.clone();
    position.y += 2.2;
    position.project(camera);

    const x = (position.x * 0.5 + 0.5) * rect.width;
    const y = (-position.y * 0.5 + 0.5) * rect.height - 36;
    bubble.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  });
}

function drawLogo(ctx, style) {
  ctx.fillStyle = style.logo;
  if (style.logoType === 'brackets') {
    ctx.fillRect(18, 28, 4, 12);
    ctx.fillRect(42, 28, 4, 12);
    ctx.fillRect(18, 28, 10, 4);
    ctx.fillRect(36, 36, 10, 4);
  } else if (style.logoType === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(32, 28);
    ctx.bezierCurveTo(20, 30, 24, 44, 32, 44);
    ctx.bezierCurveTo(40, 44, 44, 30, 32, 28);
    ctx.fill();
  } else if (style.logoType === 'spark') {
    ctx.beginPath();
    ctx.moveTo(32, 26);
    ctx.lineTo(36, 34);
    ctx.lineTo(44, 36);
    ctx.lineTo(36, 38);
    ctx.lineTo(32, 46);
    ctx.lineTo(28, 38);
    ctx.lineTo(20, 36);
    ctx.lineTo(28, 34);
    ctx.closePath();
    ctx.fill();
  } else if (style.logoType === 'circle') {
    ctx.beginPath();
    ctx.arc(32, 36, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (style.logoType === 'dot') {
    ctx.beginPath();
    ctx.arc(32, 36, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function createAgentSprite(type) {
  const style = AGENT_STYLES[type] || DEFAULT_AGENT_STYLE;
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = 64;
  spriteCanvas.height = 64;
  const ctx = spriteCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = style.shirt;
  ctx.fillRect(22, 24, 20, 22);
  ctx.fillRect(24, 14, 16, 10);
  ctx.fillRect(22, 46, 6, 8);
  ctx.fillRect(36, 46, 6, 8);
  ctx.fillStyle = '#f2e7cf';
  ctx.fillRect(30, 18, 4, 4);

  drawLogo(ctx, style);

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(8, 52, 48, 6);

  ctx.fillStyle = '#f2d29b';
  ctx.fillRect(16, 52, 32, 6);

  const texture = new THREE.CanvasTexture(spriteCanvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.2, 1.2, 1);
  return sprite;
}

function updateAgents(sessions) {
  agentsGroup.clear();
  agentByName = new Map();
  agentSprites = new Map();

  const projectSummary = summarizeProjects(sessions);
  Array.from(projectSummary.values()).forEach((projectState, idx) => {
    const building = addProjectBuilding(projectState, buildingSlots[idx % buildingSlots.length]);
    updateProjectBuilding(building, projectState);
  });

  sessions.forEach((agent, idx) => {
    agentByName.set(agent.name, agent);
    const type = agent.type || 'claude';
    const sprite = createAgentSprite(type);
    const projectKey = extractProjectKey(agent.project || agent.name || 'unknown');
    const building = projectBuildings.get(projectKey);
    const baseX = building ? building.slot.x : TILE_SIZE * 6;
    const baseZ = building ? building.slot.z : TILE_SIZE * 6;
    const offsetX = ((idx % 3) - 1) * 0.9;
    const offsetZ = ((idx % 2) - 0.5) * 1.1;

    sprite.position.set(baseX + offsetX, 1.6, baseZ + offsetZ);

    if ((agent.lastOutput || '').includes('[RUN]')) {
      sprite.position.y += Math.sin(Date.now() * 0.004 + idx) * 0.12;
    }

    agentsGroup.add(sprite);
    agentSprites.set(agent.name, sprite);
    ensureIndicator(agent);
  });

  const activeNames = new Set(sessions.map((s) => s.name));
  for (const [name, indicator] of indicatorMap.entries()) {
    if (!activeNames.has(name)) {
      indicator.remove();
      indicatorMap.delete(name);
    }
  }

  for (const [name, bubble] of bubbleMap.entries()) {
    if (!activeNames.has(name)) {
      bubble.remove();
      bubbleMap.delete(name);
      speechStates.delete(name);
    }
  }

  window.__AGENT_COUNT = sessions.length;
}

window.updateAgents = updateAgents;

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

function animate() {
  controls.update();
  renderer.render(scene, camera);
  updateIndicatorPositions();
  updateSpeechPositions();
  requestAnimationFrame(animate);
}

animate();
