import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LayerState, RouteData, SectorId, Waypoint, Hazard } from '../types';
import { getElevation, getSlope, SECTORS } from '../utils/terrain';
import { getSolarState } from '../utils/solarTracking';
import { Plotted3DMarker } from '../utils/sqlEngine';
import { MapPin, Navigation, Globe, Eye, Zap, Radio, X, Plus, Target, CheckCircle2, RotateCcw } from 'lucide-react';
import { missionAudio } from '../utils/audio';

interface Mars3DViewerProps {
  sector: SectorId;
  layerState: LayerState;
  solHour: number;
  solDay: number;
  routeData: RouteData;
  hazards: Hazard[];
  sqlMarkers: Plotted3DMarker[];
  activePinMode: 'none' | 'start' | 'end' | 'waypoint';
  onAddWaypoint: (wp: Waypoint) => void;
  onSelectMarker?: (marker: Plotted3DMarker | null) => void;
  hoveredRouteIndex?: number | null;
  onSelectSector?: (sector: SectorId) => void;
}

export const Mars3DViewer: React.FC<Mars3DViewerProps> = ({
  sector,
  layerState,
  solHour,
  solDay,
  routeData,
  hazards,
  sqlMarkers,
  activePinMode,
  onAddWaypoint,
  onSelectMarker,
  hoveredRouteIndex,
  onSelectSector
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // View mode: 'tactical' (high-res surface DEM) vs 'globe' (planetary 3D sphere)
  const [viewMode, setViewMode] = useState<'tactical' | 'globe'>('tactical');

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const terrainMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const globeGroupRef = useRef<THREE.Group>(new THREE.Group());
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const skyMeshRef = useRef<THREE.Mesh | null>(null);

  // Dynamic object groups
  const routeGroupRef = useRef<THREE.Group>(new THREE.Group());
  const pinsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const losGroupRef = useRef<THREE.Group>(new THREE.Group());
  const sqlMarkersGroupRef = useRef<THREE.Group>(new THREE.Group());
  const hazardsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const hoverIndicatorRef = useRef<THREE.Mesh | null>(null);

  // Tooltip HUD for hover coordinates
  const [hoverInfo, setHoverInfo] = useState<{ x: number; z: number; elev: number; slope: number; screenX: number; screenY: number } | null>(null);

  // Selected Marker Card
  const [selectedMarker, setSelectedMarker] = useState<Plotted3DMarker | null>(null);

  // Pointer drag tracking
  const pointerDownPos = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const lastHoverTime = useRef<number>(0);

  // 1. Initialize Scene, Camera, Renderer, Controls
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.FogExp2(0x0e1726, 0.003);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.5, 2500);
    camera.position.set(0, 50, 70);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 6;
    controls.maxDistance = 250;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Atmospheric Dome
    const skyGeo = new THREE.SphereGeometry(600, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uDaylight: { value: 1.0 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform vec3 uSunDir;
        uniform float uDaylight;
        varying vec3 vWorldPosition;
        void main() {
          vec3 dir = normalize(vWorldPosition);
          float elevation = max(0.0, dir.y);
          vec3 dayHorizon = vec3(0.85, 0.52, 0.35);
          vec3 dayZenith = vec3(0.55, 0.30, 0.18);
          vec3 nightSky = vec3(0.02, 0.03, 0.06);
          
          vec3 dayColor = mix(dayHorizon, dayZenith, pow(elevation, 0.6));
          vec3 finalColor = mix(nightSky, dayColor, uDaylight);
          
          float sunDot = max(0.0, dot(dir, normalize(uSunDir)));
          vec3 sunsetBlue = vec3(0.2, 0.5, 0.85) * pow(sunDot, 12.0) * (1.0 - elevation * 0.8);
          finalColor += sunsetBlue * 0.7;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);
    skyMeshRef.current = skyMesh;

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xd48b5c, 0x4a2312, 0.65);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 2.0);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 5;
    dirLight.shadow.camera.far = 300;
    dirLight.shadow.camera.left = -60;
    dirLight.shadow.camera.right = 60;
    dirLight.shadow.camera.top = 60;
    dirLight.shadow.camera.bottom = -60;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    scene.add(dirLight.target);
    sunLightRef.current = dirLight;

    // Add Groups for dynamic elements
    scene.add(routeGroupRef.current);
    scene.add(pinsGroupRef.current);
    scene.add(losGroupRef.current);
    scene.add(sqlMarkersGroupRef.current);
    scene.add(hazardsGroupRef.current);
    scene.add(globeGroupRef.current);

    // Hover marker on route
    const hoverGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const hoverMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, wireframe: true });
    const hoverMesh = new THREE.Mesh(hoverGeo, hoverMat);
    hoverMesh.visible = false;
    scene.add(hoverMesh);
    hoverIndicatorRef.current = hoverMesh;

    // Build Planetary Globe (Mars 3D Sphere)
    buildMarsGlobe(globeGroupRef.current);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (terrainMaterialRef.current) {
        terrainMaterialRef.current.uniforms.uTime.value = elapsedTime;
      }

      // Rotate planet sphere slowly in Globe view
      if (globeGroupRef.current.visible) {
        globeGroupRef.current.rotation.y = elapsedTime * 0.04;
      }

      // Rotate pulse rings on SQL markers
      sqlMarkersGroupRef.current.children.forEach(group => {
        const ring = group.children[1];
        if (ring) {
          ring.rotation.z = elapsedTime * 0.8;
          const s = 1.0 + Math.sin(elapsedTime * 3.0) * 0.15;
          ring.scale.set(s, s, s);
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Build Procedural Mars 3D Globe with iconic landmarks
  const buildMarsGlobe = (group: THREE.Group) => {
    while (group.children.length > 0) group.remove(group.children[0]);

    // Mars Sphere (radius 22)
    const globeGeo = new THREE.SphereGeometry(22, 64, 64);
    const globeMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform vec3 uSunDir;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec2 vUv;

        float hashGlobe(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noiseGlobe(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hashGlobe(i + vec2(0.0,0.0)), hashGlobe(i + vec2(1.0,0.0)), u.x),
                     mix(hashGlobe(i + vec2(0.0,1.0)), hashGlobe(i + vec2(1.0,1.0)), u.x), u.y);
        }

        void main() {
          vec3 norm = normalize(vNormal);
          float light = max(0.08, dot(norm, normalize(uSunDir)));

          // Realistic Martian Colors
          vec3 rustBase = vec3(0.82, 0.38, 0.18);
          vec3 darkAlbedo = vec3(0.24, 0.15, 0.12);
          vec3 polarIce = vec3(0.95, 0.96, 0.98);

          // Multi-scale procedural noise
          float n = noiseGlobe(vUv * 12.0) * 0.6 + noiseGlobe(vUv * 36.0) * 0.3;
          vec3 col = mix(rustBase, darkAlbedo, smoothstep(0.42, 0.68, n));

          // Polar Caps (latitudes > 80 deg)
          float polarDist = abs(vUv.y - 0.5);
          if (polarDist > 0.42) {
            float iceFactor = smoothstep(0.42, 0.47, polarDist);
            col = mix(col, polarIce, iceFactor * 0.95);
          }

          // Valles Marineris canyon rift feature along equator
          float equatorDist = abs(vUv.y - 0.48);
          float canyonX = smoothstep(0.3, 0.6, vUv.x) * (1.0 - smoothstep(0.6, 0.75, vUv.x));
          if (equatorDist < 0.04 && canyonX > 0.2) {
            col = mix(col, vec3(0.12, 0.08, 0.06), canyonX * (1.0 - equatorDist / 0.04));
          }

          // Olympus Mons shield caldera spot (lat ~18N, lon ~226W -> Uv approx (0.62, 0.60))
          float distOlympus = length(vUv - vec2(0.62, 0.60));
          if (distOlympus < 0.05) {
            col = mix(col, vec3(0.92, 0.55, 0.32), 1.0 - distOlympus / 0.05);
          }

          // Atmospheric limb glow (blue twilight rim)
          float rim = 1.0 - max(0.0, dot(norm, vec3(0.0, 0.0, 1.0)));
          col += vec3(0.2, 0.45, 0.8) * pow(rim, 4.0) * 0.5;

          gl_FragColor = vec4(col * light, 1.0);
        }
      `
    });

    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    group.add(globeMesh);

    // Add Landing Site Pins onto Globe
    const landingSites: { name: string; sector: SectorId; lat: number; lon: number }[] = [
      { name: 'Jezero Crater (Perseverance)', sector: 'jezero', lat: 18.38, lon: 77.58 },
      { name: 'Gale Crater (Curiosity)', sector: 'gale', lat: -5.4, lon: 137.8 },
      { name: 'Olympus Mons Caldera', sector: 'olympus', lat: 18.65, lon: -133.8 },
      { name: 'Valles Marineris Chasma', sector: 'valles', lat: -13.9, lon: -59.2 }
    ];

    landingSites.forEach(site => {
      const phi = (90 - site.lat) * (Math.PI / 180);
      const theta = (site.lon + 180) * (Math.PI / 180);
      const r = 22.4;

      const px = -(r * Math.sin(phi) * Math.cos(theta));
      const py = r * Math.cos(phi);
      const pz = r * Math.sin(phi) * Math.sin(theta);

      const beaconGeo = new THREE.SphereGeometry(0.6, 12, 12);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0x00f2fe,
        emissive: 0x00f2fe,
        emissiveIntensity: 1.0
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(px, py, pz);
      beacon.userData = { sector: site.sector, name: site.name };
      group.add(beacon);

      // Radar ring
      const ringGeo = new THREE.RingGeometry(0.8, 1.3, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(px, py, pz);
      ring.lookAt(0, 0, 0);
      group.add(ring);
    });

    group.visible = false; // default is tactical DEM
  };

  // Switch between Tactical 3D DEM and Planetary 3D Globe
  useEffect(() => {
    if (!globeGroupRef.current || !terrainMeshRef.current || !cameraRef.current || !controlsRef.current) return;

    if (viewMode === 'globe') {
      globeGroupRef.current.visible = true;
      terrainMeshRef.current.visible = false;
      routeGroupRef.current.visible = false;
      pinsGroupRef.current.visible = false;
      losGroupRef.current.visible = false;
      sqlMarkersGroupRef.current.visible = false;
      hazardsGroupRef.current.visible = false;

      controlsRef.current.maxPolarAngle = Math.PI;
      cameraRef.current.position.set(0, 15, 60);
      controlsRef.current.target.set(0, 0, 0);
    } else {
      globeGroupRef.current.visible = false;
      terrainMeshRef.current.visible = true;
      routeGroupRef.current.visible = true;
      pinsGroupRef.current.visible = true;
      losGroupRef.current.visible = true;
      sqlMarkersGroupRef.current.visible = true;
      hazardsGroupRef.current.visible = true;

      controlsRef.current.maxPolarAngle = Math.PI / 2 - 0.05;
      cameraRef.current.position.set(0, 50, 70);
      controlsRef.current.target.set(0, 0, 0);
    }
  }, [viewMode]);

  // 2. Build or Rebuild Martian Terrain DEM Mesh whenever sector changes
  useEffect(() => {
    if (!sceneRef.current) return;

    if (terrainMeshRef.current) {
      sceneRef.current.remove(terrainMeshRef.current);
      terrainMeshRef.current.geometry.dispose();
      terrainMeshRef.current = null;
    }

    const gridSegments = 160;
    const size = 100;
    const geom = new THREE.PlaneGeometry(size, size, gridSegments, gridSegments);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const elevScale = 0.015;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const rawElev = getElevation(x, z, sector);
      const baseElev = SECTORS[sector].baseCampElevation;
      const relativeElev = (rawElev - baseElev) * elevScale;
      pos.setY(i, relativeElev);
    }
    geom.computeVertexNormals();

    // Rock-Solid Martian Shader with guaranteed GLSL precision qualifiers
    const terrainMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uActiveLayer: { value: 0 },
        uOpticalOpacity: { value: 1.0 },
        uTopoOpacity: { value: 1.0 },
        uThermalOpacity: { value: 1.0 },
        uSpectralOpacity: { value: 1.0 },
        uAtmosphericOpacity: { value: 1.0 },
        uShowContours: { value: true },
        uShowGrid: { value: true },
        uWireframe: { value: false },
        uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
        uDaylight: { value: 1.0 }
      },
      wireframe: layerState.wireframe,
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        precision highp int;

        uniform float uTime;
        uniform int uActiveLayer;
        uniform float uOpticalOpacity;
        uniform float uTopoOpacity;
        uniform float uThermalOpacity;
        uniform float uSpectralOpacity;
        uniform float uAtmosphericOpacity;
        uniform bool uShowContours;
        uniform bool uShowGrid;
        uniform vec3 uSunDir;
        uniform float uDaylight;

        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;

        float hash2(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise2(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash2(i + vec2(0.0,0.0)), hash2(i + vec2(1.0,0.0)), u.x),
                     mix(hash2(i + vec2(0.0,1.0)), hash2(i + vec2(1.0,1.0)), u.x), u.y);
        }

        vec3 getTopoColor(float elev) {
          float t = clamp((elev + 10.0) / 45.0, 0.0, 1.0);
          vec3 c1 = vec3(0.05, 0.15, 0.55);
          vec3 c2 = vec3(0.0, 0.75, 0.85);
          vec3 c3 = vec3(0.1, 0.8, 0.3);
          vec3 c4 = vec3(0.95, 0.85, 0.15);
          vec3 c5 = vec3(0.9, 0.35, 0.05);
          vec3 c6 = vec3(0.85, 0.05, 0.1);
          vec3 c7 = vec3(0.98, 0.98, 0.98);

          if (t < 0.15) return mix(c1, c2, t / 0.15);
          if (t < 0.35) return mix(c2, c3, (t - 0.15) / 0.20);
          if (t < 0.55) return mix(c3, c4, (t - 0.35) / 0.20);
          if (t < 0.75) return mix(c4, c5, (t - 0.55) / 0.20);
          if (t < 0.90) return mix(c5, c6, (t - 0.75) / 0.15);
          return mix(c6, c7, (t - 0.90) / 0.10);
        }

        vec3 getThermalColor(float tempK) {
          float t = clamp((tempK - 140.0) / 140.0, 0.0, 1.0);
          vec3 cCold = vec3(0.08, 0.05, 0.35);
          vec3 cMid1 = vec3(0.35, 0.08, 0.55);
          vec3 cMid2 = vec3(0.85, 0.35, 0.05);
          vec3 cWarm = vec3(1.0, 0.95, 0.4);
          
          if (t < 0.3) return mix(cCold, cMid1, t / 0.3);
          if (t < 0.7) return mix(cMid1, cMid2, (t - 0.3) / 0.4);
          return mix(cMid2, cWarm, (t - 0.7) / 0.3);
        }

        vec3 getSpectralColor(vec2 coord, float elev) {
          float n1 = noise2(coord * 0.15);
          float n2 = noise2(coord * 0.08 + vec2(5.2, 3.1));

          vec3 basalt = vec3(0.18, 0.15, 0.28);
          vec3 hydratedSilica = vec3(0.0, 0.95, 1.0);
          vec3 hematite = vec3(0.85, 0.22, 0.1);
          vec3 gypsum = vec3(0.95, 0.85, 0.3);

          if (n1 > 0.62) return hydratedSilica;
          if (n2 > 0.65) return gypsum;
          if (n1 > 0.42) return hematite;
          return basalt;
        }

        void main() {
          vec3 norm = normalize(vNormal);
          float elev = vWorldPosition.y;
          vec2 coord = vWorldPosition.xz;

          float NdotL = max(0.08, dot(norm, normalize(uSunDir)));
          float lightFactor = NdotL * (0.2 + 0.8 * uDaylight);

          // Photorealistic Martian Regolith
          float micro = noise2(coord * 0.8) * 0.2 + noise2(coord * 3.0) * 0.08;
          vec3 rustLight = vec3(0.82, 0.38, 0.18);
          vec3 rustDark = vec3(0.48, 0.18, 0.08);
          vec3 basaltSand = vec3(0.18, 0.12, 0.10);
          
          float slope = 1.0 - norm.y;
          vec3 regolith = mix(rustLight, rustDark, micro);
          if (slope > 0.35) regolith = mix(regolith, basaltSand, 0.6);
          vec3 opticalColor = regolith * lightFactor;

          vec3 topoColor = getTopoColor(elev);

          // Isohypse Contours without hardware fwidth dependency
          if (uShowContours) {
            float contourInterval = 1.2;
            float f = abs(fract(elev / contourInterval - 0.5) - 0.5);
            float line = smoothstep(0.06, 0.0, f);
            topoColor = mix(topoColor, vec3(0.0, 0.0, 0.0), line * 0.55);
          }

          float estimatedTemp = 180.0 + NdotL * 70.0 - elev * 1.8;
          vec3 thermalColor = getThermalColor(estimatedTemp);
          vec3 spectralColor = getSpectralColor(coord, elev);

          // Atmospheric / Dust Storm
          vec2 stormCenter = vec2(18.0, -10.0);
          float distToStorm = length(coord - stormCenter);
          float swirlAngle = uTime * 0.5 + distToStorm * 0.4;
          vec2 rotatedCoord = vec2(
            cos(swirlAngle) * (coord.x - stormCenter.x) - sin(swirlAngle) * (coord.y - stormCenter.y),
            sin(swirlAngle) * (coord.x - stormCenter.x) + cos(swirlAngle) * (coord.y - stormCenter.y)
          );
          float dustTurbulence = noise2(rotatedCoord * 0.2 + uTime * 0.3);
          float stormMask = smoothstep(16.0, 2.0, distToStorm);
          vec3 dustColor = vec3(0.92, 0.55, 0.28) * (0.8 + 0.4 * dustTurbulence);

          vec3 finalColor = opticalColor;

          if (uActiveLayer == 1) {
            finalColor = mix(opticalColor, topoColor * (0.35 + 0.65 * lightFactor), uTopoOpacity);
          } else if (uActiveLayer == 2) {
            finalColor = mix(opticalColor, thermalColor, uThermalOpacity);
          } else if (uActiveLayer == 3) {
            finalColor = mix(opticalColor, spectralColor * (0.4 + 0.6 * lightFactor), uSpectralOpacity);
          } else if (uActiveLayer == 4) {
            vec3 stormOverlay = mix(opticalColor, dustColor, stormMask * 0.85);
            finalColor = mix(opticalColor, stormOverlay, uAtmosphericOpacity);
          }

          // Coordinate Grid lines
          if (uShowGrid) {
            vec2 grid = abs(fract(coord * 0.2 - 0.5) - 0.5);
            float gridLine = smoothstep(0.04, 0.0, min(grid.x, grid.y));
            finalColor += vec3(0.0, 0.8, 1.0) * gridLine * 0.25;
          }

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const mesh = new THREE.Mesh(geom, terrainMaterial);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    sceneRef.current.add(mesh);
    terrainMeshRef.current = mesh;
    terrainMaterialRef.current = terrainMaterial;

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
    }
  }, [sector]);

  // 3. Update Shader Uniforms
  useEffect(() => {
    if (!terrainMaterialRef.current || !sunLightRef.current || !skyMeshRef.current) return;

    const layerMap: Record<string, number> = {
      optical: 0,
      topographic: 1,
      thermal: 2,
      spectral: 3,
      atmospheric: 4
    };

    const activeIdx = layerMap[layerState.activeLayer] ?? 0;
    const mat = terrainMaterialRef.current;
    mat.uniforms.uActiveLayer.value = activeIdx;
    mat.uniforms.uOpticalOpacity.value = layerState.opticalOpacity;
    mat.uniforms.uTopoOpacity.value = layerState.topoOpacity;
    mat.uniforms.uThermalOpacity.value = layerState.thermalOpacity;
    mat.uniforms.uSpectralOpacity.value = layerState.spectralOpacity;
    mat.uniforms.uAtmosphericOpacity.value = layerState.atmosphericOpacity;
    mat.uniforms.uShowContours.value = layerState.showContours;
    mat.uniforms.uShowGrid.value = layerState.showGrid;
    mat.wireframe = layerState.wireframe;

    const solar = getSolarState(solHour, solDay, sector);
    const sunPos = new THREE.Vector3(
      solar.sunDirection[0] * 120,
      solar.sunDirection[1] * 120,
      solar.sunDirection[2] * 120
    );
    sunLightRef.current.position.copy(sunPos);
    sunLightRef.current.intensity = solar.isDaylight ? 1.8 : 0.05;

    const sunDirNorm = new THREE.Vector3().fromArray(solar.sunDirection).normalize();
    mat.uniforms.uSunDir.value.copy(sunDirNorm);
    mat.uniforms.uDaylight.value = solar.isDaylight ? 1.0 : 0.0;

    const skyMat = skyMeshRef.current.material as THREE.ShaderMaterial;
    if (skyMat.uniforms) {
      skyMat.uniforms.uSunDir.value.copy(sunDirNorm);
      skyMat.uniforms.uDaylight.value = solar.isDaylight ? 1.0 : 0.0;
    }
  }, [layerState, solHour, solDay, sector]);

  // 4. Render Dynamic Hazards
  useEffect(() => {
    const group = hazardsGroupRef.current;
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    const elevScale = 0.015;
    const baseElev = SECTORS[sector].baseCampElevation;

    hazards.forEach(hazard => {
      const hElev = (getElevation(hazard.x, hazard.z, sector) - baseElev) * elevScale;

      const ringRadius = (hazard.radius_km / SECTORS[sector].scaleKm) * 100 * 0.45;
      const ringGeo = new THREE.RingGeometry(ringRadius * 0.85, ringRadius, 32);
      ringGeo.rotateX(-Math.PI / 2);

      let ringColor = 0xf59e0b;
      if (hazard.severity === 'critical') ringColor = 0xef4444;
      else if (hazard.type === 'cold_trap') ringColor = 0x06b6d4;

      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(hazard.x, hElev + 0.2, hazard.z);
      group.add(ringMesh);

      const cylGeo = new THREE.CylinderGeometry(0.3, 0.3, 6, 8);
      const cylMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.6
      });
      const cylMesh = new THREE.Mesh(cylGeo, cylMat);
      cylMesh.position.set(hazard.x, hElev + 3, hazard.z);
      group.add(cylMesh);
    });
  }, [hazards, sector]);

  // 5. Render SQL Markers with UserData
  useEffect(() => {
    const group = sqlMarkersGroupRef.current;
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    const elevScale = 0.015;
    const baseElev = SECTORS[sector].baseCampElevation;

    sqlMarkers.forEach(m => {
      const y = (getElevation(m.x, m.z, sector) - baseElev) * elevScale;
      const markerGroup = new THREE.Group();
      markerGroup.position.set(m.x, y, m.z);
      markerGroup.userData = { marker: m };

      const colorHex = parseInt((m.color || '#00f2fe').replace('#', '0x'), 16) || 0x00f2fe;

      const sphereGeo = new THREE.SphereGeometry(0.85, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.8,
        roughness: 0.2
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.y = 1.6;
      sphere.userData = { marker: m };
      markerGroup.add(sphere);

      const ringGeo = new THREE.RingGeometry(1.2, 1.8, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.15;
      markerGroup.add(ring);

      const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.6, 8);
      const poleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 0.8;
      markerGroup.add(pole);

      group.add(markerGroup);
    });
  }, [sqlMarkers, sector]);

  // 6. Render Colored Route Ribbon, Waypoint Pins, and LOS Beams
  useEffect(() => {
    const routeGroup = routeGroupRef.current;
    const pinsGroup = pinsGroupRef.current;
    const losGroup = losGroupRef.current;

    while (routeGroup.children.length > 0) routeGroup.remove(routeGroup.children[0]);
    while (pinsGroup.children.length > 0) pinsGroup.remove(pinsGroup.children[0]);
    while (losGroup.children.length > 0) losGroup.remove(losGroup.children[0]);

    const elevScale = 0.015;
    const baseElev = SECTORS[sector].baseCampElevation;

    // A. Render Colored Route Ribbon
    if (routeData.pathPoints.length > 1) {
      const curvePoints: THREE.Vector3[] = [];

      for (let i = 0; i < routeData.pathPoints.length; i++) {
        const pt = routeData.pathPoints[i];
        const y = (getElevation(pt.x, pt.z, sector) - baseElev) * elevScale + 0.35;
        const newVec = new THREE.Vector3(pt.x, y, pt.z);

        if (curvePoints.length === 0 || curvePoints[curvePoints.length - 1].distanceToSquared(newVec) > 0.04) {
          curvePoints.push(newVec);
        }
      }

      if (curvePoints.length > 1) {
        const curve = new THREE.CatmullRomCurve3(curvePoints);
        const tubularSegments = Math.min(routeData.pathPoints.length * 2, 350);
        const radialSegments = 8;
        const tubeGeo = new THREE.TubeGeometry(curve, tubularSegments, 0.28, radialSegments, false);

        const numVertices = (tubularSegments + 1) * (radialSegments + 1);
        const colorAttr = new Float32Array(numVertices * 3);

        for (let i = 0; i <= tubularSegments; i++) {
          const t = i / tubularSegments;
          const ptIdx = Math.min(routeData.pathPoints.length - 1, Math.floor(t * routeData.pathPoints.length));
          const pt = routeData.pathPoints[ptIdx];

          let r = 0.0;
          let g = 0.95;
          let b = 1.0;

          if (pt.slopeDeg > 15.0) {
            r = 0.94;
            g = 0.27;
            b = 0.27;
          } else if (pt.slopeDeg > 8.0) {
            r = 0.96;
            g = 0.62;
            b = 0.07;
          }

          for (let j = 0; j <= radialSegments; j++) {
            const vIdx = (i * (radialSegments + 1) + j) * 3;
            colorAttr[vIdx] = r;
            colorAttr[vIdx + 1] = g;
            colorAttr[vIdx + 2] = b;
          }
        }
        tubeGeo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));

        const tubeMat = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.25,
          metalness: 0.2,
          emissive: 0x112233,
          emissiveIntensity: 0.3
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.castShadow = true;
        routeGroup.add(tubeMesh);
      }
    }

    // B. Render Waypoint Pins
    routeData.waypoints.forEach((wp, idx) => {
      const y = (getElevation(wp.x, wp.z, sector) - baseElev) * elevScale;
      const pinGroup = new THREE.Group();
      pinGroup.position.set(wp.x, y, wp.z);
      pinGroup.userData = { waypoint: wp };

      const isStart = idx === 0;
      const isEnd = idx === routeData.waypoints.length - 1 && routeData.waypoints.length > 1;

      let pinColor = 0x00f2fe;
      if (isStart) pinColor = 0x10b981;
      if (isEnd) pinColor = 0xec4899;

      const octGeo = new THREE.OctahedronGeometry(isStart || isEnd ? 1.4 : 1.0, 0);
      const octMat = new THREE.MeshStandardMaterial({
        color: pinColor,
        emissive: pinColor,
        emissiveIntensity: 0.8,
        wireframe: false
      });
      const octMesh = new THREE.Mesh(octGeo, octMat);
      octMesh.position.y = 3.5;
      pinGroup.add(octMesh);

      const mastGeo = new THREE.CylinderGeometry(0.1, 0.15, 3.5, 8);
      const mastMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const mastMesh = new THREE.Mesh(mastGeo, mastMat);
      mastMesh.position.y = 1.75;
      pinGroup.add(mastMesh);

      const ringGeo = new THREE.RingGeometry(0.8, 1.3, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: pinColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.1;
      pinGroup.add(ringMesh);

      pinsGroup.add(pinGroup);
    });

    // C. Line-of-Sight (LOS) Comms Radio Beams
    if (routeData.waypoints.length > 0 && routeData.pathPoints.length > 1) {
      const baseCamp = routeData.waypoints[0];
      const baseY = (getElevation(baseCamp.x, baseCamp.z, sector) - baseElev) * elevScale + (25.0 * elevScale);

      for (let i = 4; i < routeData.pathPoints.length; i += 8) {
        const pt = routeData.pathPoints[i];
        const ptY = (getElevation(pt.x, pt.z, sector) - baseElev) * elevScale + 0.8;

        const losGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(baseCamp.x, baseY, baseCamp.z),
          new THREE.Vector3(pt.x, ptY, pt.z)
        ]);

        const losColor = pt.losClear ? 0x10b981 : 0xef4444;
        const losMat = new THREE.LineBasicMaterial({
          color: losColor,
          transparent: true,
          opacity: pt.losClear ? 0.35 : 0.75
        });
        const losLine = new THREE.Line(losGeo, losMat);
        losGroup.add(losLine);
      }
    }
  }, [routeData, sector]);

  // 7. Update Synchronized Hover Marker on Route Cross-section
  useEffect(() => {
    if (!hoverIndicatorRef.current) return;
    if (hoveredRouteIndex !== null && hoveredRouteIndex !== undefined && routeData.pathPoints[hoveredRouteIndex]) {
      const pt = routeData.pathPoints[hoveredRouteIndex];
      const baseElev = SECTORS[sector].baseCampElevation;
      const y = (getElevation(pt.x, pt.z, sector) - baseElev) * 0.015 + 0.6;
      hoverIndicatorRef.current.position.set(pt.x, y, pt.z);
      hoverIndicatorRef.current.visible = true;
    } else {
      hoverIndicatorRef.current.visible = false;
    }
  }, [hoveredRouteIndex, routeData, sector]);

  // 8. Surface Interaction & Raycasting
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !cameraRef.current) return;

    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    if (Math.hypot(dx, dy) > 6) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    // If in Globe view: Check if user clicked a Landing Site beacon
    if (viewMode === 'globe' && globeGroupRef.current) {
      const globeHits = raycaster.intersectObjects(globeGroupRef.current.children, true);
      if (globeHits.length > 0) {
        let obj: THREE.Object3D | null = globeHits[0].object;
        while (obj && !obj.userData?.sector) {
          obj = obj.parent;
        }
        if (obj && obj.userData?.sector) {
          missionAudio.playClick();
          if (onSelectSector) onSelectSector(obj.userData.sector);
          setViewMode('tactical');
          return;
        }
      }
    }

    // Check if user clicked an SQL Marker
    const markerHits = raycaster.intersectObjects(sqlMarkersGroupRef.current.children, true);
    if (markerHits.length > 0) {
      let obj: THREE.Object3D | null = markerHits[0].object;
      while (obj && !obj.userData?.marker) {
        obj = obj.parent;
      }
      if (obj && obj.userData?.marker) {
        missionAudio.playClick();
        setSelectedMarker(obj.userData.marker);
        if (onSelectMarker) onSelectMarker(obj.userData.marker);
        return;
      }
    }

    // If in Pin Dropping Mode: Raycast terrain
    if (activePinMode !== 'none' && terrainMeshRef.current && viewMode === 'tactical') {
      const terrainHits = raycaster.intersectObject(terrainMeshRef.current);
      if (terrainHits.length > 0) {
        const hit = terrainHits[0].point;
        const elev = getElevation(hit.x, hit.z, sector);

        let wpName = `WP-${routeData.waypoints.length + 1}`;
        let isBase = false;
        let isObj = false;

        if (activePinMode === 'start') {
          wpName = 'Base Camp Alpha';
          isBase = true;
        } else if (activePinMode === 'end') {
          wpName = 'Objective Delta';
          isObj = true;
        }

        missionAudio.playClick();
        onAddWaypoint({
          id: `WP-${Date.now().toString(36)}`,
          name: wpName,
          x: Number(hit.x.toFixed(1)),
          z: Number(hit.z.toFixed(1)),
          elevation: Math.round(elev),
          isBaseCamp: isBase,
          isObjective: isObj
        });
        return;
      }
    }

    setSelectedMarker(null);
    if (onSelectMarker) onSelectMarker(null);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const now = Date.now();
    if (now - lastHoverTime.current < 45) return;
    lastHoverTime.current = now;

    if (!canvasRef.current || !cameraRef.current || !terrainMeshRef.current || viewMode !== 'tactical') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObject(terrainMeshRef.current);
    if (intersects.length > 0) {
      const hit = intersects[0].point;
      const elev = getElevation(hit.x, hit.z, sector);
      const slope = getSlope(hit.x, hit.z, sector);
      setHoverInfo({
        x: Number(hit.x.toFixed(1)),
        z: Number(hit.z.toFixed(1)),
        elev: Math.round(elev),
        slope: Number(slope.toFixed(1)),
        screenX: e.clientX,
        screenY: e.clientY
      });
    } else {
      setHoverInfo(null);
    }
  };

  const resetCamera = () => {
    missionAudio.playClick();
    if (controlsRef.current && cameraRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      if (viewMode === 'globe') {
        cameraRef.current.position.set(0, 15, 60);
      } else {
        cameraRef.current.position.set(0, 50, 70);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverInfo(null)}
        className={`w-full h-full block ${activePinMode !== 'none' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      />

      {/* View Mode Switcher: 3D Globe vs Tactical Surface DEM */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 p-1 rounded-xl bg-slate-950/85 border border-cyan-500/40 shadow-cyan-glow backdrop-blur-md">
        <button
          onClick={() => {
            setViewMode('tactical');
            missionAudio.playClick();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${
            viewMode === 'tactical'
              ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>TACTICAL SURFACE (3D DEM)</span>
        </button>

        <button
          onClick={() => {
            setViewMode('globe');
            missionAudio.playClick();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${
            viewMode === 'globe'
              ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>PLANETARY GLOBE (3D SPHERE)</span>
        </button>

        <button
          onClick={resetCamera}
          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"
          title="Reset Camera View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Hover Telemetry HUD Tooltip */}
      {hoverInfo && !selectedMarker && viewMode === 'tactical' && (
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-16 px-3 py-1.5 rounded bg-slate-950/85 border border-cyan-500/40 text-[11px] font-mono text-slate-200 shadow-lg backdrop-blur-md"
          style={{ left: hoverInfo.screenX, top: hoverInfo.screenY }}
        >
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-semibold">COORDS: [{hoverInfo.x}, {hoverInfo.z}]</span>
            <span className="text-slate-400">ELEV: <strong className="text-slate-100">{hoverInfo.elev}m</strong></span>
            <span className={hoverInfo.slope > 15 ? 'text-rose-400 font-bold' : hoverInfo.slope > 8 ? 'text-amber-400' : 'text-emerald-400'}>
              SLOPE: {hoverInfo.slope}°
            </span>
          </div>
        </div>
      )}

      {/* Interactive Selected Marker Card */}
      {selectedMarker && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 z-30 w-80 bg-slate-950/90 border border-cyan-400/60 rounded-xl p-3.5 shadow-cyan-glow backdrop-blur-md text-slate-200">
          <div className="flex items-start justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedMarker.color }} />
              <h3 className="font-mono text-xs font-bold text-white tracking-wide">{selectedMarker.name}</h3>
            </div>
            <button
              onClick={() => setSelectedMarker(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2.5 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>TYPE:</span>
              <span className="text-cyan-300 uppercase font-semibold">{selectedMarker.type}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>COORDINATES:</span>
              <span className="text-white font-bold">[{selectedMarker.x}, {selectedMarker.z}]</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>ELEVATION:</span>
              <span className="text-cyan-300">{selectedMarker.elevation}m</span>
            </div>
            {selectedMarker.details && (
              <p className="mt-2 p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-sans text-slate-300">
                {selectedMarker.details}
              </p>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 font-mono text-[11px]">
            <button
              onClick={() => {
                onAddWaypoint({
                  id: `WP-${Date.now().toString(36)}`,
                  name: selectedMarker.name,
                  x: selectedMarker.x,
                  z: selectedMarker.z,
                  elevation: selectedMarker.elevation,
                  isObjective: true
                });
                setSelectedMarker(null);
                missionAudio.playClick();
              }}
              className="py-1.5 px-2 rounded bg-pink-950/80 hover:bg-pink-900 border border-pink-500/50 text-pink-300 flex items-center justify-center gap-1 transition-colors"
            >
              <Target className="w-3.5 h-3.5" />
              <span>SET TARGET</span>
            </button>

            <button
              onClick={() => {
                onAddWaypoint({
                  id: `WP-${Date.now().toString(36)}`,
                  name: selectedMarker.name,
                  x: selectedMarker.x,
                  z: selectedMarker.z,
                  elevation: selectedMarker.elevation
                });
                setSelectedMarker(null);
                missionAudio.playClick();
              }}
              className="py-1.5 px-2 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ WAYPOINT</span>
            </button>
          </div>
        </div>
      )}

      {/* 3D Viewport Controls & Scale Indicator */}
      <div className="absolute bottom-6 left-6 z-10 flex items-center gap-4 text-xs font-mono text-slate-400 pointer-events-none">
        <div className="px-3 py-1.5 rounded bg-slate-900/80 border border-slate-700/60 backdrop-blur-sm flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span>{viewMode === 'globe' ? 'MARS SPHERICAL RADIUS: 3,389.5 KM' : `GRID SCALE: 1 UNIT ≈ ${(SECTORS[sector].scaleKm * 10).toFixed(0)}m`}</span>
        </div>
        <div className="px-3 py-1.5 rounded bg-slate-900/80 border border-slate-700/60 backdrop-blur-sm">
          <span>ORBIT: L-CLICK + DRAG | PAN: R-CLICK | ZOOM: WHEEL</span>
        </div>
      </div>
    </div>
  );
};
