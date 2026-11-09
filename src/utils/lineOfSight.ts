import { SectorId } from '../types';
import { getElevation } from './terrain';

export interface LosResult {
  isClear: boolean;
  occludedPoint?: { x: number; z: number; elevation: number };
  clearDistanceRatio: number;
  fresnelZoneClearanceM: number;
}

/**
 * Evaluates Radio Frequency Line-of-Sight (LOS) from Base Camp comms mast
 * to a target coordinate on the Martian surface
 */
export function checkLineOfSight(
  baseX: number,
  baseZ: number,
  targetX: number,
  targetZ: number,
  sector: SectorId,
  baseMastHeightM = 25.0,
  targetReceiverHeightM = 2.5
): LosResult {
  const baseElev = getElevation(baseX, baseZ, sector) + baseMastHeightM;
  const targetElev = getElevation(targetX, targetZ, sector) + targetReceiverHeightM;

  const dx = targetX - baseX;
  const dz = targetZ - baseZ;
  const totalDistUnits = Math.hypot(dx, dz);

  if (totalDistUnits < 0.2) {
    return { isClear: true, clearDistanceRatio: 1.0, fresnelZoneClearanceM: baseMastHeightM };
  }

  // Sample along the ray at granular intervals (~0.5 unit intervals)
  const steps = Math.max(15, Math.floor(totalDistUnits * 2.5));
  let minClearance = Infinity;
  let occludedPoint: { x: number; z: number; elevation: number } | undefined;

  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = baseX + dx * t;
    const pz = baseZ + dz * t;

    // Ray line height at parameter t
    const rayHeight = baseElev + (targetElev - baseElev) * t;
    const terrainHeight = getElevation(px, pz, sector);

    const clearance = rayHeight - terrainHeight;
    if (clearance < minClearance) {
      minClearance = clearance;
    }

    if (clearance <= 0 && !occludedPoint) {
      occludedPoint = {
        x: px,
        z: pz,
        elevation: terrainHeight
      };
    }
  }

  const isClear = minClearance > 0;
  return {
    isClear,
    occludedPoint,
    clearDistanceRatio: isClear ? 1.0 : Math.max(0, minClearance / 100),
    fresnelZoneClearanceM: minClearance
  };
}
