import alasql from 'alasql';
import { Hazard, SafeZone, ScientificSample, CommsRelay, EvaCrew, RoverTelemetry, SqlQueryResult } from '../types';
import { getElevation } from './terrain';

export interface Plotted3DMarker {
  id: string;
  name: string;
  x: number;
  z: number;
  elevation: number;
  type: string;
  color: string;
  details: string;
}

export const INITIAL_HAZARDS: Hazard[] = [
  { id: 'HAZ-01', name: 'Dust Storm Delta-9', type: 'dust_storm', x: 18.0, z: -10.0, radius_km: 14.5, severity: 'critical', description: 'Active convective dust cell; tau > 2.2, electrostatic lightning discharge risk.' },
  { id: 'HAZ-02', name: 'Neretva Scarp Cliff', type: 'escarpment', x: -14.5, z: 22.0, radius_km: 8.0, severity: 'critical', description: 'Vertical bedrock escarpment with slope exceeding 38 degrees; rollover hazard.' },
  { id: 'HAZ-03', name: 'Seítah Sand Sink', type: 'soft_sand', x: 4.0, z: 8.0, radius_km: 6.5, severity: 'moderate', description: 'Aeolian bedforms with low bearing strength; severe rover wheel sinkage.' },
  { id: 'HAZ-04', name: 'Kodiak Boulder Field', type: 'boulder_field', x: -22.0, z: -18.0, radius_km: 9.0, severity: 'moderate', description: 'Dense volcanic basalt boulder debris > 1.2m diameter; chassis collision risk.' },
  { id: 'HAZ-05', name: 'North Rim Shadow Trap', type: 'cold_trap', x: -5.0, z: -38.0, radius_km: 12.0, severity: 'low', description: 'Perpetually shadowed crater wall; temperature drops below 142 Kelvin.' },
  { id: 'HAZ-06', name: 'Belva Crater Fracture', type: 'escarpment', x: 28.0, z: 15.0, radius_km: 7.5, severity: 'critical', description: 'Subsurface fissure with unstable slump blocks.' }
];

export const INITIAL_SAFE_ZONES: SafeZone[] = [
  { id: 'SZ-01', name: 'Base Camp Alpha (Hub)', zone_type: 'habitat_hub', x: -10.0, z: -8.0, radius_km: 4.0, elevation_m: -2480, description: 'Pressurized inflatable habitat module, comms tower, and life-support regenerator.' },
  { id: 'SZ-02', name: 'Delta Crest Depot', zone_type: 'pressurized_depot', x: -16.0, z: -2.0, radius_km: 2.5, elevation_m: -2320, description: 'Forward oxygen replenishment cache and rover inductive charging station.' },
  { id: 'SZ-03', name: 'Octavia Butler Landing Pad', zone_type: 'landing_pad', x: -6.0, z: -14.0, radius_km: 3.0, elevation_m: -2510, description: 'Reinforced regolith landing pad with telemetry beacon.' },
  { id: 'SZ-04', name: 'Belva Overlook Shelter', zone_type: 'canyon_shelter', x: 14.0, z: 6.0, radius_km: 2.0, elevation_m: -2280, description: 'Natural basalt overhang offering 98% cosmic radiation shielding.' }
];

export const INITIAL_SAMPLES: ScientificSample[] = [
  { id: 'SMP-101', name: 'Delta Clays Fan-A', mineral: 'hydrated_silica', x: -12.5, z: -12.0, scientific_value: 98, depth_cm: 15 },
  { id: 'SMP-102', name: 'Máaz Basalt Pavement', mineral: 'olivine_basalt', x: 2.0, z: -4.0, scientific_value: 75, depth_cm: 5 },
  { id: 'SMP-103', name: 'Santa Cruz Hematite Knot', mineral: 'hematite', x: 8.5, z: 14.0, scientific_value: 89, depth_cm: 25 },
  { id: 'SMP-104', name: 'Smectite Clay Bed', mineral: 'clay_smectite', x: -18.0, z: 6.0, scientific_value: 94, depth_cm: 40 },
  { id: 'SMP-105', name: 'Sulfate Gypsum Vein', mineral: 'gypsum', x: 20.0, z: -16.0, scientific_value: 82, depth_cm: 10 }
];

