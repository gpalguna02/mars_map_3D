import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

export function latLonToVector3(lat, lon, radius = 2.0) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function createProceduralMarsTextures() {
  const width = 2048;
  const height = 1024;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0.0, '#42160d');
  grad.addColorStop(0.3, '#bf4722');
  grad.addColorStop(0.5, '#962b10');
  grad.addColorStop(0.7, '#661b0c');
  grad.addColorStop(1.0, '#360f08');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(25, 12, 10, 0.45)';
  ctx.beginPath();
  ctx.ellipse(width * 0.72, height * 0.48, 140, 90, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(18, 8, 8, 0.8)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(width * 0.33, height * 0.58);
  ctx.bezierCurveTo(width * 0.40, height * 0.59, width * 0.46, height * 0.56, width * 0.52, height * 0.58);
  ctx.stroke();

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d');
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, width, height);

  const oGrad = bCtx.createRadialGradient(width * 0.28, height * 0.40, 5, width * 0.28, height * 0.40, 60);
  oGrad.addColorStop(0, '#ffffff');
  oGrad.addColorStop(1, '#808080');
  bCtx.fillStyle = oGrad;
  bCtx.beginPath();
  bCtx.arc(width * 0.28, height * 0.40, 60, 0, Math.PI * 2);
  bCtx.fill();

  for (let i = 0; i < 90; i++) {
    const cx = (Math.sin(i * 99) * 0.5 + 0.5) * width;
    const cy = (Math.cos(i * 33) * 0.5 + 0.5) * height;
    const cr = (i % 7) * 4 + 6;
    const cGrad = bCtx.createRadialGradient(cx, cy, 2, cx, cy, cr);
    cGrad.addColorStop(0, '#303030');
    cGrad.addColorStop(0.7, '#505050');
    cGrad.addColorStop(0.85, '#e0e0e0');
    cGrad.addColorStop(1, '#808080');
    bCtx.fillStyle = cGrad;
    bCtx.beginPath();
    bCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    bCtx.fill();
  }

  const colorTexture = new THREE.CanvasTexture(colorCanvas);
  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
  return { colorTexture, bumpTexture };
}

function MarsGlobe({ globeRadius = 2.0 }) {
  const meshRef = useRef();
  const { colorTexture, bumpTexture } = useMemo(() => createProceduralMarsTextures(), []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh receiveShadow castShadow>
        <sphereGeometry args={[globeRadius, 64, 64]} />
        <meshStandardMaterial
          map={colorTexture}
          bumpMap={bumpTexture}
          bumpScale={0.06}
          roughness={0.88}
          metalness={0.08}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[globeRadius * 1.018, 64, 64]} />
        <meshBasicMaterial
          color="#ff7043"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function GeologyMarker({ feature, globeRadius }) {
  const position = useMemo(
    () => latLonToVector3(feature.latitude, feature.longitude, globeRadius * 1.015),
    [feature, globeRadius]
  );

  const isDeposit = feature.feature_type === 'mineral_deposit';
  const markerColor = isDeposit ? '#00e5ff' : '#ff9100';

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.004, 0.018, 0.08, 8]} />
        <meshBasicMaterial color={markerColor} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.022, 16, 16]} />
        <meshStandardMaterial color={markerColor} emissive={markerColor} emissiveIntensity={0.8} />
      </mesh>
      <Billboard position={[0, 0.12, 0]}>
        <Text fontSize={0.045} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.005} outlineColor="#000000">
          {feature.name}
        </Text>
      </Billboard>
    </group>
  );
}

function ImageMarker({ img, globeRadius, onSelect }) {
  const position = useMemo(
    () => latLonToVector3(img.latitude, img.longitude, globeRadius * 1.02),
    [img, globeRadius]
  );

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onSelect(img); }}>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.04, 0.03, 0.015]} />
        <meshStandardMaterial color="#00e676" emissive="#00e676" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 0.04, 0.01]}>
        <sphereGeometry args={[0.01, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <Billboard position={[0, 0.11, 0]}>
        <Text fontSize={0.04} color="#69f0ae" anchorX="center" anchorY="middle" outlineWidth={0.004} outlineColor="#000000">
          {`📷 Sol ${img.sol}`}
        </Text>
      </Billboard>
    </group>
  );
}

function RoutePolyline({ routePoints, globeRadius }) {
  const linePoints = useMemo(() => {
    if (!routePoints || routePoints.length === 0) return [];
    return routePoints.map((pt) => latLonToVector3(pt.lat, pt.lon, globeRadius * 1.008));
  }, [routePoints, globeRadius]);

  const geometry = useMemo(() => {
    if (linePoints.length < 2) return null;
    return new THREE.BufferGeometry().setFromPoints(linePoints);
  }, [linePoints]);

  if (!geometry) return null;

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#00e5ff" linewidth={3} />
    </line>
  );
}

export default function MapCanvas({
  solHour,
  geologyVisible,
  imagesVisible,
  routeVisible,
  geologyData,
  imagesData,
  routeData,
  onSelectImage,
}) {
  const globeRadius = 2.0;

  const sunPosition = useMemo(() => {
    const angle = (solHour / 24.66) * Math.PI * 2;
    const distance = 9.0;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = 3.5 * Math.sin(angle * 0.5);
    return [x, y, z];
  }, [solHour]);

  const sunColor = useMemo(() => {
    const normalizedHour = solHour % 24.66;
    if (normalizedHour < 5.0 || normalizedHour > 20.0) return '#263238';
    if (normalizedHour >= 5.0 && normalizedHour < 7.5) return '#ff8a65';
    if (normalizedHour >= 17.5 && normalizedHour <= 20.0) return '#ff7043';
    return '#fff3e0';
  }, [solHour]);

  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
      <Canvas
        camera={{ position: [0, 1.8, 4.4], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#080608']} />
        <Stars radius={100} depth={50} count={3500} factor={4} saturation={0.5} fade speed={0.4} />
        <ambientLight intensity={0.22} />
        <directionalLight
          position={sunPosition}
          intensity={1.75}
          color={sunColor}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <MarsGlobe globeRadius={globeRadius} />
        {geologyVisible &&
          geologyData.map((feat) => (
            <GeologyMarker key={feat.id} feature={feat} globeRadius={globeRadius} />
          ))}
        {imagesVisible &&
          imagesData.map((img) => (
            <ImageMarker
              key={img.id}
              img={img}
              globeRadius={globeRadius}
              onSelect={onSelectImage}
            />
          ))}
        {routeVisible && routeData && routeData.points && (
          <RoutePolyline routePoints={routeData.points} globeRadius={globeRadius} />
        )}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2.4}
          maxDistance={9.0}
          dampingFactor={0.06}
          rotateSpeed={0.8}
        />
      </Canvas>
    </div>
  );
}
