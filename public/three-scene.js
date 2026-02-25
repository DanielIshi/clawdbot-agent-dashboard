const DEFAULT_ORIGIN = { x: 0, y: 0 };
const DEFAULT_BUBBLE_MAX = 120;
const DEFAULT_TYPE_INTERVAL = 26;

export function formatBubbleText(raw, maxChars = DEFAULT_BUBBLE_MAX) {
  const cleaned = (raw || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  if (cleaned.length > maxChars) return `${cleaned.slice(0, maxChars)}…`;
  return cleaned;
}

export function createTypewriterState(fullText, nowMs, intervalMs = DEFAULT_TYPE_INTERVAL) {
  const safeText = fullText || '';
  return {
    fullText: safeText,
    typedLength: safeText ? 0 : 0,
    lastTick: Number.isFinite(nowMs) ? nowMs : 0,
    intervalMs,
    done: safeText.length === 0
  };
}

export function stepTypewriter(state, nowMs) {
  if (!state || state.done || !state.fullText) return state;
  const now = Number.isFinite(nowMs) ? nowMs : state.lastTick;
  const elapsed = Math.max(0, now - state.lastTick);
  const steps = Math.floor(elapsed / state.intervalMs);
  if (steps <= 0) return state;
  const nextLength = Math.min(state.fullText.length, state.typedLength + steps);
  return {
    ...state,
    typedLength: nextLength,
    lastTick: state.lastTick + steps * state.intervalMs,
    done: nextLength >= state.fullText.length
  };
}

export function getTypedText(state) {
  if (!state || !state.fullText) return '';
  return state.fullText.slice(0, state.typedLength);
}

export function cartesianToIsometric(x, y, tileSize, originX = DEFAULT_ORIGIN.x, originY = DEFAULT_ORIGIN.y) {
  const halfW = tileSize / 2;
  const halfH = tileSize / 4;
  return {
    isoX: (x - y) * halfW + originX,
    isoY: (x + y) * halfH + originY
  };
}

export function isometricToCartesian(isoX, isoY, tileSize, originX = DEFAULT_ORIGIN.x, originY = DEFAULT_ORIGIN.y) {
  const halfW = tileSize / 2;
  const halfH = tileSize / 4;
  const localX = isoX - originX;
  const localY = isoY - originY;
  const x = (localX / halfW + localY / halfH) / 2;
  const y = (localY / halfH - localX / halfW) / 2;
  return { x, y };
}

export function createIsometricGrid({ columns, rows, tileSize, originX = DEFAULT_ORIGIN.x, originY = DEFAULT_ORIGIN.y }) {
  const tiles = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const iso = cartesianToIsometric(x, y, tileSize, originX, originY);
      tiles.push({ x, y, isoX: iso.isoX, isoY: iso.isoY });
    }
  }
  return tiles;
}