export const INITIAL_COMMS: CommsRelay[] = [
  { id: 'RELAY-01', name: 'Alpha Mast Repeater', frequency_ghz: 8.4, x: -10.0, z: -8.0, mast_height_m: 25.0, status: 'active' },
  { id: 'RELAY-02', name: 'Delta Ridge Transponder', frequency_ghz: 8.4, x: -18.0, z: -1.0, mast_height_m: 18.0, status: 'active' },
  { id: 'RELAY-03', name: 'East Rim Orbital Uplink', frequency_ghz: 32.0, x: 25.0, z: 8.0, mast_height_m: 35.0, status: 'standby' }
];

export const INITIAL_CREW: EvaCrew[] = [
  { id: 'EVA-1', callsign: 'Ares Commander (Vance)', suit_id: 'xEMU-04', o2_level: 96, heart_rate_bpm: 78, status: 'nominal' },
  { id: 'EVA-2', callsign: 'Geologist Lead (Chen)', suit_id: 'xEMU-07', o2_level: 89, heart_rate_bpm: 84, status: 'nominal' },
  { id: 'EVA-3', callsign: 'Payload Specialist (Okoye)', suit_id: 'xEMU-11', o2_level: 72, heart_rate_bpm: 112, status: 'elevated' }
];

export const INITIAL_ROVERS: RoverTelemetry[] = [
  { id: 'ROV-1', callsign: 'Valkyrie-1 (Heavy Crew)', battery_pct: 88, payload_kg: 420, status: 'operational' },
  { id: 'ROV-2', callsign: 'Hermes-2 (Scout Buggy)', battery_pct: 64, payload_kg: 180, status: 'operational' }
];

class MartianSqlEngine {
  private initialized = false;

  public init() {
    if (this.initialized) return;

    try {
      alasql('CREATE TABLE IF NOT EXISTS hazards (id STRING, name STRING, type STRING, x FLOAT, z FLOAT, radius_km FLOAT, severity STRING, description STRING)');
      alasql('CREATE TABLE IF NOT EXISTS safe_zones (id STRING, name STRING, zone_type STRING, x FLOAT, z FLOAT, radius_km FLOAT, elevation_m FLOAT, description STRING)');
      alasql('CREATE TABLE IF NOT EXISTS scientific_samples (id STRING, name STRING, mineral STRING, x FLOAT, z FLOAT, scientific_value INT, depth_cm INT)');
      alasql('CREATE TABLE IF NOT EXISTS comms_relays (id STRING, name STRING, frequency_ghz FLOAT, x FLOAT, z FLOAT, mast_height_m FLOAT, status STRING)');
      alasql('CREATE TABLE IF NOT EXISTS eva_crews (id STRING, callsign STRING, suit_id STRING, o2_level INT, heart_rate_bpm INT, status STRING)');
      alasql('CREATE TABLE IF NOT EXISTS rovers (id STRING, callsign STRING, battery_pct INT, payload_kg INT, status STRING)');

      // Seed tables
      alasql('DELETE FROM hazards');
      alasql('DELETE FROM safe_zones');
      alasql('DELETE FROM scientific_samples');
      alasql('DELETE FROM comms_relays');
      alasql('DELETE FROM eva_crews');
      alasql('DELETE FROM rovers');

      alasql.tables.hazards.data = JSON.parse(JSON.stringify(INITIAL_HAZARDS));
      alasql.tables.safe_zones.data = JSON.parse(JSON.stringify(INITIAL_SAFE_ZONES));
      alasql.tables.scientific_samples.data = JSON.parse(JSON.stringify(INITIAL_SAMPLES));
      alasql.tables.comms_relays.data = JSON.parse(JSON.stringify(INITIAL_COMMS));
      alasql.tables.eva_crews.data = JSON.parse(JSON.stringify(INITIAL_CREW));
      alasql.tables.rovers.data = JSON.parse(JSON.stringify(INITIAL_ROVERS));

      this.initialized = true;
    } catch (err) {
      console.error('Failed to init AlaSQL Martian database:', err);
    }
  }

