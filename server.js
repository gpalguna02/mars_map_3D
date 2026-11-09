import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import alasql from 'alasql';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Seed Database Data
const INITIAL_HAZARDS = [
  { id: 'HAZ-01', name: 'Dust Storm Delta-9', type: 'dust_storm', x: 18.0, z: -10.0, radius_km: 14.5, severity: 'critical', description: 'Active convective dust cell; tau > 2.2, electrostatic lightning discharge risk.' },
  { id: 'HAZ-02', name: 'Neretva Scarp Cliff', type: 'escarpment', x: -14.5, z: 22.0, radius_km: 8.0, severity: 'critical', description: 'Vertical bedrock escarpment with slope exceeding 38 degrees; rollover hazard.' },
  { id: 'HAZ-03', name: 'Seítah Sand Sink', type: 'soft_sand', x: 4.0, z: 8.0, radius_km: 6.5, severity: 'moderate', description: 'Aeolian bedforms with low bearing strength; severe rover wheel sinkage.' },
  { id: 'HAZ-04', name: 'Kodiak Boulder Field', type: 'boulder_field', x: -22.0, z: -18.0, radius_km: 9.0, severity: 'moderate', description: 'Dense volcanic basalt boulder debris > 1.2m diameter; chassis collision risk.' },
  { id: 'HAZ-05', name: 'North Rim Shadow Trap', type: 'cold_trap', x: -5.0, z: -38.0, radius_km: 12.0, severity: 'low', description: 'Perpetually shadowed crater wall; temperature drops below 142 Kelvin.' },
  { id: 'HAZ-06', name: 'Belva Crater Fracture', type: 'escarpment', x: 28.0, z: 15.0, radius_km: 7.5, severity: 'critical', description: 'Subsurface fissure with unstable slump blocks.' }
];

const INITIAL_SAFE_ZONES = [
  { id: 'SZ-01', name: 'Base Camp Alpha (Hub)', zone_type: 'habitat_hub', x: -10.0, z: -8.0, radius_km: 4.0, elevation_m: -2480, description: 'Pressurized inflatable habitat module, comms tower, and life-support regenerator.' },
  { id: 'SZ-02', name: 'Delta Crest Depot', zone_type: 'pressurized_depot', x: -16.0, z: -2.0, radius_km: 2.5, elevation_m: -2320, description: 'Forward oxygen replenishment cache and rover inductive charging station.' },
  { id: 'SZ-03', name: 'Octavia Butler Landing Pad', zone_type: 'landing_pad', x: -6.0, z: -14.0, radius_km: 3.0, elevation_m: -2510, description: 'Reinforced regolith landing pad with telemetry beacon.' },
  { id: 'SZ-04', name: 'Belva Overlook Shelter', zone_type: 'canyon_shelter', x: 14.0, z: 6.0, radius_km: 2.0, elevation_m: -2280, description: 'Natural basalt overhang offering 98% cosmic radiation shielding.' }
];

const INITIAL_SAMPLES = [
  { id: 'SMP-101', name: 'Delta Clays Fan-A', mineral: 'hydrated_silica', x: -12.5, z: -12.0, scientific_value: 98, depth_cm: 15 },
  { id: 'SMP-102', name: 'Máaz Basalt Pavement', mineral: 'olivine_basalt', x: 2.0, z: -4.0, scientific_value: 75, depth_cm: 5 },
  { id: 'SMP-103', name: 'Santa Cruz Hematite Knot', mineral: 'hematite', x: 8.5, z: 14.0, scientific_value: 89, depth_cm: 25 },
  { id: 'SMP-104', name: 'Smectite Clay Bed', mineral: 'clay_smectite', x: -18.0, z: 6.0, scientific_value: 94, depth_cm: 40 },
  { id: 'SMP-105', name: 'Sulfate Gypsum Vein', mineral: 'gypsum', x: 20.0, z: -16.0, scientific_value: 82, depth_cm: 10 }
];

const INITIAL_COMMS = [
  { id: 'RELAY-01', name: 'Alpha Mast Repeater', frequency_ghz: 8.4, x: -10.0, z: -8.0, mast_height_m: 25.0, status: 'active' },
  { id: 'RELAY-02', name: 'Delta Ridge Transponder', frequency_ghz: 8.4, x: -18.0, z: -1.0, mast_height_m: 18.0, status: 'active' },
  { id: 'RELAY-03', name: 'East Rim Orbital Uplink', frequency_ghz: 32.0, x: 25.0, z: 8.0, mast_height_m: 35.0, status: 'standby' }
];

