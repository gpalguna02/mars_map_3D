import { Waypoint, RoutePoint, RouteData, SectorId, EvaMode, Hazard } from '../types';
import { getElevation, getSlope, SECTORS, getNormal } from './terrain';
import { checkLineOfSight } from './lineOfSight';
import { getSolarState, calculateSurfaceIrradiance } from './solarTracking';

interface GridNode {
  x: number;
  z: number;
  g: number;
  h: number;
  f: number;
  parent?: GridNode;
}

/**
 * A* Safe Pathfinding on Martian DEM Grid
 */
export function findSafePath(
  start: { x: number; z: number },
  end: { x: number; z: number },
  sector: SectorId,
  mode: EvaMode,
  hazards: Hazard[] = []
): { x: number; z: number }[] {
  const maxSlopeLimit = mode === 'rover' ? 15.0 : 22.0;
  const resolution = 1.0; // grid step in coordinates

  // Snap to grid
  const startX = Math.round(start.x / resolution) * resolution;
  const startZ = Math.round(start.z / resolution) * resolution;
  const endX = Math.round(end.x / resolution) * resolution;
  const endZ = Math.round(end.z / resolution) * resolution;

  const key = (x: number, z: number) => `${x.toFixed(1)},${z.toFixed(1)}`;
  const openSet = new Map<string, GridNode>();
  const closedSet = new Set<string>();

  const startNode: GridNode = {
    x: startX,
    z: startZ,
    g: 0,
    h: Math.hypot(endX - startX, endZ - startZ),
    f: Math.hypot(endX - startX, endZ - startZ)
  };

  openSet.set(key(startX, startZ), startNode);

  const neighbors = [
    { dx: 1, dz: 0 }, { dx: -1, dz: 0 },
    { dx: 0, dz: 1 }, { dx: 0, dz: -1 },
    { dx: 0.707, dz: 0.707 }, { dx: -0.707, dz: 0.707 },
    { dx: 0.707, dz: -0.707 }, { dx: -0.707, dz: -0.707 }
  ];

  let iterations = 0;
  const maxIterations = 3500;
  let closestNode = startNode;
  let minH = startNode.h;

  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f score
    let current: GridNode | null = null;
    let currentKey = '';
    for (const [k, node] of openSet.entries()) {
      if (!current || node.f < current.f) {
        current = node;
        currentKey = k;
      }
    }

    if (!current) break;

    // Check if reached destination
    const distToEnd = Math.hypot(current.x - endX, current.z - endZ);
    if (distToEnd < resolution * 1.2) {
      closestNode = current;
      break;
    }

    if (current.h < minH) {
      minH = current.h;
      closestNode = current;
    }

    openSet.delete(currentKey);
    closedSet.add(currentKey);

    for (const offset of neighbors) {
      const nx = current.x + offset.dx * resolution;
      const nz = current.z + offset.dz * resolution;

      if (nx < -48 || nx > 48 || nz < -48 || nz > 48) continue;

      const nKey = key(nx, nz);
      if (closedSet.has(nKey)) continue;

      // Evaluate terrain slope cost
      const slope = getSlope(nx, nz, sector);
      let slopeCostMultiplier = 1.0;

      if (slope > maxSlopeLimit) {
        // High penalty for exceeding vehicle / suit limits
        slopeCostMultiplier += Math.pow((slope - maxSlopeLimit) * 2, 2.5);
      } else if (slope > 10.0) {
        slopeCostMultiplier += (slope - 10) * 0.4;
      }

      // Check hazard proximity
      let hazardCost = 0;
      for (const h of hazards) {
        const distToHazard = Math.hypot(nx - h.x, nz - h.z);
        if (distToHazard < h.radius_km * 0.8) {
          hazardCost += h.severity === 'critical' ? 200 : 50;
        }
      }

      const stepDist = Math.hypot(offset.dx, offset.dz) * resolution;
      const tentativeG = current.g + stepDist * slopeCostMultiplier + hazardCost;

      const existingNode = openSet.get(nKey);
      if (!existingNode || tentativeG < existingNode.g) {
        const h = Math.hypot(endX - nx, endZ - nz);
        const neighborNode: GridNode = {
          x: nx,
          z: nz,
          g: tentativeG,
          h,
          f: tentativeG + h * 1.1, // slightly greedy heuristic for speed
          parent: current
        };
        openSet.set(nKey, neighborNode);
      }
    }
  }

  // Reconstruct path
  const path: { x: number; z: number }[] = [];
  let curr: GridNode | undefined = closestNode;
  while (curr) {
    path.push({ x: curr.x, z: curr.z });
    curr = curr.parent;
  }
  path.reverse();

  // Ensure exact start and end are pinned
  if (path.length > 0) {
    path[0] = { x: start.x, z: start.z };
    path[path.length - 1] = { x: end.x, z: end.z };
  } else {
    path.push(start, end);
  }

  // Smooth path using Catmull-Rom or spline subdivision
  return smoothPath(path, 0.4);
}