export function getIsometricGridBounds({ columns, rows, tileSize, originX = DEFAULT_ORIGIN.x, originY = DEFAULT_ORIGIN.y }) {
  const halfW = tileSize / 2;
  const halfH = tileSize / 4;
  const minIsoX = (0 - (rows - 1)) * halfW + originX;
  const maxIsoX = ((columns - 1) - 0) * halfW + originX;
  const minIsoY = 0 * halfH + originY;
  const maxIsoY = (columns - 1 + rows - 1) * halfH + originY;

  const minX = minIsoX - halfW;
  const maxX = maxIsoX + halfW;
  const minY = minIsoY - halfH;
  const maxY = maxIsoY + halfH;

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function getIsometricTilePolygon(x, y, tileSize, originX = DEFAULT_ORIGIN.x, originY = DEFAULT_ORIGIN.y) {
  const halfW = tileSize / 2;
  const halfH = tileSize / 4;
  const { isoX, isoY } = cartesianToIsometric(x, y, tileSize, originX, originY);
  return [
    { x: isoX, y: isoY - halfH },
    { x: isoX + halfW, y: isoY },
    { x: isoX, y: isoY + halfH },
    { x: isoX - halfW, y: isoY }
  ];
}

const IS_TEST = typeof globalThis !== 'undefined' && globalThis.__SETTLERS_TEST__;
const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';

if (IS_BROWSER && !IS_TEST) {
  initThreeScene();
}

async function initThreeScene() {
  const THREE = await import('https://unpkg.com/three@0.160.0/build/three.module.js');
  const { OrbitControls } = await import('https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js');

  const canvas = document.getElementById('scene-canvas');
  const speechLayer = document.getElementById('speech-layer');
  if (!canvas || !speechLayer) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    console.warn('WebGL unavailable, fallback to 2D canvas', err);
  }

  if (!renderer) {
    window.__THREE_OK = false;
  } else {
    window.__THREE_OK = true;
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0e14, 28, 120);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(16, 18, 20);

  const controls = renderer
    ? new OrbitControls(camera, renderer.domElement)
    : { update: () => {} };
  if (controls) {
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.minDistance = 10;
    controls.maxDistance = 60;
    controls.target.set(8, 0, 8);
  }

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

  const TILE_SIZE = 1.6;
  const GRID = 12;
  const heightMap = new Map();

  function heightAt(x, z) {
    const key = `${x}:${z}`;
    if (heightMap.has(key)) return heightMap.get(key);
    const h =
      (Math.sin(x * 0.6) + Math.cos(z * 0.5)) * 0.35 +
      Math.sin((x + z) * 0.3) * 0.2;
    heightMap.set(key, h);
    return h;
  }

  const groundGroup = new THREE.Group();
  scene.add(groundGroup);

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
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x2a3f4f,
    transparent: true,
    opacity: 0.6
  });
  const water = new THREE.Mesh(waterGeom, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(GRID * TILE_SIZE * 0.45, 0.08, GRID * TILE_SIZE * 0.45);
  water.receiveShadow = true;
  scene.add(water);

  const projectBuildings = new Map();
  const buildingSlots = [
    { x: TILE_SIZE * 2.2, z: TILE_SIZE * 2.2 },
    { x: TILE_SIZE * 7.8, z: TILE_SIZE * 2.4 },
    { x: TILE_SIZE * 3.2, z: TILE_SIZE * 7.4 },
    { x: TILE_SIZE * 8.4, z: TILE_SIZE * 7.2 },
    { x: TILE_SIZE * 5.5, z: TILE_SIZE * 10.2 },
    { x: TILE_SIZE * 10.2, z: TILE_SIZE * 5.6 }
  ];

  const projectColors = [0xd28b53, 0x9f6b44, 0x8c5d3b, 0xb57e4d, 0x6f4f2a];

  function addProjectBuilding(project, slot) {
    if (projectBuildings.has(project)) return projectBuildings.get(project);
    const color = projectColors[projectBuildings.size % projectColors.length];

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(TILE_SIZE * 1.6, 1.4, TILE_SIZE * 1.6),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
    );
    base.position.set(slot.x, 0.9, slot.z);
    base.castShadow = true;
    base.receiveShadow = true;

    const mid = new THREE.Mesh(
      new THREE.BoxGeometry(TILE_SIZE * 1.1, 0.9, TILE_SIZE * 1.1),
      new THREE.MeshStandardMaterial({ color: 0x5c3f28, roughness: 0.8 })
    );
    mid.position.set(slot.x, 1.8, slot.z);
    mid.castShadow = true;

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(TILE_SIZE * 0.9, 1.2, 4),
      new THREE.MeshStandardMaterial({ color: 0x3b2a1a, roughness: 0.9 })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.set(slot.x, 2.6, slot.z);
    roof.castShadow = true;

    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(TILE_SIZE * 1.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xf2d29b, transparent: true, opacity: 0.9 })
    );
    banner.position.set(slot.x, 1.3, slot.z + TILE_SIZE * 0.82);
    banner.rotation.x = -0.05;

    const group = new THREE.Group();
    group.add(base, mid, roof, banner);
    scene.add(group);
    const entry = { group, slot, banner };
    projectBuildings.set(project, entry);
    return entry;
  }

  const AGENT_STYLES = {
    claude: { shirt: '#36c37c', accent: '#e3f9ef' },
    codex: { shirt: '#4b8bff', accent: '#dbe7ff' },
    gpt: { shirt: '#5da0ff', accent: '#e0ecff' },
    ollama: { shirt: '#9ca3af', accent: '#f3f4f6' }
  };

  const DEFAULT_STYLE = AGENT_STYLES.claude;
  const agentsGroup = new THREE.Group();
  scene.add(agentsGroup);

  const bubbleMap = new Map();
  const agentSprites = new Map();
  const typingState = new Map();

  function createAgentSprite(type) {
    const style = AGENT_STYLES[type] || DEFAULT_STYLE;
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

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(8, 52, 48, 6);

    ctx.fillStyle = style.accent;
    ctx.fillRect(16, 52, 32, 6);

    const texture = new THREE.CanvasTexture(spriteCanvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.2, 1.2, 1);
    return sprite;
  }

  function ensureBubble(agent) {
    let bubble = bubbleMap.get(agent.name);
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'speech-bubble';
      bubble.innerHTML = '<div class="speaker"></div><div class="text"></div>';
      speechLayer.appendChild(bubble);
      bubbleMap.set(agent.name, bubble);
    }
    return bubble;
  }

  function updateBubbleContent(agent) {
    const text = formatBubbleText(agent.lastOutput);
    const bubble = ensureBubble(agent);
    const speaker = bubble.querySelector('.speaker');
    const textEl = bubble.querySelector('.text');
    speaker.textContent = agent.name || 'agent';
    const now = (globalThis.performance && performance.now())
      ? performance.now()
      : Date.now();
    const currentState = typingState.get(agent.name);
    if (!currentState || currentState.fullText !== text) {
      typingState.set(agent.name, createTypewriterState(text, now));
    }
    const nextState = typingState.get(agent.name);
    const typed = getTypedText(nextState);
    textEl.textContent = typed || (agent.status === 'active' ? '[RUN]' : '');
    bubble.classList.toggle('active', Boolean(text || agent.status === 'active'));
  }

  function updateAgents(sessions) {
    agentsGroup.clear();
    agentSprites.clear();

    const projects = Array.from(new Set(sessions.map(s => s.project).filter(Boolean)));
    projects.forEach((project, idx) => {
      addProjectBuilding(project, buildingSlots[idx % buildingSlots.length]);
    });

    sessions.forEach((agent, idx) => {
      const type = agent.type || 'claude';
      const sprite = createAgentSprite(type);
      const project = agent.project;
      const slot = projectBuildings.get(project);
      const baseX = slot ? slot.slot.x : TILE_SIZE * 6;
      const baseZ = slot ? slot.slot.z : TILE_SIZE * 6;
      const offsetX = ((idx % 3) - 1) * 0.9;
      const offsetZ = ((idx % 2) - 0.5) * 1.1;

      sprite.position.set(baseX + offsetX, 1.6, baseZ + offsetZ);

      agentsGroup.add(sprite);
      agentSprites.set(agent.name, sprite);
      updateBubbleContent(agent);
    });

    const activeNames = new Set(sessions.map(s => s.name));
    for (const [name, bubble] of bubbleMap.entries()) {
      if (!activeNames.has(name)) {
        bubble.remove();
        bubbleMap.delete(name);
        typingState.delete(name);
      }
    }

    window.__AGENT_COUNT = sessions.length;
  }

  window.updateAgents = updateAgents;

  function resize() {
    if (!renderer) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);
  resize();

  function updateBubblePositions() {
    if (!renderer) return;
    const rect = renderer.domElement.getBoundingClientRect();
    agentSprites.forEach((sprite, name) => {
      const bubble = bubbleMap.get(name);
      if (!bubble) return;
      if (!bubble.classList.contains('active')) return;

      const position = sprite.position.clone();
      position.y += 1.3;
      position.project(camera);

      const x = (position.x * 0.5 + 0.5) * rect.width;
      const y = (-position.y * 0.5 + 0.5) * rect.height;
      bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, -90%)`;
    });
  }

  function updateBubbleTyping(nowMs) {
    typingState.forEach((state, name) => {
      if (!state.fullText) return;
      const next = stepTypewriter(state, nowMs);
      if (next !== state) {
        typingState.set(name, next);
        const bubble = bubbleMap.get(name);
        if (!bubble) return;
        const textEl = bubble.querySelector('.text');
        if (!textEl) return;
        textEl.textContent = getTypedText(next);
      }
    });
  }

  function animate() {
    if (controls.update) controls.update();
    if (renderer) renderer.render(scene, camera);
    updateBubbleTyping((globalThis.performance && performance.now())
      ? performance.now()
      : Date.now());
    updateBubblePositions();
    requestAnimationFrame(animate);
  }

  animate();
}
