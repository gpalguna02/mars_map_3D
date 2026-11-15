/**
 * SOL NAV // Martian Surface Navigation & Planetary GIS Engine
 * Three.js 3D Globe, USGS GIS Layering, Curiosity Traverse Profiler,
 * NASA Worldview Time-Series & Perseverance Ground-Truth Inspector.
 */

// Global State
const state = {
  activeSol: 540,
  activeLs: 268.0,
  ltstHour: 12.0,
  measurementMode: false,
  measurePoints: [],
  waypoints: [],
  selectedMissionPreset: 'curiosity',
  activeBasemap: 'viking',
  viewMode: '3d', // '3d' or '2d'
  layers: {
    geology: true,
    mineralogy: true,
    nomenclature: true,
    groundTruth: true,
    hazards: true
  },
  roverPhotos: [],
  landmarks: [],
  hazards: [],
  timelineData: [],
  safeOptimizationResult: null,
  activeRouteView: 'safe',
  voiceNavEnabled: true,
  chaseCamEnabled: false,
  isNavigating: false,
  navDirections: null,
  navStepIndex: 0,
  navRoverMesh: null
};

// Three.js Globals
let scene, camera, renderer, controls;
let marsGlobe, atmosphereMesh, sunLight, ambientLight, dustCloudMesh;
let raycaster, mouse;
let landmarkPinsGroup, roverPinsGroup, traverseTrackGroup, measureTrackGroup, hazardsGroup;
let isAnimatingCamera = false;
let targetCameraPos = null, targetLookAt = null;

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  initThreeJS();
  initProceduralMarsTexture();
  initFlatMap();
  setupEventListeners();
  loadDatasets();
});

// ==========================================================================
// 1. Three.js Mars Globe Initialization (NASA Mars Trek Paradigm)
// ==========================================================================
function initThreeJS() {
  const container = document.getElementById('webgl-container');
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04070c);

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 0, 16);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 6.2;
  controls.maxDistance = 35.0;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;

  // Directional Sun Light (Simulates Martian Sun & Shadows)
  sunLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
  sunLight.position.set(15, 6, 12);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  scene.add(sunLight);

  // Ambient Space Fill Light
  ambientLight = new THREE.AmbientLight(0x1a2638, 0.45);
  scene.add(ambientLight);

  // Raycaster & Mouse for Interaction
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Object Groups
  landmarkPinsGroup = new THREE.Group();
  roverPinsGroup = new THREE.Group();
  traverseTrackGroup = new THREE.Group();
  measureTrackGroup = new THREE.Group();
  hazardsGroup = new THREE.Group();

  scene.add(landmarkPinsGroup);
  scene.add(roverPinsGroup);
  scene.add(traverseTrackGroup);
  scene.add(measureTrackGroup);
  scene.add(hazardsGroup);

  // Starfield Background
  createStarfield();

  // Resize Handler
  window.addEventListener('resize', onWindowResize);

  // Mouse Move for Coordinates Tracker
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('click', onCanvasClick);

  // Render Loop
  animate();
}

// Procedural Ultra-Realistic Martian Surface Texture Generator
// Supports Viking Color, MOLA Hypsometric DEM, and THEMIS Shaded Relief
const basemapTextures = {};