let crewVitals = [
  { id: 'EVA-1', callsign: 'Ares Commander (Vance)', suit_id: 'xEMU-04', o2_level: 96, heart_rate_bpm: 78, status: 'nominal' },
  { id: 'EVA-2', callsign: 'Geologist Lead (Chen)', suit_id: 'xEMU-07', o2_level: 89, heart_rate_bpm: 84, status: 'nominal' },
  { id: 'EVA-3', callsign: 'Payload Specialist (Okoye)', suit_id: 'xEMU-11', o2_level: 72, heart_rate_bpm: 112, status: 'elevated' }
];

let roverTelemetry = [
  { id: 'ROV-1', callsign: 'Valkyrie-1 (Heavy Crew)', battery_pct: 88, solar_charge_w: 420, payload_kg: 420, status: 'operational' },
  { id: 'ROV-2', callsign: 'Hermes-2 (Scout Buggy)', battery_pct: 64, solar_charge_w: 280, payload_kg: 180, status: 'operational' }
];

// Initialize AlaSQL Database
function initDb() {
  try {
    alasql('CREATE TABLE IF NOT EXISTS hazards (id STRING, name STRING, type STRING, x FLOAT, z FLOAT, radius_km FLOAT, severity STRING, description STRING)');
    alasql('CREATE TABLE IF NOT EXISTS safe_zones (id STRING, name STRING, zone_type STRING, x FLOAT, z FLOAT, radius_km FLOAT, elevation_m FLOAT, description STRING)');
    alasql('CREATE TABLE IF NOT EXISTS scientific_samples (id STRING, name STRING, mineral STRING, x FLOAT, z FLOAT, scientific_value INT, depth_cm INT)');
    alasql('CREATE TABLE IF NOT EXISTS comms_relays (id STRING, name STRING, frequency_ghz FLOAT, x FLOAT, z FLOAT, mast_height_m FLOAT, status STRING)');
    alasql('CREATE TABLE IF NOT EXISTS eva_crews (id STRING, callsign STRING, suit_id STRING, o2_level INT, heart_rate_bpm INT, status STRING)');
    alasql('CREATE TABLE IF NOT EXISTS rovers (id STRING, callsign STRING, battery_pct INT, solar_charge_w INT, payload_kg INT, status STRING)');
    alasql('CREATE TABLE IF NOT EXISTS saved_routes (id STRING, name STRING, sector STRING, distance_km FLOAT, points_count INT, created_at STRING)');

    alasql.tables.hazards.data = JSON.parse(JSON.stringify(INITIAL_HAZARDS));
    alasql.tables.safe_zones.data = JSON.parse(JSON.stringify(INITIAL_SAFE_ZONES));
    alasql.tables.scientific_samples.data = JSON.parse(JSON.stringify(INITIAL_SAMPLES));
    alasql.tables.comms_relays.data = JSON.parse(JSON.stringify(INITIAL_COMMS));
    alasql.tables.eva_crews.data = JSON.parse(JSON.stringify(crewVitals));
    alasql.tables.rovers.data = JSON.parse(JSON.stringify(roverTelemetry));

    console.log('[MARTIAN DB] Tables seeded successfully.');
  } catch (err) {
    console.error('[MARTIAN DB] Initialization error:', err);
  }
}
initDb();

// Helper to set CORS and JSON headers
function setHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res, statusCode, data) {
  setHeaders(res);
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(statusCode);
  res.end(JSON.stringify(data));
}

// SSE Clients for live telemetry broadcasts
const sseClients = new Set();

// Simulate Martian Real-Time Pulse every 2.5 seconds
setInterval(() => {
  // Update heart rates with slight realistic variance
  crewVitals.forEach(c => {
    const delta = (Math.random() - 0.5) * 4;
    c.heart_rate_bpm = Math.max(60, Math.min(145, Math.round(c.heart_rate_bpm + delta)));
  });

  // Update rover solar charge
  roverTelemetry.forEach(r => {
    const delta = (Math.random() - 0.5) * 15;
    r.solar_charge_w = Math.max(100, Math.min(580, Math.round(r.solar_charge_w + delta)));
  });

  alasql.tables.eva_crews.data = JSON.parse(JSON.stringify(crewVitals));
  alasql.tables.rovers.data = JSON.parse(JSON.stringify(roverTelemetry));

  if (sseClients.size > 0) {
    const payload = JSON.stringify({
      timestamp: new Date().toISOString(),
      solTime: '13:42 MTC',
      crew: crewVitals,
      rovers: roverTelemetry
    });

    sseClients.forEach(client => {
      client.write(`data: ${payload}\n\n`);
    });
  }
}, 2500);

