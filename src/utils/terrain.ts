import { SectorId, SectorInfo } from '../types';

export const SECTORS: Record<SectorId, SectorInfo> = {
  jezero: {
    id: 'jezero',
    name: 'Jezero Crater Delta',
    region: 'Syrtis Major Quadrangle (18.38°N, 77.58°E)',
    coordinates: '18°23\'N 77°35\'E',
    description: 'Ancient paleolake basin featuring a rich clay-mineral river delta, steep crater rim escarpments, and basaltic floor.',
    baseCampElevation: -2500,
    scaleKm: 30
  },
  gale: {
    id: 'gale',
    name: 'Gale Crater & Mt. Sharp',
    region: 'Aeolis Quadrangle (5.4°S, 137.8°E)',
    coordinates: '05°24\'S 137°48\'E',
    description: 'Landing site of Curiosity rover, dominated by Aeolis Mons rising 5.5 km from the crater floor with sulfate-bearing layers.',
    baseCampElevation: -4400,
    scaleKm: 35
  },
  olympus: {
    id: 'olympus',
    name: 'Olympus Mons Caldera Rim',
    region: 'Tharsis Rise (18.65°N, 226.2°E)',
    coordinates: '18°39\'N 133°48\'W',
    description: 'The solar system\'s highest volcano rim; towering lava cliff scarps exceeding 6-8 km vertical drop and smooth caldera steps.',
    baseCampElevation: 12000,
    scaleKm: 50
  },
  valles: {
    id: 'valles',
    name: 'Valles Marineris Chasma',
    region: 'Coprates Quadrangle (13.9°S, 59.2°W)',
    coordinates: '13°54\'S 59°12\'W',
    description: 'Vast tectonic fracture canyon complex, 7 km deep, featuring colossal scree slopes, layered bedrock, and dust dunes.',
    baseCampElevation: -3800,
    scaleKm: 45
  }
};