function createProceduralMarsCanvas(mode = 'viking') {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (mode === 'mola') {
    // MOLA Hypsometric Elevation Rainbow Gradient
    // Deep blues for Hellas (-7km) -> Greens for datum 0m -> Yellows/Reds for Tharsis -> White for Olympus (+21km)
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0.0, '#388e3c'); // North polar low-mid
    grad.addColorStop(0.2, '#1976d2'); // Northern Lowland Basin
    grad.addColorStop(0.5, '#f57c00'); // Equatorial Highlands
    grad.addColorStop(0.8, '#c2185b'); // Southern Cratered Terra
    grad.addColorStop(1.0, '#4a148c'); // South polar rim
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Hellas Planitia Deep Trench (Deep Indigo)
    const hbX = (70 / 360) * canvas.width;
    const hbY = ((90 + 42) / 180) * canvas.height;
    const hbGrad = ctx.createRadialGradient(hbX, hbY, 10, hbX, hbY, 110);
    hbGrad.addColorStop(0, '#020024');
    hbGrad.addColorStop(0.6, '#090979');
    hbGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = hbGrad;
    ctx.beginPath();
    ctx.arc(hbX, hbY, 110, 0, Math.PI * 2);
    ctx.fill();

    // Valles Marineris Canyon (-7km floor)
    const vmX = (280 / 360) * canvas.width;
    const vmY = ((90 + 10) / 180) * canvas.height;
    ctx.strokeStyle = '#05103b';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(vmX - 100, vmY);
    ctx.quadraticCurveTo(vmX, vmY + 15, vmX + 110, vmY + 8);
    ctx.stroke();

    // Olympus Mons Peak (+21.2 km - Pure White & Pink aureole)
    const omX = (226.2 / 360) * canvas.width;
    const omY = ((90 - 18.65) / 180) * canvas.height;
    const omGrad = ctx.createRadialGradient(omX, omY, 2, omX, omY, 80);
    omGrad.addColorStop(0, '#ffffff');
    omGrad.addColorStop(0.25, '#ff4081');
    omGrad.addColorStop(0.6, '#ff9100');
    omGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = omGrad;
    ctx.beginPath();
    ctx.arc(omX, omY, 80, 0, Math.PI * 2);
    ctx.fill();

  } else if (mode === 'themis') {
    // THEMIS Infrared / Grayscale Shaded Relief
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0.0, '#3a3f47');
    grad.addColorStop(0.2, '#505662');
    grad.addColorStop(0.5, '#6a7280');
    grad.addColorStop(0.8, '#464c56');
    grad.addColorStop(1.0, '#2e333a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Micro-crater relief
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() * 45 + 5;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.15)';
      ctx.fill();
    }

    // Olympus Mons Shaded Caldera
    const omX = (226.2 / 360) * canvas.width;
    const omY = ((90 - 18.65) / 180) * canvas.height;
    const omGrad = ctx.createRadialGradient(omX - 10, omY - 10, 5, omX, omY, 75);
    omGrad.addColorStop(0, '#e5e9f0');
    omGrad.addColorStop(0.7, '#2e3440');
    omGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = omGrad;
    ctx.beginPath();
    ctx.arc(omX, omY, 75, 0, Math.PI * 2);
    ctx.fill();

  } else {
    // Viking MDIM 2.1 Natural Albedo
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0.0, '#421f14');
    grad.addColorStop(0.2, '#964827');
    grad.addColorStop(0.5, '#b85a31');
    grad.addColorStop(0.8, '#70331b');
    grad.addColorStop(1.0, '#3a1b12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 400; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() * 60 + 10;
      const darkness = Math.random() * 0.25;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(50, 20, 10, ${darkness})`;
      ctx.fill();
    }

    // Syrtis Major
    const smX = (70 / 360) * canvas.width;
    const smY = ((90 - 10) / 180) * canvas.height;
    const smGrad = ctx.createRadialGradient(smX, smY, 10, smX, smY, 140);
    smGrad.addColorStop(0, 'rgba(40, 22, 16, 0.85)');
    smGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = smGrad;
    ctx.fillRect(smX - 140, smY - 140, 280, 280);

    // Olympus Mons
    const omX = (226.2 / 360) * canvas.width;
    const omY = ((90 - 18.65) / 180) * canvas.height;
    const omGrad = ctx.createRadialGradient(omX, omY, 5, omX, omY, 70);
    omGrad.addColorStop(0, '#f29b68');
    omGrad.addColorStop(0.4, '#d36e3c');
    omGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = omGrad;
    ctx.beginPath();
    ctx.arc(omX, omY, 70, 0, Math.PI * 2);
    ctx.fill();

    // Valles Marineris
    const vmX = (280 / 360) * canvas.width;
    const vmY = ((90 + 10) / 180) * canvas.height;
    ctx.strokeStyle = 'rgba(45, 18, 12, 0.9)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(vmX - 100, vmY);
    ctx.quadraticCurveTo(vmX, vmY + 15, vmX + 110, vmY + 8);
    ctx.stroke();

    // Hellas Basin
    const hbX = (70 / 360) * canvas.width;
    const hbY = ((90 + 42) / 180) * canvas.height;
    const hbGrad = ctx.createRadialGradient(hbX, hbY, 20, hbX, hbY, 95);
    hbGrad.addColorStop(0, '#da8b5c');
    hbGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = hbGrad;
    ctx.beginPath();
    ctx.arc(hbX, hbY, 95, 0, Math.PI * 2);
    ctx.fill();
  }

  // Polar Ice Caps (Present in all modes)
  ctx.fillStyle = mode === 'mola' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(240, 248, 255, 0.92)';
  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, 20, canvas.width / 2, 35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, canvas.height - 18, canvas.width / 2, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function initProceduralMarsTexture() {
  // 1. Initial procedural fallback textures
  basemapTextures.viking = createProceduralMarsCanvas('viking');
  basemapTextures.mola = createProceduralMarsCanvas('mola');
  basemapTextures.themis = createProceduralMarsCanvas('themis');

  // Mars Sphere Mesh (Radius = 5 units)
  const geometry = new THREE.SphereGeometry(5, 64, 64);
  const material = new THREE.MeshStandardMaterial({
    map: basemapTextures.viking,
    roughness: 0.88,
    metalness: 0.12,
    bumpScale: 0.05
  });

  marsGlobe = new THREE.Mesh(geometry, material);
  marsGlobe.receiveShadow = true;
  marsGlobe.castShadow = true;
  scene.add(marsGlobe);

  // 2. Load Authentic 2K NASA Global Map Textures
  const textureLoader = new THREE.TextureLoader();

  // 2A. Viking 2K Color Map
  textureLoader.load('/static/assets/mars_viking_color.jpg', (tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    basemapTextures.viking = tex;
    if (marsGlobe && state.activeBasemap === 'viking') {
      marsGlobe.material.map = tex;
      marsGlobe.material.needsUpdate = true;
    }
  });

  // 2B. MOLA 2K Elevation Rainbow Map
  textureLoader.load('/static/assets/mars_mola_elevation.jpg', (tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    basemapTextures.mola = tex;
    if (marsGlobe && state.activeBasemap === 'mola') {
      marsGlobe.material.map = tex;
      marsGlobe.material.needsUpdate = true;
    }
  });

  // 2C. THEMIS 2K Shaded Relief Map
  textureLoader.load('/static/assets/mars_themis_relief.jpg', (tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    basemapTextures.themis = tex;
    if (marsGlobe && state.activeBasemap === 'themis') {
      marsGlobe.material.map = tex;
      marsGlobe.material.needsUpdate = true;
    }
  });

  // Load 2D raster image elements for Full 2D Flat Map
  flatImages.viking = new Image();
  flatImages.viking.src = '/static/assets/mars_viking_color.jpg';
  flatImages.viking.onload = () => { if (state.viewMode === '2d') renderFlatMap(); };

  flatImages.mola = new Image();
  flatImages.mola.src = '/static/assets/mars_mola_elevation.jpg';

  flatImages.themis = new Image();
  flatImages.themis.src = '/static/assets/mars_themis_relief.jpg';

  // Atmospheric Glow Layer
  const atmoGeom = new THREE.SphereGeometry(5.12, 64, 64);
  const atmoMat = new THREE.MeshBasicMaterial({
    color: 0xff7744,
    transparent: true,
    opacity: 0.12,
    side: THREE.BackSide
  });
  atmosphereMesh = new THREE.Mesh(atmoGeom, atmoMat);
  scene.add(atmosphereMesh);

  // Dust Storm Cloud Layer (Controlled by Worldview Slider)
  const dustGeom = new THREE.SphereGeometry(5.05, 48, 48);
  const dustMat = new THREE.MeshStandardMaterial({
    color: 0xcc8844,
    transparent: true,
    opacity: 0.08,
    roughness: 1.0,
    wireframe: false
  });
  dustCloudMesh = new THREE.Mesh(dustGeom, dustMat);
  scene.add(dustCloudMesh);
}

function createStarfield() {
  const starsGeom = new THREE.BufferGeometry();
  const count = 1800;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 400;
    positions[i + 1] = (Math.random() - 0.5) * 400;
    positions[i + 2] = (Math.random() - 0.5) * 400;
  }

  starsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starsMat = new THREE.PointsMaterial({ color: 0x88aacc, size: 0.8, transparent: true, opacity: 0.7 });
  const starField = new THREE.Points(starsGeom, starsMat);
  scene.add(starField);
}

// Convert Martian Geodetic Coordinates (Lat, Lon) to 3D Cartesian Position on Mars Sphere
function latLonToVector3(lat, lon, radius = 5.02) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

// Reverse: Convert 3D Point on Sphere to Martian (Lat, Lon)
function vector3ToLatLon(v3) {
  const norm = v3.clone().normalize();
  const lat = 90 - Math.acos(norm.y) * (180 / Math.PI);
  let lon = (Math.atan2(norm.z, -norm.x) * (180 / Math.PI)) - 180;
  lon = (lon + 360) % 360;
  return { lat, lon };
}

// ==========================================================================
// Subtle Non-Modal HUD Quick Notice (replaces annoying alert boxes)
// ==========================================================================
function showHudNotice(msg) {
  let noticeEl = document.getElementById('hud-quick-notice');
  if (!noticeEl) {
    noticeEl = document.createElement('div');
    noticeEl.id = 'hud-quick-notice';
    noticeEl.className = 'hud-quick-notice';
    document.body.appendChild(noticeEl);
  }
  noticeEl.textContent = msg;
  noticeEl.classList.add('visible');
  clearTimeout(noticeEl._timer);
  noticeEl._timer = setTimeout(() => {
    noticeEl.classList.remove('visible');
  }, 3200);
}

// ==========================================================================
// 2. Event Listeners & UI Controls
// ==========================================================================
function setupEventListeners() {
  // Preset Target Navigation
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
      const targetBtn = e.target.closest('.btn-preset');
      targetBtn.classList.add('active');
      const target = targetBtn.dataset.preset;
      flyToPreset(target);
    });
  });

  // Basemap Layer Switcher (NASA Mars Trek Layers)
  document.querySelectorAll('.btn-basemap').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-basemap').forEach(b => b.classList.remove('active'));
      const targetBtn = e.target.closest('.btn-basemap');
      const mode = targetBtn.dataset.map;
      // Synchronize all buttons that match this mode
      document.querySelectorAll(`.btn-basemap[data-map="${mode}"]`).forEach(b => b.classList.add('active'));
      switchBasemap(mode);
    });
  });

  // Sidebar Drawers (GIS & Traverse)
  const sidebarGis = document.getElementById('sidebar-gis');
  const sidebarTraverse = document.getElementById('sidebar-traverse');
  const btnToggleTools = document.getElementById('btn-toggle-tools');
  const btnTabGis = document.getElementById('btn-tab-gis');
  const btnTabTraverse = document.getElementById('btn-tab-traverse');
  const btnCloseGis = document.getElementById('btn-close-gis');
  const btnCloseTraverse = document.getElementById('btn-close-traverse');
  const btnResetCam = document.getElementById('btn-reset-cam');

  if (btnTabGis) {
    btnTabGis.addEventListener('click', () => {
      sidebarGis.classList.toggle('collapsed');
      if (btnToggleTools) {
        const anyOpen = !sidebarGis.classList.contains('collapsed') || !sidebarTraverse.classList.contains('collapsed');
        btnToggleTools.classList.toggle('active', anyOpen);
      }
    });
  }

  if (btnTabTraverse) {
    btnTabTraverse.addEventListener('click', () => {
      sidebarTraverse.classList.toggle('collapsed');
      if (btnToggleTools) {
        const anyOpen = !sidebarGis.classList.contains('collapsed') || !sidebarTraverse.classList.contains('collapsed');
        btnToggleTools.classList.toggle('active', anyOpen);
      }
    });
  }

  if (btnCloseGis) {
    btnCloseGis.addEventListener('click', () => {
      sidebarGis.classList.add('collapsed');
      if (btnToggleTools) {
        btnToggleTools.classList.toggle('active', !sidebarTraverse.classList.contains('collapsed'));
      }
    });
  }

  if (btnCloseTraverse) {
    btnCloseTraverse.addEventListener('click', () => {
      sidebarTraverse.classList.add('collapsed');
      if (btnToggleTools) {
        btnToggleTools.classList.toggle('active', !sidebarGis.classList.contains('collapsed'));
      }
    });
  }

  if (btnToggleTools) {
    btnToggleTools.addEventListener('click', () => {
      const anyOpen = !sidebarGis.classList.contains('collapsed') || !sidebarTraverse.classList.contains('collapsed');
      if (anyOpen) {
        sidebarGis.classList.add('collapsed');
        sidebarTraverse.classList.add('collapsed');
        btnToggleTools.classList.remove('active');
      } else {
        sidebarGis.classList.remove('collapsed');
        sidebarTraverse.classList.remove('collapsed');
        btnToggleTools.classList.add('active');
      }
    });
  }

  if (btnResetCam) {
    btnResetCam.addEventListener('click', () => {
      flyToPreset('global');
      document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
      const globalBtn = document.querySelector('.btn-preset[data-preset="global"]');
      if (globalBtn) globalBtn.classList.add('active');
    });
  }

  // Keyboard shortcut 'H' to toggle HUD / tools
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === 'h' || e.key === 'H') {
      if (btnToggleTools) btnToggleTools.click();
    }
  });

  // View Mode Switcher: 3D Globe vs Full 2D Mars Map
  const btnView3D = document.getElementById('btn-view-3d');
  const btnView2D = document.getElementById('btn-view-2d');
  const webglContainer = document.getElementById('webgl-container');
  const flatMapContainer = document.getElementById('flat-map-container');

  if (btnView3D && btnView2D) {
    btnView3D.addEventListener('click', () => {
      btnView3D.classList.add('active');
      btnView2D.classList.remove('active');
      state.viewMode = '3d';
      webglContainer.classList.remove('hidden');
      flatMapContainer.classList.add('hidden');
      onWindowResize();
    });

    btnView2D.addEventListener('click', () => {
      btnView2D.classList.add('active');
      btnView3D.classList.remove('active');
      state.viewMode = '2d';
      webglContainer.classList.add('hidden');
      flatMapContainer.classList.remove('hidden');
      resizeFlatMap();
      renderFlatMap();
    });
  }

  // Measurement Tool Toggle
  const btnMeasure = document.getElementById('btn-toggle-measure');
  btnMeasure.addEventListener('click', () => {
    state.measurementMode = !state.measurementMode;
    btnMeasure.classList.toggle('active', state.measurementMode);
    document.getElementById('measure-banner').classList.toggle('hidden', !state.measurementMode);
    if (!state.measurementMode) {
      resetMeasurement();
    }
  });

  document.getElementById('btn-clear-measure').addEventListener('click', resetMeasurement);

  // Sun Simulator Panel Toggle
  const btnSun = document.getElementById('btn-toggle-sun');
  const sunPanel = document.getElementById('sun-simulator-panel');
  btnSun.addEventListener('click', () => {
    sunPanel.classList.toggle('hidden');
    btnSun.classList.toggle('active', !sunPanel.classList.contains('hidden'));
  });
  document.getElementById('btn-close-sun').addEventListener('click', () => {
    sunPanel.classList.add('hidden');
    btnSun.classList.remove('active');
  });

  // Sun Time Slider
  const sunSlider = document.getElementById('sun-time-slider');
  sunSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.ltstHour = val;
    updateSunAngle();
  });

  // Worldview Time-Series Slider
  const wvSlider = document.getElementById('worldview-slider');
  wvSlider.addEventListener('input', (e) => {
    const idx = parseInt(e.target.value, 10);
    applyWorldviewStep(idx);
  });

  // Layer Visibility Toggles
  document.getElementById('layer-geology-toggle').addEventListener('change', (e) => {
    state.layers.geology = e.target.checked;
    updateLayersVisibility();
  });

  document.getElementById('layer-mineralogy-toggle').addEventListener('change', (e) => {
    state.layers.mineralogy = e.target.checked;
    updateLayersVisibility();
  });

  document.getElementById('layer-nomenclature-toggle').addEventListener('change', (e) => {
    landmarkPinsGroup.visible = e.target.checked;
  });

  document.getElementById('layer-ground-truth-toggle').addEventListener('change', (e) => {
    roverPinsGroup.visible = e.target.checked;
  });

  // Mission Traverse Select
  const travSelect = document.getElementById('traverse-preset-select');
  travSelect.addEventListener('change', (e) => {
    state.selectedMissionPreset = e.target.value;
    loadTraversePreset(e.target.value);
  });

  document.getElementById('btn-add-waypoint').addEventListener('click', () => {
    addCustomWaypoint();
  });

  // Hazard Layer Toggle
  const btnHazards = document.getElementById('btn-toggle-hazards');
  if (btnHazards) {
    btnHazards.addEventListener('click', () => {
      state.layers.hazards = !state.layers.hazards;
      btnHazards.classList.toggle('active', state.layers.hazards);
      hazardsGroup.visible = state.layers.hazards;
    });
  }

  document.getElementById('btn-compute-traverse').addEventListener('click', () => {
    calculateTraverseProfile();
  });

  // Autonomous Safe Route Optimizer
  const btnSafeOpt = document.getElementById('btn-optimize-safe-route');
  if (btnSafeOpt) {
    btnSafeOpt.addEventListener('click', () => {
      optimizeSafeTraverseRoute();
    });
  }

  // Route View Toggles (Safe vs Direct)
  const btnViewSafe = document.getElementById('btn-view-safe');
  const btnViewDirect = document.getElementById('btn-view-direct');
  if (btnViewSafe && btnViewDirect) {
    btnViewSafe.addEventListener('click', () => {
      btnViewSafe.classList.add('active');
      btnViewDirect.classList.remove('active');
      state.activeRouteView = 'safe';
      applyRouteViewSelection();
    });
    btnViewDirect.addEventListener('click', () => {
      btnViewDirect.classList.add('active');
      btnViewSafe.classList.remove('active');
      state.activeRouteView = 'direct';
      applyRouteViewSelection();
    });
  }

  // Turn-by-Turn GPS Navigation System
  const btnStartNav = document.getElementById('btn-start-navigation');
  if (btnStartNav) {
    btnStartNav.addEventListener('click', startTurnByTurnNavigation);
  }
  document.getElementById('btn-end-navigation').addEventListener('click', stopNavigation);
  document.getElementById('btn-toggle-voice').addEventListener('click', (e) => {
    state.voiceNavEnabled = !state.voiceNavEnabled;
    e.target.classList.toggle('active', state.voiceNavEnabled);
  });
  document.getElementById('btn-toggle-chase').addEventListener('click', (e) => {
    state.chaseCamEnabled = !state.chaseCamEnabled;
    e.target.classList.toggle('active', state.chaseCamEnabled);
  });

  // GPS Route Exporters (GPX & GeoJSON)
  const btnGpx = document.getElementById('btn-export-gpx');
  if (btnGpx) {
    btnGpx.addEventListener('click', exportRouteGpx);
  }
  const btnGeoJson = document.getElementById('btn-export-geojson');
  if (btnGeoJson) {
    btnGeoJson.addEventListener('click', exportRouteGeoJson);
  }

  // Earth Planetary Extension Modal
  const btnEarth = document.getElementById('btn-toggle-earth');
  if (btnEarth) {
    btnEarth.addEventListener('click', openEarthModal);
  }
  document.getElementById('btn-close-earth-modal').addEventListener('click', closeEarthModal);
  document.getElementById('earth-modal-backdrop').addEventListener('click', closeEarthModal);

  // Global Search Engine
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', handleGlobalSearch);
    document.getElementById('btn-clear-search').addEventListener('click', clearSearch);
  }

  // Modal Close
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', closeModal);
}

// ==========================================================================
// 3. API Data Fetching & Rendering
// ==========================================================================
async function loadDatasets() {
  try {
    // 1. Fetch Nomenclature
    const nomRes = await fetch('/api/mars/features');
    const nomData = await nomRes.json();
    state.landmarks = nomData.features || [];
    renderLandmarks();

    // 2. Fetch Geology & Mineralogy Layers
    const geoRes = await fetch('/api/geology/layers');
    const geoData = await geoRes.json();
    renderGeologyLegend(geoData.geologic_units || []);
    renderMineralogyLegend(geoData.mineralogy_hotspots || []);

    // 3. Fetch Rover Photos
    const photoRes = await fetch('/api/rover/inspection');
    const photoData = await photoRes.json();
    state.roverPhotos = photoData.photos || [];
    renderRoverPins();

    // 4. Fetch NASA Surface Hazard Zones
    const hazRes = await fetch('/api/hazards');
    const hazData = await hazRes.json();
    state.hazards = hazData.hazards || [];
    renderHazardZones();

    // 5. Fetch Worldview Timeline
    const wvRes = await fetch('/api/worldview/timeline');
    const wvData = await wvRes.json();
    state.timelineData = wvData.series || [];
    if (state.timelineData.length > 0) {
      applyWorldviewStep(0);
    }

    // 6. Initial Traverse Preset & Safe Optimization
    await loadTraversePreset('curiosity');

    // 7. Initial Sun Angle
    updateSunAngle();
  } catch (err) {
    console.error('Failed to load datasets from Sol Nav API:', err);
  }
}

// ==========================================================================
// 4. USGS GIS Scientific Layers Sidebar
// ==========================================================================
function renderGeologyLegend(units) {
  const container = document.getElementById('geology-legend-container');
  container.innerHTML = units.map(u => `
    <div class="legend-item" style="border-left-color: ${u.color};">
      <div class="legend-header-line">
        <span class="legend-color-dot" style="background: ${u.color};"></span>
        <span class="legend-name">${u.code} - ${u.name}</span>
      </div>
      <div class="legend-desc">${u.description}</div>
    </div>
  `).join('');
}

function renderMineralogyLegend(hotspots) {
  const container = document.getElementById('mineralogy-legend-container');
  container.innerHTML = hotspots.map(h => `
    <div class="legend-item" style="border-left-color: ${h.color};">
      <div class="legend-header-line">
        <span class="legend-color-dot" style="background: ${h.color};"></span>
        <span class="legend-name">${h.mineral}</span>
      </div>
      <div class="legend-desc">Band: ${h.spectral_band} | ${h.significance}</div>
    </div>
  `).join('');

  // Add 3D Mineralogy Hotspot Spheres on Mars Globe
  hotspots.forEach(h => {
    const pos = latLonToVector3(h.lat, h.lon, 5.04);
    const geom = new THREE.RingGeometry(0.12, 0.28, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(h.color),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    const ring = new THREE.Mesh(geom, mat);
    ring.position.copy(pos);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    landmarkPinsGroup.add(ring);
  });
}

function renderLandmarks() {
  const container = document.getElementById('landmarks-container');
  container.innerHTML = state.landmarks.map(lm => `
    <div class="landmark-item" onclick="flyToCoordinates(${lm.lat}, ${lm.lon}, 8.5)">
      <span class="landmark-name">${lm.name}</span>
      <span class="landmark-elev">${lm.elevation_m > 0 ? '+' : ''}${lm.elevation_m} m</span>
    </div>
  `).join('');

  // Create 3D Beacon Pins for Landmarks
  landmarkPinsGroup.clear();
  state.landmarks.forEach(lm => {
    const pos = latLonToVector3(lm.lat, lm.lon, 5.06);

    // Glowing Pin Head
    const pinGeom = new THREE.SphereGeometry(0.08, 16, 16);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const pin = new THREE.Mesh(pinGeom, pinMat);
    pin.position.copy(pos);
    pin.userData = { type: 'landmark', data: lm };

    // Stem connecting to surface
    const surfacePos = latLonToVector3(lm.lat, lm.lon, 5.0);
    const lineGeom = new THREE.BufferGeometry().setFromPoints([surfacePos, pos]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.6 });
    const stem = new THREE.Line(lineGeom, lineMat);

    landmarkPinsGroup.add(pin);
    landmarkPinsGroup.add(stem);
  });
}

function renderRoverPins() {
  const container = document.getElementById('rover-pins-container');
  container.innerHTML = state.roverPhotos.map(p => `
    <div class="rover-pin-item" onclick="openPhotoModal('${p.id}')">
      <span class="rover-pin-name">📷 ${p.rover}: ${p.target_name}</span>
      <span class="rover-pin-sol">Sol ${p.sol}</span>
    </div>
  `).join('');

  roverPinsGroup.clear();
  state.roverPhotos.forEach(p => {
    const pos = latLonToVector3(p.lat, p.lon, 5.08);

    // Rover Camera Beacon (Glowing Amber/Orange Pin)
    const pinGeom = new THREE.ConeGeometry(0.12, 0.28, 8);
    pinGeom.rotateX(Math.PI);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0xff6d00 });
    const pin = new THREE.Mesh(pinGeom, pinMat);
    pin.position.copy(pos);
    pin.lookAt(new THREE.Vector3(0, 0, 0));
    pin.userData = { type: 'rover_photo', photoId: p.id };

    roverPinsGroup.add(pin);
  });
}

// Render NASA HiRISE / Rover Surface Hazard Zones in 3D
function renderHazardZones() {
  hazardsGroup.clear();
  state.hazards.forEach(hz => {
    const pos = latLonToVector3(hz.lat, hz.lon, 5.04);

    // Translucent hazard perimeter disk
    const radiusVisual = Math.max(0.15, Math.min(0.6, (hz.radius_km / 3389.5) * 5.0 * 22));
    const geom = new THREE.RingGeometry(0.04, radiusVisual, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(hz.color),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    const ring = new THREE.Mesh(geom, mat);
    ring.position.copy(pos);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    ring.userData = { type: 'hazard_zone', hazard: hz };

    // Warning Beacon Octahedron
    const beaconGeom = new THREE.OctahedronGeometry(0.09, 0);
    const beaconMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(hz.color) });
    const beacon = new THREE.Mesh(beaconGeom, beaconMat);
    beacon.position.copy(latLonToVector3(hz.lat, hz.lon, 5.08));
    beacon.userData = { type: 'hazard_zone', hazard: hz };

    hazardsGroup.add(ring);
    hazardsGroup.add(beacon);
  });
}

function updateLayersVisibility() {
  // Can toggle specific material channels or overlays
}

// ==========================================================================
// 5. Curiosity & Mount Sharp Traverse Planner
// ==========================================================================
async function loadTraversePreset(preset) {
  let endpoint = '/api/traverse/curiosity';
  if (preset === 'perseverance') {
    endpoint = '/api/traverse/perseverance';
  }

  if (preset === 'olympus_eva') {
    state.waypoints = [
      { name: "Caldera South Rim", lat: 18.20, lon: 226.10, elevation_m: 21100 },
      { name: "Central Caldera Floor", lat: 18.50, lon: 226.25, elevation_m: 18400 },
      { name: "Pangboche Crater Wall", lat: 18.85, lon: 226.40, elevation_m: 20800 }
    ];
    renderWaypointList();
    optimizeSafeTraverseRoute();
    flyToCoordinates(18.65, 226.2, 8.2);
    return;
  }

  if (preset === 'custom') {
    state.waypoints = [
      { name: "EVA Base Point A", lat: -4.5895, lon: 137.4417, elevation_m: -4520 },
      { name: "Sample Site B", lat: -4.6521, lon: 137.3995, elevation_m: -4460 }
    ];
    renderWaypointList();
    optimizeSafeTraverseRoute();
    return;
  }

  try {
    const res = await fetch(endpoint);
    const data = await res.json();
    state.waypoints = data.waypoints || [];
    renderWaypointList();
    optimizeSafeTraverseRoute();

    if (preset === 'curiosity') {
      flyToCoordinates(-5.37, 137.44, 8.0);
    } else if (preset === 'perseverance') {
      flyToCoordinates(18.38, 77.58, 8.0);
    }
  } catch (err) {
    console.error('Failed to load traverse preset:', err);
  }
}

function renderWaypointList() {
  const container = document.getElementById('waypoint-list-container');
  container.innerHTML = state.waypoints.map((wp, idx) => `
    <div class="wp-row">
      <span class="wp-index">W${idx + 1}</span>
      <div class="wp-coords">
        <strong>${wp.name || 'Waypoint ' + (idx + 1)}</strong>
        <div>${wp.lat.toFixed(4)}°, ${wp.lon.toFixed(4)}°</div>
      </div>
      <button class="btn-remove-wp" onclick="removeWaypoint(${idx})">✕</button>
    </div>
  `).join('');
}

function removeWaypoint(idx) {
  if (state.waypoints.length <= 2) {
    showHudNotice("Traverse requires at least 2 waypoints.");
    return;
  }
  state.waypoints.splice(idx, 1);
  renderWaypointList();
  calculateTraverseProfile();
}

function addCustomWaypoint() {
  const lastWp = state.waypoints[state.waypoints.length - 1];
  const newLat = lastWp ? lastWp.lat + (Math.random() - 0.5) * 0.08 : 0.0;
  const newLon = lastWp ? lastWp.lon + (Math.random() - 0.5) * 0.08 : 0.0;

  state.waypoints.push({
    name: `Custom WP ${state.waypoints.length + 1}`,
    lat: parseFloat(newLat.toFixed(4)),
    lon: parseFloat(newLon.toFixed(4))
  });
  renderWaypointList();
  calculateTraverseProfile();
}

async function calculateTraverseProfile() {
  if (state.waypoints.length < 2) return;

  try {
    const res = await fetch('/api/traverse/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        waypoints: state.waypoints,
        rover_mode: 'ASTRONAUT_EVA'
      })
    });
    const data = await res.json();
    if (data.status === 'SUCCESS') {
      renderElevationChart(data.profile);
      updateTraverseMetrics(data);
      renderTraverse3DPath(data.profile);
    }
  } catch (err) {
    console.error('Failed to compute traverse profile:', err);
  }
}

// Autonomous Hazard Avoidance & Terrain Optimization
async function optimizeSafeTraverseRoute() {
  if (state.waypoints.length < 2) return;

  try {
    const res = await fetch('/api/traverse/optimize-safe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        waypoints: state.waypoints,
        rover_mode: 'ASTRONAUT_EVA'
      })
    });
    const data = await res.json();
    if (data.status === 'SUCCESS') {
      state.safeOptimizationResult = data;

      // Update Hazard Alert Banner
      const banner = document.getElementById('hazard-alert-banner');
      if (banner) {
        banner.classList.remove('hidden');

        if (data.has_hazards_detected) {
          const hzNames = data.detected_hazards.map(h => h.name).join(', ') || 'Steep Slopes & Uneven Terraces';
          document.getElementById('hac-title').textContent = `${data.detected_hazards.length || 'UNEVEN'} HAZARDS DETECTED & BYPASSED`;
          document.getElementById('hac-desc').textContent = `AutoNav detoured around: ${hzNames}. Avoids wheel sinkage & rollovers.`;
          document.getElementById('hac-safety-score').textContent = `+${data.safety_improvement_pct}%`;
          document.getElementById('hac-wheel-risk').textContent = data.safe_route.wheel_damage_risk;
        } else {
          document.getElementById('hac-title').textContent = 'ROUTE TERRAIN CLEAR & OPTIMIZED';
          document.getElementById('hac-desc').textContent = 'Traverse adheres to low-grade firm regolith plains.';
          document.getElementById('hac-safety-score').textContent = '+100% NOMINAL';
          document.getElementById('hac-wheel-risk').textContent = 'MINIMAL';
        }
      }

      state.activeRouteView = 'safe';
      applyRouteViewSelection();
    }
  } catch (err) {
    console.error('Failed to optimize safe traverse route:', err);
  }
}

function applyRouteViewSelection() {
  if (!state.safeOptimizationResult) return;
  const res = state.safeOptimizationResult;

  if (state.activeRouteView === 'safe') {
    renderElevationChart(res.safe_route.profile);
    updateTraverseMetrics(res.safe_route);
    renderTraverse3DPathDual(res.direct_route.profile, res.safe_route.profile);
  } else {
    renderElevationChart(res.direct_route.profile);
    updateTraverseMetrics(res.direct_route);
    renderTraverse3DPathDual(res.direct_route.profile, res.safe_route.profile);
  }
}

function renderTraverse3DPathDual(directProfile, safeProfile) {
  traverseTrackGroup.clear();

  // 1. Direct Route (Red Line showing Hazardous Direct Line)
  if (directProfile && directProfile.length >= 2) {
    const pts = directProfile.map(p => latLonToVector3(p.lat, p.lon, 5.03));
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geom, new THREE.LineBasicMaterial({
      color: 0xff1744,
      linewidth: 2,
      transparent: true,
      opacity: state.activeRouteView === 'direct' ? 1.0 : 0.4
    }));
    traverseTrackGroup.add(line);
  }

  // 2. Safe Route (Solid Glowing Green Line Detouring Around Hazards)
  if (safeProfile && safeProfile.length >= 2) {
    const pts = safeProfile.map(p => latLonToVector3(p.lat, p.lon, 5.04));
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geom, new THREE.LineBasicMaterial({
      color: 0x00e676,
      linewidth: 3,
      transparent: true,
      opacity: state.activeRouteView === 'safe' ? 1.0 : 0.5
    }));
    traverseTrackGroup.add(line);
  }

  // Waypoints Nodes
  state.waypoints.forEach((wp, idx) => {
    const pos = latLonToVector3(wp.lat, wp.lon, 5.05);
    const nodeGeom = new THREE.SphereGeometry(0.07, 12, 12);
    const nodeMat = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x00e676 : 0x00e5ff });
    const node = new THREE.Mesh(nodeGeom, nodeMat);
    node.position.copy(pos);
    traverseTrackGroup.add(node);
  });
}

function updateTraverseMetrics(data) {
  document.getElementById('metric-distance').textContent = `${data.total_distance_km} km`;
  document.getElementById('metric-max-slope').textContent = `${data.max_slope_deg}°`;
  document.getElementById('metric-climb').textContent = `+${data.accumulated_gain_m} m`;
  document.getElementById('metric-energy').textContent = `${data.energy_consumption_kwh} kWh`;
  document.getElementById('metric-hazards').textContent = `${data.critical_hazards_count} Critical (>15°)`;
  document.getElementById('metric-duration').textContent = `${data.estimated_eva_hours} hrs (Walking)`;

  const hzElem = document.getElementById('metric-hazards');
  if (data.critical_hazards_count > 0) {
    hzElem.classList.add('val-hazard');
  } else {
    hzElem.classList.remove('val-hazard');
  }
}

// 2D Canvas Chart for Elevation Profile with Colored Slope Hazard Bars
function renderElevationChart(profilePoints) {
  const canvas = document.getElementById('elevation-canvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  if (!profilePoints || profilePoints.length === 0) return;

  const minElev = Math.min(...profilePoints.map(p => p.elevation_m));
  const maxElev = Math.max(...profilePoints.map(p => p.elevation_m));
  const maxDist = profilePoints[profilePoints.length - 1].distance_km || 1;
  const elevSpan = (maxElev - minElev) || 1;

  const padLeft = 40;
  const padRight = 10;
  const padTop = 15;
  const padBottom = 25;

  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  // Grid lines
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padTop + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(w - padRight, y);
    ctx.stroke();

    const elevVal = Math.round(maxElev - (elevSpan / 4) * i);
    ctx.fillStyle = '#8492a6';
    ctx.font = '9px Share Tech Mono';
    ctx.textAlign = 'right';
    ctx.fillText(`${elevVal}m`, padLeft - 6, y + 3);
  }

  // Draw Path Line & Gradient Area
  for (let i = 0; i < profilePoints.length - 1; i++) {
    const p1 = profilePoints[i];
    const p2 = profilePoints[i + 1];

    const x1 = padLeft + (p1.distance_km / maxDist) * chartW;
    const y1 = padTop + chartH - ((p1.elevation_m - minElev) / elevSpan) * chartH;
    const x2 = padLeft + (p2.distance_km / maxDist) * chartW;
    const y2 = padTop + chartH - ((p2.elevation_m - minElev) / elevSpan) * chartH;

    // Segment color based on Slope Hazard
    let strokeColor = '#00e676'; // Safe < 8 deg
    if (p2.slope_deg >= 15.0) {
      strokeColor = '#ff1744'; // CRITICAL HAZARD
    } else if (p2.slope_deg >= 8.0) {
      strokeColor = '#ffd600'; // CAUTION
    }

    // Filled bar below segment
    ctx.fillStyle = strokeColor === '#ff1744' ? 'rgba(255, 23, 68, 0.3)' : 'rgba(0, 229, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2, padTop + chartH);
    ctx.lineTo(x1, padTop + chartH);
    ctx.closePath();
    ctx.fill();

    // Segment line
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = p2.slope_deg >= 15.0 ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Distance Axis
  ctx.fillStyle = '#8492a6';
  ctx.font = '9px Share Tech Mono';
  ctx.textAlign = 'left';
  ctx.fillText('0 km', padLeft, h - 8);
  ctx.textAlign = 'right';
  ctx.fillText(`${maxDist.toFixed(1)} km`, w - padRight, h - 8);
}

// Render 3D Polyline along Mars Sphere for Traverse
function renderTraverse3DPath(profilePoints) {
  traverseTrackGroup.clear();
  if (!profilePoints || profilePoints.length < 2) return;

  const points3D = profilePoints.map(p => latLonToVector3(p.lat, p.lon, 5.03));
  const geom = new THREE.BufferGeometry().setFromPoints(points3D);

  const mat = new THREE.LineBasicMaterial({
    color: 0xff6d00,
    linewidth: 3
  });
  const line = new THREE.Line(geom, mat);
  traverseTrackGroup.add(line);

  // Waypoint Nodes
  state.waypoints.forEach((wp, idx) => {
    const pos = latLonToVector3(wp.lat, wp.lon, 5.04);
    const nodeGeom = new THREE.SphereGeometry(0.06, 12, 12);
    const nodeMat = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x00e676 : 0xff1744 });
    const node = new THREE.Mesh(nodeGeom, nodeMat);
    node.position.copy(pos);
    traverseTrackGroup.add(node);
  });
}

// ==========================================================================
// 6. NASA Worldview Time-Series Controller
// ==========================================================================
function applyWorldviewStep(index) {
  if (!state.timelineData || index >= state.timelineData.length) return;
  const step = state.timelineData[index];

  state.activeSol = step.sol;
  state.activeLs = step.ls_deg;

  // Update Telemetry Header
  document.getElementById('telem-sol').textContent = step.sol.toFixed(1);
  document.getElementById('telem-ls').textContent = `${step.ls_deg.toFixed(1)}° (${step.season})`;

  // Update Timeline Metrics
  document.getElementById('tl-tau').textContent = step.tau_opacity.toFixed(2);
  document.getElementById('tl-pressure').textContent = `${step.pressure_mbar} mbar`;
  document.getElementById('tl-satellite').textContent = step.pass_sat;

  const alertBadge = document.getElementById('dust-alert-badge');
  if (step.dust_storm_active) {
    alertBadge.textContent = `⚠️ ${step.dust_storm_name.toUpperCase()}`;
    alertBadge.classList.add('storm-active');
  } else {
    alertBadge.textContent = 'DUST CONDITION: NOMINAL';
    alertBadge.classList.remove('storm-active');
  }

  // Adjust 3D Atmospheric Dust Cloud Opacity on Mars Globe
  if (dustCloudMesh) {
    const targetOpacity = Math.min(0.75, step.tau_opacity * 0.16);
    dustCloudMesh.material.opacity = targetOpacity;
  }
}

// ==========================================================================
// 7. Sun Angle & Shadow Projection Simulator
// ==========================================================================
async function updateSunAngle() {
  try {
    const res = await fetch(`/api/sun/angle?sol=${state.activeSol}&ltst_hour=${state.ltstHour}&lat=0.0&lon=0.0`);
    const data = await res.json();

    document.getElementById('sun-time-display').textContent = `${data.ltst_formatted} (${state.ltstHour < 12 ? 'Morning' : (state.ltstHour === 12 ? 'Noon' : 'Afternoon')})`;
    document.getElementById('telem-time').textContent = data.ltst_formatted;

    document.getElementById('sun-elev-val').textContent = `${data.target_solar_telemetry.elevation_deg}°`;
    document.getElementById('sun-azim-val').textContent = `${data.target_solar_telemetry.azimuth_deg}°`;
    document.getElementById('sun-sublat-val').textContent = `${data.subsolar_point.lat}°`;
    document.getElementById('sun-state-val').textContent = data.target_solar_telemetry.illumination_state;

    // Reposition Three.js Directional Light Vector
    const lv = data.light_vector_3d;
    const distance = 20.0;
    sunLight.position.set(lv.x * distance, lv.y * distance, lv.z * distance);
  } catch (err) {
    console.error('Failed to update sun angle:', err);
  }
}

// ==========================================================================
// 8. Distance & Elevation Tool (Crater Measurement)
// ==========================================================================
async function handleMeasurementClick(lat, lon) {
  state.measurePoints.push({ lat, lon });

  // Drop temporary measurement beacon
  const pos = latLonToVector3(lat, lon, 5.04);
  const beaconGeom = new THREE.SphereGeometry(0.07, 12, 12);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  const beacon = new THREE.Mesh(beaconGeom, beaconMat);
  beacon.position.copy(pos);
  measureTrackGroup.add(beacon);

  if (state.measurePoints.length === 2) {
    const p1 = state.measurePoints[0];
    const p2 = state.measurePoints[1];

    // Compute great circle path
    const res = await fetch('/api/traverse/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        waypoints: [
          { lat: p1.lat, lon: p1.lon },
          { lat: p2.lat, lon: p2.lon }
        ]
      })
    });
    const data = await res.json();

    if (data.status === 'SUCCESS') {
      // Draw 3D Line
      const pts = data.profile.map(p => latLonToVector3(p.lat, p.lon, 5.03));
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0x00e5ff, linewidth: 2 }));
      measureTrackGroup.add(line);

      // Show Results
      const elevDelta = Math.abs(data.profile[data.profile.length - 1].elevation_m - data.profile[0].elevation_m);
      document.getElementById('measure-dist-km').textContent = `${data.total_distance_km} km`;
      document.getElementById('measure-elev-delta').textContent = `Δ ${elevDelta.toFixed(0)} m (Peak: ${data.elevation_max_m}m / Floor: ${data.elevation_min_m}m)`;
      document.getElementById('measure-results').classList.remove('hidden');
    }
  } else if (state.measurePoints.length > 2) {
    resetMeasurement();
    handleMeasurementClick(lat, lon);
  }
}

function resetMeasurement() {
  state.measurePoints = [];
  measureTrackGroup.clear();
  document.getElementById('measure-results').classList.add('hidden');
}

// ==========================================================================
// 9. Perseverance Ground-Truth Surface Inspection Modal
// ==========================================================================
function switchBasemap(mode) {
  state.activeBasemap = mode;
  if (marsGlobe && basemapTextures[mode]) {
    marsGlobe.material.map = basemapTextures[mode];
    marsGlobe.material.needsUpdate = true;
  }
  if (state.viewMode === '2d') {
    renderFlatMap();
  }
}

function generateFallbackMarsImage(photo) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b0522c"/>
        <stop offset="60%" stop-color="#d97746"/>
        <stop offset="100%" stop-color="#e69165"/>
      </linearGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#733219"/>
        <stop offset="40%" stop-color="#994624"/>
        <stop offset="100%" stop-color="#4d1f0e"/>
      </linearGradient>
    </defs>
    <rect width="800" height="300" fill="url(#sky)"/>
    <path d="M 0,260 Q 200,220 420,250 T 800,230 L 800,500 L 0,500 Z" fill="#8c3d1e"/>
    <path d="M 0,310 Q 250,290 500,320 T 800,300 L 800,500 L 0,500 Z" fill="url(#ground)"/>
    <!-- Stratified Bedrock Layers -->
    <path d="M 50,360 Q 300,345 600,365" stroke="#ba5a32" stroke-width="6" fill="none" opacity="0.8"/>
    <path d="M 20,400 Q 350,380 750,410" stroke="#5a2412" stroke-width="8" fill="none" opacity="0.9"/>
    <!-- Reticle Overlays -->
    <circle cx="400" cy="250" r="60" stroke="#00e5ff" stroke-width="1.5" stroke-dasharray="4,4" fill="none"/>
    <line x1="400" y1="170" x2="400" y2="330" stroke="#00e5ff" stroke-width="1" opacity="0.6"/>
    <line x1="320" y1="250" x2="480" y2="250" stroke="#00e5ff" stroke-width="1" opacity="0.6"/>
    <text x="30" y="40" fill="#00e5ff" font-family="monospace" font-size="14" font-weight="bold">RAW ACQUISITION // ${photo.rover.toUpperCase()}</text>
    <text x="30" y="65" fill="#ffffff" font-family="monospace" font-size="12">TARGET: ${photo.target_name} | SOL ${photo.sol}</text>
    <text x="30" y="470" fill="#ffd600" font-family="monospace" font-size="11">INSTRUMENT: ${photo.instrument} | FOV: ${photo.fov_deg}°</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function openPhotoModal(photoId) {
  const photo = state.roverPhotos.find(p => p.id === photoId);
  if (!photo) return;

  document.getElementById('modal-rover-name').textContent = `${photo.rover.toUpperCase()} // SOL ${photo.sol}`;
  const imgElem = document.getElementById('modal-image');
  imgElem.onerror = () => {
    imgElem.src = generateFallbackMarsImage(photo);
  };
  imgElem.src = photo.image_url;
  document.getElementById('modal-target-title').textContent = `TARGET: ${photo.target_name}`;
  document.getElementById('modal-fov').textContent = `FOV: ${photo.fov_deg}° | AZIMUTH: ${photo.azimuth_deg}°`;
  document.getElementById('modal-sol-date').textContent = `SOL ${photo.sol} (${photo.earth_date})`;
  document.getElementById('modal-instrument').textContent = photo.instrument;
  document.getElementById('modal-coords').textContent = `${photo.lat.toFixed(4)}° N, ${photo.lon.toFixed(4)}° E`;
  document.getElementById('modal-elevation').textContent = `${photo.elevation_m} m (MOLA Datum)`;
  document.getElementById('modal-description').textContent = photo.description;

  // Composition Grid
  const compGrid = document.getElementById('modal-composition-grid');
  compGrid.innerHTML = Object.entries(photo.spectral_composition || {}).map(([key, val]) => `
    <div class="spec-cell">
      <span class="spec-name">${key}</span>
      <span class="spec-value">${val}</span>
    </div>
  `).join('');

  document.getElementById('ground-truth-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('ground-truth-modal').classList.add('hidden');
}

// ==========================================================================
// 10. Camera Presets & Fly-To Interpolation
// ==========================================================================
function flyToCoordinates(lat, lon, distance = 8.5) {
  const targetPos = latLonToVector3(lat, lon, distance);
  animateCameraTo(targetPos, new THREE.Vector3(0, 0, 0));
}

function flyToPreset(preset) {
  switch (preset) {
    case 'global':
      animateCameraTo(new THREE.Vector3(0, 0, 16), new THREE.Vector3(0, 0, 0));
      break;
    case 'gale':
      flyToCoordinates(-5.37, 137.44, 7.8);
      break;
    case 'jezero':
      flyToCoordinates(18.38, 77.58, 7.8);
      break;
    case 'olympus':
      flyToCoordinates(18.65, 226.2, 8.2);
      break;
    case 'valles':
      flyToCoordinates(-9.8, 283.6, 8.2);
      break;
  }
}

function animateCameraTo(newPos, newLookAt) {
  targetCameraPos = newPos.clone();
  targetLookAt = newLookAt.clone();
  isAnimatingCamera = true;
}

// ==========================================================================
// 11. Mouse & Raycasting Handlers
// ==========================================================================
function onMouseMove(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(marsGlobe);

  if (intersects.length > 0) {
    const pt = intersects[0].point;
    const { lat, lon } = vector3ToLatLon(pt);

    document.getElementById('hover-lat').textContent = `${lat >= 0 ? lat.toFixed(3) + '° N' : Math.abs(lat).toFixed(3) + '° S'}`;
    document.getElementById('hover-lon').textContent = `${lon.toFixed(3)}° E`;

    // Query local elevation
    queryElevationDebounced(lat, lon);
  }
}

let elevDebounceTimer = null;
function queryElevationDebounced(lat, lon) {
  clearTimeout(elevDebounceTimer);
  elevDebounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/elevation/point?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`);
      const data = await res.json();
      document.getElementById('hover-elevation').textContent = `${data.elevation_m > 0 ? '+' : ''}${data.elevation_m} m`;
    } catch (e) {}
  }, 120);
}

function onCanvasClick(event) {
  raycaster.setFromCamera(mouse, camera);

  // Check Rover Pins First
  const roverIntersects = raycaster.intersectObjects(roverPinsGroup.children, true);
  if (roverIntersects.length > 0) {
    const clickedObj = roverIntersects[0].object;
    if (clickedObj.userData && clickedObj.userData.photoId) {
      openPhotoModal(clickedObj.userData.photoId);
      return;
    }
  }

  // Check Hazard Zones & Beacons
  const hazardIntersects = raycaster.intersectObjects(hazardsGroup.children, true);
  if (hazardIntersects.length > 0) {
    const clickedObj = hazardIntersects[0].object;
    if (clickedObj.userData && clickedObj.userData.hazard) {
      const hz = clickedObj.userData.hazard;
      showHudNotice(`⚠️ HAZARD ZONE: ${hz.name} (${hz.hazard_type}) - Max Local Slope: ${hz.max_slope_deg}°`);
      return;
    }
  }

  // Check Landmark Pins
  const landmarkIntersects = raycaster.intersectObjects(landmarkPinsGroup.children, true);
  if (landmarkIntersects.length > 0) {
    const clickedObj = landmarkIntersects[0].object;
    if (clickedObj.userData && clickedObj.userData.data) {
      const d = clickedObj.userData.data;
      flyToCoordinates(d.lat, d.lon, 8.0);
      return;
    }
  }

  // Globe click (Measurement Mode)
  if (state.measurementMode) {
    const globeIntersects = raycaster.intersectObject(marsGlobe);
    if (globeIntersects.length > 0) {
      const { lat, lon } = vector3ToLatLon(globeIntersects[0].point);
      handleMeasurementClick(lat, lon);
    }
  }
}

function onWindowResize() {
  const container = document.getElementById('webgl-container');
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// Main Render Loop
function animate() {
  requestAnimationFrame(animate);

  // Smooth Camera Animation
  if (isAnimatingCamera && targetCameraPos) {
    camera.position.lerp(targetCameraPos, 0.05);
    controls.target.lerp(targetLookAt, 0.05);

    if (camera.position.distanceTo(targetCameraPos) < 0.05) {
      isAnimatingCamera = false;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

// ==========================================================================
// 12. Full Mars 2D Interactive Equirectangular Map Engine
// ==========================================================================
const flatImages = {
  viking: null,
  mola: null,
  themis: null
};

let flatMapState = {
  panX: 0,
  panY: 0,
  zoom: 1.0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0
};

function initFlatMap() {
  const canvas = document.getElementById('flat-map-canvas');
  if (!canvas) return;

  window.addEventListener('resize', resizeFlatMap);
  resizeFlatMap();

  canvas.addEventListener('mousedown', (e) => {
    flatMapState.isDragging = true;
    flatMapState.dragStartX = e.clientX - flatMapState.panX;
    flatMapState.dragStartY = e.clientY - flatMapState.panY;
  });

  window.addEventListener('mouseup', () => {
    flatMapState.isDragging = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (flatMapState.isDragging) {
      flatMapState.panX = e.clientX - flatMapState.dragStartX;
      flatMapState.panY = e.clientY - flatMapState.dragStartY;
      renderFlatMap();
    } else {
      // Hover coordinate tracking on 2D map
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const coords = flatMapPixelToLatLon(clickX, clickY, canvas.width, canvas.height);
      if (coords) {
        document.getElementById('hover-lat').textContent = `${coords.lat >= 0 ? coords.lat.toFixed(3) + '° N' : Math.abs(coords.lat).toFixed(3) + '° S'}`;
        document.getElementById('hover-lon').textContent = `${coords.lon.toFixed(3)}° E`;
        queryElevationDebounced(coords.lat, coords.lon);
      }
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    flatMapState.zoom = Math.max(0.6, Math.min(6.0, flatMapState.zoom * zoomFactor));
    renderFlatMap();
  });

  canvas.addEventListener('click', (e) => {
    if (state.viewMode !== '2d') return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const coords = flatMapPixelToLatLon(clickX, clickY, canvas.width, canvas.height);
    if (coords) {
      if (state.measurementMode) {
        handleMeasurementClick(coords.lat, coords.lon);
      }
    }
  });
}

function resizeFlatMap() {
  const container = document.getElementById('flat-map-container');
  const canvas = document.getElementById('flat-map-canvas');
  if (!container || !canvas) return;

  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  renderFlatMap();
}

function renderFlatMap() {
  const canvas = document.getElementById('flat-map-canvas');
  if (!canvas || state.viewMode !== '2d') return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.save();

  // Apply Pan and Zoom
  ctx.translate(w / 2 + flatMapState.panX, h / 2 + flatMapState.panY);
  ctx.scale(flatMapState.zoom, flatMapState.zoom);
  ctx.translate(-w / 2, -h / 2);

  // 1. Draw Global Equirectangular Mars Texture Map
  const activeImg = flatImages[state.activeBasemap] || flatImages.viking;
  if (activeImg && activeImg.complete && activeImg.naturalWidth > 0) {
    ctx.drawImage(activeImg, 0, 0, w, h);
  } else {
    ctx.fillStyle = '#b85a31';
    ctx.fillRect(0, 0, w, h);
  }

  // 2. Graticule Grid Lines (every 30 degrees)
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.22)';
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(0, 229, 255, 0.75)';
  ctx.font = '10px Share Tech Mono';

  for (let lon = 0; lon <= 360; lon += 30) {
    const x = (lon / 360) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.fillText(`${lon}°E`, x + 4, 18);
  }

  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.fillText(lat === 0 ? 'EQUATOR 0°' : (lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`), 8, y - 4);
  }

  // 3. Draw NASA Surface Hazards on 2D Map
  if (state.layers.hazards && state.hazards) {
    state.hazards.forEach(hz => {
      const x = (hz.lon / 360) * w;
      const y = ((90 - hz.lat) / 180) * h;
      const r = Math.max(10, (hz.radius_km / 3389.5) * (w / 2));

      ctx.fillStyle = hz.color === '#ff1744' ? 'rgba(255, 23, 68, 0.35)' : 'rgba(255, 145, 0, 0.35)';
      ctx.strokeStyle = hz.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Orbitron';
      ctx.fillText(`⚠️ ${hz.name}`, x + r + 4, y + 3);
    });
  }

  // 4. Draw Traverse Paths on 2D Map
  if (state.safeOptimizationResult) {
    const res = state.safeOptimizationResult;
    // Direct Path (Dashed Red)
    if (res.direct_route && res.direct_route.profile) {
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      res.direct_route.profile.forEach((pt, i) => {
        const px = (pt.lon / 360) * w;
        const py = ((90 - pt.lat) / 180) * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Safe Detour Path (Solid Glowing Green)
    if (res.safe_route && res.safe_route.profile) {
      ctx.strokeStyle = '#00e676';
      ctx.lineWidth = 3;
      ctx.beginPath();
      res.safe_route.profile.forEach((pt, i) => {
        const px = (pt.lon / 360) * w;
        const py = ((90 - pt.lat) / 180) * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  }

  // 5. Draw IAU Planetary Nomenclature Landmarks
  if (state.layers.nomenclature && state.landmarks) {
    state.landmarks.forEach(lm => {
      const x = (lm.lon / 360) * w;
      const y = ((90 - lm.lat) / 180) * h;

      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(11, 16, 25, 0.85)';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1;
      const text = `${lm.name} (${lm.elevation_m > 0 ? '+' : ''}${lm.elevation_m}m)`;
      const textW = ctx.measureText(text).width;
      ctx.fillRect(x + 6, y - 10, textW + 8, 14);
      ctx.strokeRect(x + 6, y - 10, textW + 8, 14);

      ctx.fillStyle = '#ffffff';
      ctx.font = '9px Share Tech Mono';
      ctx.fillText(text, x + 10, y);
    });
  }

  // 6. Draw Rover Photo Pins on 2D Map
  if (state.layers.groundTruth && state.roverPhotos) {
    state.roverPhotos.forEach(p => {
      const x = (p.lon / 360) * w;
      const y = ((90 - p.lat) / 180) * h;

      ctx.fillStyle = '#ff6d00';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff6d00';
      ctx.font = 'bold 9px Share Tech Mono';
      ctx.fillText(`📷 ${p.rover} (Sol ${p.sol})`, x + 8, y + 4);
    });
  }

  ctx.restore();
}

function flatMapPixelToLatLon(pixelX, pixelY, width, height) {
  const normX = (pixelX - (width / 2 + flatMapState.panX)) / flatMapState.zoom + width / 2;
  const normY = (pixelY - (height / 2 + flatMapState.panY)) / flatMapState.zoom + height / 2;

  if (normX < 0 || normX > width || normY < 0 || normY > height) return null;

  const lon = (normX / width) * 360.0;
  const lat = 90.0 - (normY / height) * 180.0;

  return { lat, lon };
}

// ==========================================================================
// 13. Turn-by-Turn GPS Navigation, Earth Extensions & Global Search
// ==========================================================================

// --- A. Turn-by-Turn GPS Navigation System ---
let navAnimationInterval = null;

async function startTurnByTurnNavigation() {
  if (state.waypoints.length < 2) {
    showHudNotice("Please add at least 2 waypoints before starting navigation.");
    return;
  }

  try {
    const res = await fetch('/api/navigation/directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        waypoints: state.waypoints,
        rover_mode: 'ASTRONAUT_EVA'
      })
    });
    const data = await res.json();
    if (data.status === 'SUCCESS' && data.steps.length > 0) {
      state.navDirections = data;
      state.isNavigating = true;
      state.navStepIndex = 0;

      // Show HUD Bar
      document.getElementById('navigation-hud-bar').classList.remove('hidden');

      // Create Navigation Rover Marker
      createNavRoverMarker();

      // Speak initial prompt
      updateNavigationHud(data.steps[0]);
      speakVoicePrompt(data.steps[0].voice_cue);

      // Start Simulation Interval (moves rover from step to step)
      if (navAnimationInterval) clearInterval(navAnimationInterval);
      navAnimationInterval = setInterval(() => {
        advanceNavigationStep();
      }, 4500);
    }
  } catch (err) {
    console.error('Failed to start navigation:', err);
  }
}

function stopNavigation() {
  state.isNavigating = false;
  if (navAnimationInterval) clearInterval(navAnimationInterval);
  document.getElementById('navigation-hud-bar').classList.add('hidden');
  if (state.navRoverMesh) {
    scene.remove(state.navRoverMesh);
    state.navRoverMesh = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function advanceNavigationStep() {
  if (!state.navDirections || !state.isNavigating) return;
  state.navStepIndex++;

  if (state.navStepIndex >= state.navDirections.steps.length) {
    const lastStep = state.navDirections.steps[state.navDirections.steps.length - 1];
    updateNavigationHud(lastStep);
    speakVoicePrompt("Mission target reached. Navigation completed.");
    clearInterval(navAnimationInterval);
    return;
  }

  const step = state.navDirections.steps[state.navStepIndex];
  updateNavigationHud(step);
  speakVoicePrompt(step.voice_cue);

  // Move Rover Marker in 3D
  if (state.navRoverMesh) {
    const pos = latLonToVector3(step.lat, step.lon, 5.06);
    state.navRoverMesh.position.copy(pos);

    // Chase Camera Mode
    if (state.chaseCamEnabled) {
      const camPos = latLonToVector3(step.lat - 0.08, step.lon - 0.08, 6.2);
      animateCameraTo(camPos, pos);
    }
  }
}

function updateNavigationHud(step) {
  document.getElementById('nav-maneuver-icon').textContent = step.icon;
  document.getElementById('nav-instruction-text').textContent = step.instruction;
  document.getElementById('nav-instruction-sub').textContent = `In ${step.distance_km} km • Heading ${step.cardinal} (${step.bearing_deg}°) • Elev ${step.elevation_m}m`;

  const totalRemaining = Math.max(0, state.navDirections.total_distance_km - step.cumulative_distance_km);
  document.getElementById('nav-remaining-dist').textContent = `${totalRemaining.toFixed(1)} km`;
  document.getElementById('nav-eta').textContent = `${(totalRemaining / 3.2).toFixed(1)}h`;
  document.getElementById('nav-speed').textContent = "18 km/h";
  document.getElementById('nav-heading').textContent = `${step.bearing_deg}° ${step.cardinal}`;
}

function createNavRoverMarker() {
  if (state.navRoverMesh) scene.remove(state.navRoverMesh);
  const geom = new THREE.ConeGeometry(0.12, 0.32, 8);
  geom.rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  state.navRoverMesh = new THREE.Mesh(geom, mat);

  const startPt = state.navDirections.steps[0];
  state.navRoverMesh.position.copy(latLonToVector3(startPt.lat, startPt.lon, 5.06));
  scene.add(state.navRoverMesh);
}

function speakVoicePrompt(text) {
  if (!state.voiceNavEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 0.95;
  window.speechSynthesis.speak(utterance);
}

// --- B. GPS Route Exporters (GPX & GeoJSON) ---
async function exportRouteGpx() {
  if (state.waypoints.length < 2) {
    showHudNotice("Please generate a traverse route first.");
    return;
  }
  try {
    const res = await fetch('/api/export/gpx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints: state.waypoints, rover_mode: 'ASTRONAUT_EVA' })
    });
    const blob = await res.blob();
    downloadFile(blob, "Sol_Nav_Mars_Traverse.gpx");
  } catch (err) {
    console.error('Failed to export GPX:', err);
  }
}

async function exportRouteGeoJson() {
  if (state.waypoints.length < 2) {
    showHudNotice("Please generate a traverse route first.");
    return;
  }
  try {
    const res = await fetch('/api/export/geojson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints: state.waypoints, rover_mode: 'ASTRONAUT_EVA' })
    });
    const blob = await res.blob();
    downloadFile(blob, "Sol_Nav_Mars_Traverse.geojson");
  } catch (err) {
    console.error('Failed to export GeoJSON:', err);
  }
}

function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// --- C. Earth vs Mars Planetary Extension Modal ---
async function openEarthModal() {
  try {
    const res = await fetch('/api/earth-compare');
    const data = await res.json();
    renderEarthComparisons(data.comparisons || []);
    document.getElementById('earth-extension-modal').classList.remove('hidden');
  } catch (err) {
    console.error('Failed to load Earth comparisons:', err);
  }
}

function closeEarthModal() {
  document.getElementById('earth-extension-modal').classList.add('hidden');
}

function renderEarthComparisons(comparisons) {
  const container = document.getElementById('earth-comparisons-container');
  container.innerHTML = comparisons.map(c => `
    <div class="earth-card">
      <div class="earth-card-title">${c.category.toUpperCase()}</div>
      <div class="earth-comp-row">
        <span class="earth-comp-label">MARS (IAU):</span>
        <span class="earth-comp-mars">${c.mars_feature} (${c.mars_metric})</span>
      </div>
      <div class="earth-comp-row">
        <span class="earth-comp-label">EARTH (WGS84):</span>
        <span class="earth-comp-earth">${c.earth_feature} (${c.earth_metric})</span>
      </div>
      <div class="earth-card-ratio">SCALE RATIO: ${c.scale_ratio}</div>
      <div class="earth-card-note">${c.comparison_note}</div>
    </div>
  `).join('');
}

// --- D. Global POI Search Engine ---
let searchDebounceTimer = null;

function handleGlobalSearch(e) {
  const query = e.target.value.trim();
  const clearBtn = document.getElementById('btn-clear-search');
  const dropdown = document.getElementById('search-results-dropdown');

  clearBtn.classList.toggle('hidden', query.length === 0);

  if (query.length < 2) {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    return;
  }

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      renderSearchResults(data.results || []);
    } catch (err) {
      console.error('Search query failed:', err);
    }
  }, 160);
}