// HTTP Server
const server = http.createServer((req, res) => {
  setHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // 1. Health check
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'ONLINE',
      system: 'SOL_NAV_BACKEND_MISSION_CONTROL',
      solDay: 412,
      database: 'AlaSQL-In-Memory-Martian-DB',
      tables: ['hazards', 'safe_zones', 'scientific_samples', 'comms_relays', 'eva_crews', 'rovers', 'saved_routes'],
      activeSseConnections: sseClients.size,
      uptimeSeconds: Math.round(process.uptime())
    });
  }

  // 2. Hazards
  if (pathname === '/api/hazards' && req.method === 'GET') {
    try {
      const rows = alasql('SELECT * FROM hazards');
      return sendJson(res, 200, rows);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 3. Safe Zones
  if (pathname === '/api/safe-zones' && req.method === 'GET') {
    try {
      const rows = alasql('SELECT * FROM safe_zones');
      return sendJson(res, 200, rows);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 4. Scientific Samples
  if (pathname === '/api/scientific-samples' && req.method === 'GET') {
    try {
      const rows = alasql('SELECT * FROM scientific_samples');
      return sendJson(res, 200, rows);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 5. Comms Relays
  if (pathname === '/api/comms-relays' && req.method === 'GET') {
    try {
      const rows = alasql('SELECT * FROM comms_relays');
      return sendJson(res, 200, rows);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 6. Crew vitals
  if (pathname === '/api/eva-crews' && req.method === 'GET') {
    return sendJson(res, 200, crewVitals);
  }

  // 7. Rovers
  if (pathname === '/api/rovers' && req.method === 'GET') {
    return sendJson(res, 200, roverTelemetry);
  }

  // 8. Server-Side SQL Query Runner
  if (pathname === '/api/query' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { query } = JSON.parse(body || '{}');
        if (!query || typeof query !== 'string') {
          return sendJson(res, 400, { error: 'Query parameter is required' });
        }

        const cleanQuery = query.trim().replace(/;$/, '');
        const startTime = performance.now();
        const rows = alasql(cleanQuery);
        const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

        if (!Array.isArray(rows)) {
          return sendJson(res, 200, {
            columns: ['status'],
            rows: [{ status: 'Command executed successfully.' }],
            rowCount: 1,
            executionTimeMs
          });
        }

        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

        // Extract 3D Markers if rows contain coordinates
        const markers = [];
        for (const r of rows) {
          if (typeof r.x === 'number' && typeof r.z === 'number') {
            let markerColor = '#00F2FE';
            let markerType = 'point';

            if (r.severity === 'critical' || r.type === 'dust_storm' || r.type === 'escarpment') {
              markerColor = '#EF4444';
              markerType = 'hazard';
            } else if (r.severity === 'moderate' || r.type === 'soft_sand') {
              markerColor = '#F59E0B';
              markerType = 'hazard';
            } else if (r.zone_type || r.name?.includes('Camp') || r.name?.includes('Shelter') || r.name?.includes('Pad')) {
              markerColor = '#10B981';
              markerType = 'safe_zone';
            } else if (r.mineral) {
              markerColor = '#8B5CF6';
              markerType = 'sample';
            } else if (r.frequency_ghz) {
              markerColor = '#06B6D4';
              markerType = 'relay';
            }

            markers.push({
              id: r.id || `M-${Math.random().toString(36).substring(2, 6)}`,
              name: r.name || r.callsign || 'Target Point',
              x: r.x,
              z: r.z,
              elevation: r.elevation_m || 0,
              type: markerType,
              color: markerColor,
              details: r.description || r.mineral || r.type || ''
            });
          }
        }

        return sendJson(res, 200, {
          columns,
          rows,
          rowCount: rows.length,
          executionTimeMs,
          markers
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    });
    return;
  }

  // 9. Save expedition route
  if (pathname === '/api/routes' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const route = JSON.parse(body || '{}');
        const routeId = `ROUTE-${Date.now()}`;
        const filePath = path.join(DATA_DIR, `${routeId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(route, null, 2));

        alasql('INSERT INTO saved_routes VALUES (?, ?, ?, ?, ?, ?)', [
          routeId,
          route.name || 'EVA Traverse',
          route.sector || 'jezero',
          route.telemetry?.distanceKm || 0,
          route.waypoints?.length || 0,
          new Date().toISOString()
        ]);

        return sendJson(res, 201, { success: true, routeId, message: 'Route manifest saved to backend storage.' });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    });
    return;
  }

  // 10. List saved routes
  if (pathname === '/api/routes' && req.method === 'GET') {
    try {
      const rows = alasql('SELECT * FROM saved_routes ORDER BY created_at DESC');
      return sendJson(res, 200, rows);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 11. SSE Live Telemetry Stream
  if (pathname === '/api/telemetry/live' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    sseClients.add(res);
    res.write(`data: ${JSON.stringify({ message: 'Connected to Sol Nav Live Telemetry Link' })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // Default 404
  sendJson(res, 404, { error: 'Endpoint not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SOL NAV BACKEND] Mission Control Server listening on http://0.0.0.0:${PORT}`);
});