function smoothPath(points: { x: number; z: number }[], maxSpacing: number): { x: number; z: number }[] {
  if (points.length < 2) return points;
  const smoothed: { x: number; z: number }[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const d = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    const steps = Math.max(1, Math.ceil(d / maxSpacing));

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      smoothed.push({
        x: p1.x + (p2.x - p1.x) * t,
        z: p1.z + (p2.z - p1.z) * t
      });
    }
  }
  smoothed.push(points[points.length - 1]);
  return smoothed;
}

/**
 * Builds full route telemetry, elevation profile, resources, and LOS checks
 */
export function calculateFullRoute(
  waypoints: Waypoint[],
  sector: SectorId,
  mode: EvaMode,
  solHour: number,
  hazards: Hazard[] = []
): RouteData {
  if (waypoints.length < 2) {
    return {
      waypoints,
      pathPoints: [],
      totalDistanceKm: 0,
      estimatedTimeMin: 0,
      o2ConsumptionKg: 0,
      batteryUsageKwh: 0,
      maxSlopeDeg: 0,
      averageSlopeDeg: 0,
      elevationGainM: 0,
      elevationLossM: 0,
      losCoveragePercent: 100,
      hasSteepWarning: false,
      hasHazardWarning: false,
      activeHazards: []
    };
  }

  const baseCamp = waypoints[0];
  const sectorScale = SECTORS[sector].scaleKm; // km per 100 units
  const solar = getSolarState(solHour, 412, sector);

  // Generate path segments connecting each waypoint
  const allRawPoints: { x: number; z: number }[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const seg = findSafePath(waypoints[i], waypoints[i + 1], sector, mode, hazards);
    if (i > 0) seg.shift(); // avoid duplicate join point
    allRawPoints.push(...seg);
  }

  let cumulativeDistKm = 0;
  let totalTimeHours = 0;
  let totalO2Kg = 0;
  let totalBatteryKwh = 0;
  let maxSlope = 0;
  let sumSlope = 0;
  let elevGain = 0;
  let elevLoss = 0;
  let clearLosCount = 0;
  const activeHazardSet = new Set<string>();

  const pathPoints: RoutePoint[] = [];

  for (let i = 0; i < allRawPoints.length; i++) {
    const pt = allRawPoints[i];
    const elev = getElevation(pt.x, pt.z, sector);
    const slope = getSlope(pt.x, pt.z, sector);
    const normal = getNormal(pt.x, pt.z, sector);

    if (slope > maxSlope) maxSlope = slope;
    sumSlope += slope;

    // Distance increment
    let segmentDistKm = 0;
    if (i > 0) {
      const prev = allRawPoints[i - 1];
      const prevElev = pathPoints[i - 1].elevation;
      const dCoords = Math.hypot(pt.x - prev.x, pt.z - prev.z);
      const horizDistKm = (dCoords / 100) * sectorScale;
      const vertDistKm = Math.abs(elev - prevElev) / 1000;
      segmentDistKm = Math.hypot(horizDistKm, vertDistKm);
      cumulativeDistKm += segmentDistKm;

      if (elev > prevElev) elevGain += (elev - prevElev);
      else elevLoss += (prevElev - elev);
    }

    // Check LOS to base camp
    const los = checkLineOfSight(baseCamp.x, baseCamp.z, pt.x, pt.z, sector);
    if (los.isClear) clearLosCount++;

    // Solar irradiance on terrain
    const solarIrradiance = calculateSurfaceIrradiance(pt.x, pt.z, sector, solar, normal);

    // Hazard check
    let isHazardous = slope > (mode === 'rover' ? 14 : 18);
    for (const h of hazards) {
      const d = (Math.hypot(pt.x - h.x, pt.z - h.z) / 100) * sectorScale;
      if (d < h.radius_km) {
        isHazardous = true;
        activeHazardSet.add(`${h.name} (${h.type})`);
      }
    }

    // Time & Resource calculations
    if (i > 0 && segmentDistKm > 0) {
      let speedKmh = 0;
      if (mode === 'suit') {
        // Astronaut foot speed: base 2.8 km/h, reduced by slope
        const slopeRad = (slope * Math.PI) / 180;
        speedKmh = Math.max(0.6, 2.8 * Math.exp(-3.2 * Math.tan(slopeRad)));
        const segmentTimeHours = segmentDistKm / speedKmh;
        totalTimeHours += segmentTimeHours;

        // O2 consumption: base 0.055 kg/hr, rises to 0.16 kg/hr under heavy incline
        const metabolicRateKgPerHr = 0.055 + (slope / 20) * 0.095;
        totalO2Kg += metabolicRateKgPerHr * segmentTimeHours;

        // Suit life support electrical power ~0.35 kW
        totalBatteryKwh += 0.35 * segmentTimeHours;
      } else {
        // Pressurized Rover: base 7.5 km/h, reduced on inclines
        speedKmh = Math.max(1.8, 7.5 * (1 - Math.min(0.8, slope / 22)));
        const segmentTimeHours = segmentDistKm / speedKmh;
        totalTimeHours += segmentTimeHours;

        // Rover energy: ~1.1 kWh/km flat + extra for uphill
        const gradeFactor = 1.0 + Math.max(0, (elev - pathPoints[i - 1].elevation) / 200);
        const motorPowerKwh = segmentDistKm * 1.1 * gradeFactor;
        const hotelLoadKwh = 0.8 * segmentTimeHours; // life support & systems

        // Solar panel recharge credit (3 m² roof array, 28% triple-junction cells)
        const solarRechargeKw = (solarIrradiance * 3.0 * 0.28) / 1000;
        const rechargeKwh = solarRechargeKw * segmentTimeHours;

        totalBatteryKwh += Math.max(0.05, motorPowerKwh + hotelLoadKwh - rechargeKwh);
        totalO2Kg += 0.02 * segmentTimeHours; // Cabin top-up
      }
    }

    pathPoints.push({
      x: pt.x,
      z: pt.z,
      elevation: Math.round(elev),
      distanceFromStart: Number(cumulativeDistKm.toFixed(2)),
      slopeDeg: Number(slope.toFixed(1)),
      losClear: los.isClear,
      solarIrradiance: Math.round(solarIrradiance),
      isHazardous
    });
  }

  const avgSlope = pathPoints.length > 0 ? sumSlope / pathPoints.length : 0;
  const losPercent = pathPoints.length > 0 ? Math.round((clearLosCount / pathPoints.length) * 100) : 100;
  const hasSteepWarning = maxSlope > 15.0;

  return {
    waypoints,
    pathPoints,
    totalDistanceKm: Number(cumulativeDistKm.toFixed(2)),
    estimatedTimeMin: Math.round(totalTimeHours * 60),
    o2ConsumptionKg: Number(totalO2Kg.toFixed(2)),
    batteryUsageKwh: Number(totalBatteryKwh.toFixed(2)),
    maxSlopeDeg: Number(maxSlope.toFixed(1)),
    averageSlopeDeg: Number(avgSlope.toFixed(1)),
    elevationGainM: Math.round(elevGain),
    elevationLossM: Math.round(elevLoss),
    losCoveragePercent: losPercent,
    hasSteepWarning,
    hasHazardWarning: activeHazardSet.size > 0,
    activeHazards: Array.from(activeHazardSet)
  };
}