function clearSearch() {
  const input = document.getElementById('global-search-input');
  input.value = '';
  document.getElementById('btn-clear-search').classList.add('hidden');
  document.getElementById('search-results-dropdown').classList.add('hidden');
}

function renderSearchResults(results) {
  const dropdown = document.getElementById('search-results-dropdown');
  if (results.length === 0) {
    dropdown.innerHTML = '<div style="padding: 10px; font-size: 11px; color: #8492a6;">No Martian features found.</div>';
    dropdown.classList.remove('hidden');
    return;
  }

  dropdown.innerHTML = results.map(r => `
    <div class="search-result-item" onclick="selectSearchResult(${r.lat}, ${r.lon})">
      <div class="sri-left">
        <span class="sri-icon">${r.icon}</span>
        <div>
          <div class="sri-name">${r.name}</div>
          <div class="sri-cat">${r.category}</div>
        </div>
      </div>
      <div class="sri-elev">${r.elevation_m > 0 ? '+' : ''}${Math.round(r.elevation_m)}m</div>
    </div>
  `).join('');

  dropdown.classList.remove('hidden');
}

function selectSearchResult(lat, lon) {
  document.getElementById('search-results-dropdown').classList.add('hidden');
  flyToCoordinates(lat, lon, 7.8);

  // Update Coordinates Tracker
  document.getElementById('hover-lat').textContent = `${lat >= 0 ? lat.toFixed(3) + '° N' : Math.abs(lat).toFixed(3) + '° S'}`;
  document.getElementById('hover-lon').textContent = `${lon.toFixed(3)}° E`;
  queryElevationDebounced(lat, lon);
}