  public executeQuery(query: string, sector = 'jezero'): { result: SqlQueryResult; markers: Plotted3DMarker[] } {
    this.init();
    const startTime = performance.now();
    const cleanQuery = query.trim().replace(/;$/, '');

    try {
      const rows = alasql(cleanQuery);
      const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

      if (!Array.isArray(rows)) {
        return {
          result: {
            columns: ['status'],
            rows: [{ status: 'Command executed successfully.' }],
            rowCount: 1,
            executionTimeMs,
            query
          },
          markers: []
        };
      }

      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      const markers: Plotted3DMarker[] = [];

      // Extract coordinates if present
      for (const row of rows) {
        if (typeof row.x === 'number' && typeof row.z === 'number') {
          const elev = typeof row.elevation_m === 'number' ? row.elevation_m : getElevation(row.x, row.z, sector as any);
          let markerColor = '#00F2FE'; // cyan default
          let markerType = 'point';

          if (row.severity === 'critical' || row.type === 'dust_storm' || row.type === 'escarpment') {
            markerColor = '#EF4444'; // emergency red
            markerType = 'hazard';
          } else if (row.severity === 'moderate' || row.type === 'soft_sand') {
            markerColor = '#F59E0B'; // amber
            markerType = 'hazard';
          } else if (row.zone_type || row.name?.includes('Camp') || row.name?.includes('Shelter') || row.name?.includes('Pad')) {
            markerColor = '#10B981'; // green safe zone
            markerType = 'safe_zone';
          } else if (row.mineral) {
            markerColor = '#8B5CF6'; // purple scientific sample
            markerType = 'sample';
          } else if (row.frequency_ghz) {
            markerColor = '#06B6D4'; // cyan comms relay
            markerType = 'relay';
          }

          markers.push({
            id: row.id || `M-${Math.random().toString(36).substring(2, 6)}`,
            name: row.name || row.callsign || 'Target Point',
            x: row.x,
            z: row.z,
            elevation: Math.round(elev),
            type: markerType,
            color: markerColor,
            details: row.description || row.mineral || row.type || `Elev: ${Math.round(elev)}m`
          });
        }
      }

      return {
        result: {
          columns,
          rows,
          rowCount: rows.length,
          executionTimeMs,
          query
        },
        markers
      };
    } catch (err: any) {
      const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
      return {
        result: {
          columns: ['error'],
          rows: [],
          rowCount: 0,
          executionTimeMs,
          error: err?.message || 'SQL Execution error',
          query
        },
        markers: []
      };
    }
  }

  public async executeQueryRemote(query: string, sector = 'jezero'): Promise<{ result: SqlQueryResult; markers: Plotted3DMarker[]; source: 'backend' | 'client' }> {
    try {
      const resp = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sector })
      });
      if (resp.ok) {
        const data = await resp.json();
        return {
          result: {
            columns: data.columns || [],
            rows: data.rows || [],
            rowCount: data.rowCount ?? data.rows?.length ?? 0,
            executionTimeMs: data.executionTimeMs || 0,
            query
          },
          markers: (data.markers || []).map((m: any) => ({
            ...m,
            elevation: m.elevation || Math.round(getElevation(m.x, m.z, sector as any))
          })),
          source: 'backend'
        };
      }
    } catch (err) {
      // Fallback to client if backend request fails
    }

    const clientOutput = this.executeQuery(query, sector);
    return { ...clientOutput, source: 'client' };
  }

  public async saveRouteRemote(routeManifest: any): Promise<boolean> {
    try {
      const resp = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeManifest)
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  public getHazards(): Hazard[] {
    this.init();
    try {
      return alasql('SELECT * FROM hazards') as Hazard[];
    } catch {
      return INITIAL_HAZARDS;
    }
  }

  public getSafeZones(): SafeZone[] {
    this.init();
    try {
      return alasql('SELECT * FROM safe_zones') as SafeZone[];
    } catch {
      return INITIAL_SAFE_ZONES;
    }
  }
}

export const martianDb = new MartianSqlEngine();
