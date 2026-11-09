import { SectorId } from '../types';
import { getElevation } from './terrain';

export interface SolarState {
  solHour: number; // 0.0 to 24.65 (24h 39m)
  solDay: number;
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  sunDirection: [number, number, number]; // normalized [x, y, z] pointing towards sun
  isDaylight: boolean;
  solarFluxWpm2: number; // Top of atmosphere solar flux ~590 W/m²
}

/**
 * Calculates sun vector for Martian sol time and latitude
 */
export function getSolarState(solHour: number, solDay = 412, sector: SectorId = 'jezero'): SolarState {
  // Martian sol has 24h 39m (~24.65 hours)
  const solFraction = (solHour % 24.65) / 24.65;
  const hourAngleRad = (solFraction - 0.5) * 2 * Math.PI; // 0 at noon (12:20)

  // Sector latitudes
  const latDegMap: Record<SectorId, number> = {
    jezero: 18.38,
    gale: -5.4,
    olympus: 18.65,
    valles: -13.9
  };
  const latRad = (latDegMap[sector] * Math.PI) / 180;

  // Martian axial tilt is 25.19°
  const seasonAngleRad = ((solDay % 668) / 668) * 2 * Math.PI;
  const declinationRad = Math.sin(seasonAngleRad) * ((25.19 * Math.PI) / 180);

  // Solar zenith angle formula
  const sinElev = Math.sin(latRad) * Math.sin(declinationRad) +
                  Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  const elevRad = Math.asin(Math.max(-1, Math.min(1, sinElev)));
  const sunElevationDeg = (elevRad * 180) / Math.PI;

  // Solar Azimuth
  const cosAz = (Math.sin(declinationRad) - Math.sin(latRad) * sinElev) /
                (Math.cos(latRad) * Math.cos(elevRad) + 1e-6);
  let azRad = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (hourAngleRad > 0) azRad = 2 * Math.PI - azRad;
  const sunAzimuthDeg = (azRad * 180) / Math.PI;

  const isDaylight = sunElevationDeg > 0;

  // Direction vector pointing TOWARDS the sun in Three.js coordinate system (Y is up, Z is north-south, X is east-west)
  const dirX = Math.cos(elevRad) * Math.sin(azRad);
  const dirY = Math.sin(elevRad);
  const dirZ = Math.cos(elevRad) * Math.cos(azRad);

  // Martian top of atmosphere solar flux (mean 590 W/m²)
  const marsSolarConstant = 590; // W/m²
  const solarFluxWpm2 = isDaylight ? marsSolarConstant * Math.sin(elevRad) : 0;

  return {
    solHour,
    solDay,
    sunElevationDeg,
    sunAzimuthDeg,
    sunDirection: [dirX, Math.max(0.001, dirY), dirZ],
    isDaylight,
    solarFluxWpm2: Math.max(0, solarFluxWpm2)
  };
}

/**
 * Checks if a specific point on the terrain is cast in shadow by surrounding ridges/craters
 */
export function isPointInShadow(
  x: number,
  z: number,
  sector: SectorId,
  sunDir: [number, number, number]
): boolean {
  if (sunDir[1] <= 0.05) return true; // Below horizon = night shadow

  const startElev = getElevation(x, z, sector);
  const stepSize = 1.5;
  const maxSteps = 25;

  // Trace ray towards the sun direction
  const dx = sunDir[0] * stepSize;
  const dz = sunDir[2] * stepSize;
  // Elevation gain per step along sun ray
  // 1 unit in X/Z corresponds to ~300m in world space.
  const metersPerUnit = 300;
  const elevGainPerStep = (stepSize * metersPerUnit) * (sunDir[1] / Math.hypot(sunDir[0], sunDir[2]));

  let rayElev = startElev + 1.5; // slight clearance above ground (astronaut/rover height)

  for (let s = 1; s <= maxSteps; s++) {
    const rx = x + dx * s;
    const rz = z + dz * s;
    if (rx < -50 || rx > 50 || rz < -50 || rz > 50) break;

    rayElev += elevGainPerStep;
    const terrainHeight = getElevation(rx, rz, sector);

    if (terrainHeight > rayElev) {
      return true; // Ray blocked by higher terrain! Cast in crater shadow.
    }
  }

  return false;
}

/**
 * Calculates surface solar irradiance considering slope angle, normal, and shadow
 */
export function calculateSurfaceIrradiance(
  x: number,
  z: number,
  sector: SectorId,
  solarState: SolarState,
  normal: [number, number, number]
): number {
  if (!solarState.isDaylight) return 0;
  if (isPointInShadow(x, z, sector, solarState.sunDirection)) return 15; // Diffuse sky scatter only

  // Dot product between surface normal and sun direction
  const dot = normal[0] * solarState.sunDirection[0] +
              normal[1] * solarState.sunDirection[1] +
              normal[2] * solarState.sunDirection[2];

  const incidenceCos = Math.max(0, dot);
  // Direct beam + atmospheric diffuse scattered light
  const directFlux = solarState.solarFluxWpm2 * incidenceCos * 0.85;
  const diffuseFlux = 25; // ambient atmospheric scatter
  return Math.min(590, directFlux + diffuseFlux);
}