// Deterministic pseudo-random / hash function for reproducible procedural terrain
function hash(x: number, z: number): number {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

// 2D Smooth Noise
function smoothNoise(x: number, z: number): number {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const fx = x - i;
  const fz = z - j;

  // Cubic Hermite spline
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uz = fz * fz * (3.0 - 2.0 * fz);

  const a = hash(i, j);
  const b = hash(i + 1, j);
  const c = hash(i, j + 1);
  const d = hash(i + 1, j + 1);

  return a * (1 - ux) * (1 - uz) +
         b * ux * (1 - uz) +
         c * (1 - ux) * uz +
         d * ux * uz;
}

// Multi-octave Fractal Brownian Motion (fBM)
export function fbm(x: number, z: number, octaves = 5): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  for (let o = 0; o < octaves; o++) {
    value += amplitude * smoothNoise(x * frequency, z * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

/**
 * Calculates accurate Martian Digital Elevation Model (DEM) height in meters
 * Grid coordinates range from x: [-50, 50], z: [-50, 50]
 */
export function getElevation(x: number, z: number, sector: SectorId): number {
  const baseElev = SECTORS[sector].baseCampElevation;
  const distFromCenter = Math.sqrt(x * x + z * z);

  if (sector === 'jezero') {
    // Jezero Crater: large circular impact basin (radius ~35) with delta fan in the NW
    const craterRadius = 38.0;
    const rimWidth = 8.0;
    let craterProfile = 0;

    if (distFromCenter < craterRadius) {
      // Basin floor with gentle central ripple
      craterProfile = -400 + Math.pow(distFromCenter / craterRadius, 2.5) * 600;
    } else if (distFromCenter < craterRadius + rimWidth) {
      // Steep rim wall peaking at +750m
      const t = (distFromCenter - craterRadius) / rimWidth;
      craterProfile = 200 + Math.sin(t * Math.PI) * 750;
    } else {
      // Ejecta blanket tapering off
      const t = Math.min(1.0, (distFromCenter - (craterRadius + rimWidth)) / 20.0);
      craterProfile = (1 - t) * 350;
    }

    // River Delta Fan in the North-West (x: -18 to -5, z: -25 to -10)
    const deltaDist = Math.hypot(x - (-12), z - (-15));
    let deltaFan = 0;
    if (deltaDist < 16) {
      const deltaAngle = Math.atan2(z - (-15), x - (-12));
      const inWedge = deltaAngle > 0.4 && deltaAngle < 2.5;
      if (inWedge) {
        deltaFan = (1 - deltaDist / 16) * 320 * (1 + 0.3 * Math.sin(deltaDist * 1.5));
      }
    }

    // Secondary impact craters
    const c1 = Math.hypot(x - 15, z - 12);
    const c1Rim = c1 < 8 ? -220 * (1 - c1 / 8) + (c1 > 6 ? 120 : 0) : 0;

    const noise = (fbm(x * 0.08, z * 0.08, 5) - 0.5) * 280;
    return baseElev + craterProfile + deltaFan + c1Rim + noise;
  }

  if (sector === 'gale') {
    // Gale Crater: crater ring + massive central peak (Mt Sharp) at the center
    const mtSharpDist = Math.hypot(x - 5, z - 2);
    let mtSharp = 0;
    if (mtSharpDist < 25) {
      // Central mound rising up to +3500m above floor
      mtSharp = Math.cos((mtSharpDist / 25) * (Math.PI / 2)) * 3200;
      // Terrace layers
      mtSharp += Math.sin(mtSharpDist * 1.2) * 80;
    }

    // North crater rim wall at z: -35 to -45
    let northWall = 0;
    if (z < -25) {
      northWall = Math.pow(Math.abs(z - (-25)) / 20, 1.8) * 1600;
    }

    const noise = (fbm(x * 0.07, z * 0.07, 5) - 0.5) * 320;
    return baseElev + mtSharp + northWall + noise;
  }

  if (sector === 'olympus') {
    // Olympus Mons Rim: Colossal shield volcano escarpment (caldera drop)
    // Mega cliff scarp running diagonally from SW to NE
    const scarpDist = (x * 0.707 + z * 0.707);
    let cliff = 0;
    if (scarpDist < -5) {
      cliff = -4500; // Lower plains
    } else if (scarpDist < 10) {
      // Sheer vertical scarp cliff face
      const t = (scarpDist - (-5)) / 15;
      cliff = -4500 + Math.pow(t, 2) * 5200;
    } else {
      // High caldera plateau
      cliff = 700 + (scarpDist - 10) * 80;
    }

    // Lava tube trenches and collapse rilles
    const rille = Math.sin(x * 0.3 + Math.cos(z * 0.2) * 3) * 150;
    const noise = (fbm(x * 0.05, z * 0.05, 5) - 0.5) * 350;
    return baseElev + cliff + rille + noise;
  }

  if (sector === 'valles') {
    // Valles Marineris Chasma: Huge trench running east-west along z = 0
    const distFromChasmaCenter = Math.abs(z);
    let chasma = 0;
    if (distFromChasmaCenter < 12) {
      // Canyon floor with undulating dune fields
      chasma = -5000 + Math.sin(x * 0.2) * 200;
    } else if (distFromChasmaCenter < 28) {
      // 5 km high stepped canyon wall cliffs
      const t = (distFromChasmaCenter - 12) / 16;
      chasma = -5000 + Math.pow(t, 1.5) * 5500;
      // Landslide spurs & gullies
      chasma += Math.sin(x * 0.6) * 400 * (1 - t);
    } else {
      // High plateau plains (plateau plains above chasma)
      chasma = 600 + (distFromChasmaCenter - 28) * 30;
    }

    const noise = (fbm(x * 0.06, z * 0.06, 5) - 0.5) * 300;
    return baseElev + chasma + noise;
  }

  return baseElev;
}

/**
 * Computes slope incline in degrees at given (x, z)
 */
export function getSlope(x: number, z: number, sector: SectorId): number {
  const delta = 0.5; // sample spacing
  const hL = getElevation(x - delta, z, sector);
  const hR = getElevation(x + delta, z, sector);
  const hD = getElevation(x, z - delta, sector);
  const hU = getElevation(x, z + delta, sector);

  // Approximate horizontal distance in meters represented by 1 unit
  const metersPerUnit = (SECTORS[sector].scaleKm * 1000) / 100; // e.g. 300m per unit
  const dx = (hR - hL) / (2 * delta * metersPerUnit);
  const dz = (hU - hD) / (2 * delta * metersPerUnit);

  const gradient = Math.sqrt(dx * dx + dz * dz);
  const slopeDeg = (Math.atan(gradient) * 180) / Math.PI;
  return Math.min(85, slopeDeg);
}

/**
 * Computes surface normal vector [nx, ny, nz]
 */
export function getNormal(x: number, z: number, sector: SectorId): [number, number, number] {
  const delta = 0.4;
  const hL = getElevation(x - delta, z, sector);
  const hR = getElevation(x + delta, z, sector);
  const hD = getElevation(x, z - delta, sector);
  const hU = getElevation(x, z + delta, sector);

  const metersPerUnit = (SECTORS[sector].scaleKm * 1000) / 100;
  const dx = (hR - hL) / (2 * delta * metersPerUnit);
  const dz = (hU - hD) / (2 * delta * metersPerUnit);

  let nx = -dx;
  let ny = 1.0;
  let nz = -dz;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return [nx / len, ny / len, nz / len];
}

/**
 * Returns surface temperature (Kelvin), mineral index, and atmospheric dust tau
 */
export function getScientificAttributes(x: number, z: number, sector: SectorId, solHour: number) {
  const elev = getElevation(x, z, sector);
  const slope = getSlope(x, z, sector);

  // Mars thermal range: ~140K in polar/shadow cold traps to ~290K at noon equator
  // Sol diurnal cycle: peak warmth at solHour 13.0
  const solarAngleFactor = Math.max(0, Math.sin(((solHour - 6) / 12) * Math.PI));
  const baseTemp = 180 + solarAngleFactor * 75; // 180K to 255K base
  // Elevation lapse rate on Mars (-2.5K per km)
  const elevMod = (elev / 1000) * -2.5;
  // Deep cold traps (steep north-facing walls in shadow)
  const coldTrap = (slope > 22 && z < 0) ? -28 : 0;
  const temperatureKelvin = Math.max(135, Math.min(295, baseTemp + elevMod + coldTrap + (hash(x, z) * 6 - 3)));

  // Mineral composition probability
  // Jezero delta contains hydrated silica & clays; Gale contains sulfates; Olympus has basalt
  const mineralNoise = fbm(x * 0.15 + 4.2, z * 0.15 + 1.7, 4);
  let dominantMineral: 'hydrated_silica' | 'olivine_basalt' | 'hematite' | 'clay_smectite' | 'gypsum' = 'olivine_basalt';
  if (mineralNoise > 0.65) dominantMineral = 'hydrated_silica';
  else if (mineralNoise > 0.5) dominantMineral = 'clay_smectite';
  else if (mineralNoise > 0.35) dominantMineral = 'hematite';
  else if (mineralNoise > 0.22) dominantMineral = 'gypsum';

  // Atmospheric tau (optical depth): baseline 0.45, dust storms can spike > 2.5
  const dustCenterDist = Math.hypot(x - 18, z - (-10));
  const isStormCell = dustCenterDist < 14;
  const atmosphericTau = isStormCell ? 1.8 + Math.sin(dustCenterDist) * 0.8 : 0.45 + hash(x * 0.05, z * 0.05) * 0.2;

  return {
    temperatureKelvin: Math.round(temperatureKelvin),
    dominantMineral,
    atmosphericTau: Number(atmosphericTau.toFixed(2)),
    isStormCell
  };
}
