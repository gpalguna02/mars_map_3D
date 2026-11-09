export type LayerType = 'optical' | 'topographic' | 'thermal' | 'spectral' | 'atmospheric';

export type SectorId = 'jezero' | 'gale' | 'olympus' | 'valles';

export interface SectorInfo {
  id: SectorId;
  name: string;
  region: string;
  coordinates: string;
  description: string;
  baseCampElevation: number; // in meters
  scaleKm: number;
}

export type EvaMode = 'suit' | 'rover';

export interface Waypoint {
  id: string;
  name: string;
  x: number; // grid coordinate [-50, 50]
  z: number; // grid coordinate [-50, 50]
  elevation: number; // in meters
  isBaseCamp?: boolean;
  isObjective?: boolean;
}

export interface RoutePoint {
  x: number;
  z: number;
  elevation: number;
  distanceFromStart: number; // in km
  slopeDeg: number; // slope incline in degrees
  losClear: boolean; // line of sight to base camp
  solarIrradiance: number; // W/m^2
  isHazardous: boolean;
}

export interface RouteData {
  waypoints: Waypoint[];
  pathPoints: RoutePoint[];
  totalDistanceKm: number;
  estimatedTimeMin: number;
  o2ConsumptionKg: number;
  batteryUsageKwh: number;
  maxSlopeDeg: number;
  averageSlopeDeg: number;
  elevationGainM: number;
  elevationLossM: number;
  losCoveragePercent: number;
  hasSteepWarning: boolean;
  hasHazardWarning: boolean;
  activeHazards: string[];
}

export interface Hazard {
  id: string;
  name: string;
  type: 'dust_storm' | 'escarpment' | 'boulder_field' | 'cold_trap' | 'soft_sand';
  x: number;
  z: number;
  radius_km: number;
  severity: 'low' | 'moderate' | 'critical';
  description: string;
}

export interface SafeZone {
  id: string;
  name: string;
  zone_type: 'habitat_hub' | 'canyon_shelter' | 'pressurized_depot' | 'landing_pad';
  x: number;
  z: number;
  radius_km: number;
  elevation_m: number;
  description: string;
}

export interface ScientificSample {
  id: string;
  name: string;
  mineral: 'hydrated_silica' | 'olivine_basalt' | 'hematite' | 'clay_smectite' | 'gypsum';
  x: number;
  z: number;
  scientific_value: number;
  depth_cm: number;
}

export interface CommsRelay {
  id: string;
  name: string;
  frequency_ghz: number;
  x: number;
  z: number;
  mast_height_m: number;
  status: 'active' | 'standby' | 'degraded';
}

export interface EvaCrew {
  id: string;
  callsign: string;
  suit_id: string;
  o2_level: number;
  heart_rate_bpm: number;
  status: 'nominal' | 'elevated' | 'critical';
}

export interface RoverTelemetry {
  id: string;
  callsign: string;
  battery_pct: number;
  payload_kg: number;
  status: 'operational' | 'charging' | 'hazard_stop';
}

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
  query: string;
}

export interface LayerState {
  activeLayer: LayerType;
  opticalOpacity: number;
  topoOpacity: number;
  thermalOpacity: number;
  spectralOpacity: number;
  atmosphericOpacity: number;
  showContours: boolean;
  showGrid: boolean;
  showWindVectors: boolean;
  wireframe: boolean;
}
