import React, { useState, useEffect } from 'react';
import { SectorId, LayerState, EvaMode, Waypoint, RouteData, Hazard } from './types';
import { Mars3DViewer } from './components/Mars3DViewer';
import { TopNav } from './components/TopNav';
import { LayerControls } from './components/LayerControls';
import { RoutePlanner } from './components/RoutePlanner';
import { ElevationProfile } from './components/ElevationProfile';
import { TelemetryPanel } from './components/TelemetryPanel';
import { SqlConsole } from './components/SqlConsole';
import { MissionBriefingModal } from './components/MissionBriefingModal';
import { calculateFullRoute } from './utils/pathfinding';
import { martianDb, Plotted3DMarker } from './utils/sqlEngine';
import { SECTORS, getElevation } from './utils/terrain';

export const App: React.FC = () => {
  // 1. Sector State
  const [sector, setSector] = useState<SectorId>('jezero');

  // 2. Martian Solar Day State
  const [solDay, setSolDay] = useState(412);
  const [solHour, setSolHour] = useState(13.5); // 13:30 MTC (afternoon high sun)

  // 3. EVA Mode State (suit vs rover)
  const [evaMode, setEvaMode] = useState<EvaMode>('rover');

  // 4. Audio Mute State
  const [isMuted, setIsMuted] = useState(false);

  // 5. Scientific Datasets Layer State
  const [layerState, setLayerState] = useState<LayerState>({
    activeLayer: 'optical',
    opticalOpacity: 1.0,
    topoOpacity: 0.9,
    thermalOpacity: 0.9,
    spectralOpacity: 0.9,
    atmosphericOpacity: 0.85,
    showContours: true,
    showGrid: true,
    showWindVectors: true,
    wireframe: false
  });

  // 6. Hazards from Database
  const [hazards, setHazards] = useState<Hazard[]>(() => {
    martianDb.init();
    return martianDb.getHazards();
  });

  // 7. Route & Waypoints State
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeData, setRouteData] = useState<RouteData>({
    waypoints: [],
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
  });

  // Pin Dropping Mode
  const [activePinMode, setActivePinMode] = useState<'none' | 'start' | 'end' | 'waypoint'>('none');

  // SQL Plotted 3D Markers
  const [sqlMarkers, setSqlMarkers] = useState<Plotted3DMarker[]>([]);

  // Synchronized Hover Index between 2D Elevation graph and 3D map
  const [hoveredRouteIndex, setHoveredRouteIndex] = useState<number | null>(null);

  // Astronaut Manual Modal
  const [showBriefing, setShowBriefing] = useState(false);

  // Mission Control HUD panels: visible by default (can be toggled with 'H' or TopNav button)
  const [showHud, setShowHud] = useState(true);

  // Keyboard shortcut: Press 'H' to toggle HUD panels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setShowHud(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load database hazards on init
  useEffect(() => {
    martianDb.init();
    setHazards(martianDb.getHazards());
  }, []);

  // Set default initial waypoints when sector changes
  useEffect(() => {
    const initWps: Record<SectorId, Waypoint[]> = {
      jezero: [
        { id: 'WP-BASE', name: 'Base Camp Alpha (Delta Hub)', x: -10, z: -8, elevation: getElevation(-10, -8, 'jezero'), isBaseCamp: true },
        { id: 'WP-FAN1', name: 'WP-1 Delta Crest Scarp', x: -14, z: -15, elevation: getElevation(-14, -15, 'jezero') },
        { id: 'WP-OBJ', name: 'Objective: Belva Crater Overlook', x: 12, z: 8, elevation: getElevation(12, 8, 'jezero'), isObjective: true }
      ],
      gale: [
        { id: 'WP-BASE', name: 'Base Camp Gale (Curiosity Landing)', x: -18, z: -20, elevation: getElevation(-18, -20, 'gale'), isBaseCamp: true },
        { id: 'WP-OBJ', name: 'Objective: Mt. Sharp Lower Terraces', x: 2, z: 0, elevation: getElevation(2, 0, 'gale'), isObjective: true }
      ],
      olympus: [
        { id: 'WP-BASE', name: 'Base Camp Tharsis Rim', x: -12, z: -12, elevation: getElevation(-12, -12, 'olympus'), isBaseCamp: true },
        { id: 'WP-OBJ', name: 'Objective: Lava Tube Entrance', x: 8, z: 8, elevation: getElevation(8, 8, 'olympus'), isObjective: true }
      ],
      valles: [
        { id: 'WP-BASE', name: 'Base Camp Coprates Floor', x: -15, z: 0, elevation: getElevation(-15, 0, 'valles'), isBaseCamp: true },
        { id: 'WP-OBJ', name: 'Objective: North Canyon Wall Strata', x: 10, z: 12, elevation: getElevation(10, 12, 'valles'), isObjective: true }
      ]
    };

    const initialList = initWps[sector] || [];
    setWaypoints(initialList);
    const computed = calculateFullRoute(initialList, sector, evaMode, solHour, hazards);
    setRouteData(computed);
  }, [sector]);

  // Recalculate route when waypoints, EVA mode, or sol hour changes
  const handleRecalculate = () => {
    const computed = calculateFullRoute(waypoints, sector, evaMode, solHour, hazards);
    setRouteData(computed);
  };

  useEffect(() => {
    if (waypoints.length >= 2) {
      handleRecalculate();
    }
  }, [evaMode, solHour]);

  // Add a new waypoint from 3D terrain click
  const handleAddWaypoint = (newWp: Waypoint) => {
    let updated = [...waypoints];

    if (activePinMode === 'start') {
      // Replace or insert at beginning
      if (updated.length > 0 && updated[0].isBaseCamp) {
        updated[0] = newWp;
      } else {
        updated.unshift(newWp);
      }
    } else if (activePinMode === 'end') {
      // Replace or insert at end
      if (updated.length > 1 && updated[updated.length - 1].isObjective) {
        updated[updated.length - 1] = newWp;
      } else {
        updated.push(newWp);
      }
    } else {
      // Insert intermediate waypoint before objective
      if (updated.length > 1) {
        updated.splice(updated.length - 1, 0, newWp);
      } else {
        updated.push(newWp);
      }
    }

    setWaypoints(updated);
    setActivePinMode('none');
    const computed = calculateFullRoute(updated, sector, evaMode, solHour, hazards);
    setRouteData(computed);
  };

  // Remove a waypoint
  const handleRemoveWaypoint = (id: string) => {
    const updated = waypoints.filter(w => w.id !== id);
    setWaypoints(updated);
    const computed = calculateFullRoute(updated, sector, evaMode, solHour, hazards);
    setRouteData(computed);
  };

  // Clear all waypoints
  const handleClearRoute = () => {
    setWaypoints([]);
    setRouteData({
      waypoints: [],
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
    });
  };

  // Load Mission Presets
  const handleLoadPreset = (key: string) => {
    if (key === 'safe_traverse') {
      const safeWps: Waypoint[] = [
        { id: 'WP-1', name: 'Base Camp Alpha', x: -10, z: -8, elevation: getElevation(-10, -8, sector), isBaseCamp: true },
        { id: 'WP-2', name: 'Safe Fan Spur', x: -8, z: 2, elevation: getElevation(-8, 2, sector) },
        { id: 'WP-3', name: 'Delta Crest Plateau', x: 4, z: 6, elevation: getElevation(4, 6, sector), isObjective: true }
      ];
      setWaypoints(safeWps);
      const computed = calculateFullRoute(safeWps, sector, evaMode, solHour, hazards);
      setRouteData(computed);
    } else if (key === 'hazard_evasion') {
      const evadeWps: Waypoint[] = [
        { id: 'WP-1', name: 'Base Camp Alpha', x: -10, z: -8, elevation: getElevation(-10, -8, sector), isBaseCamp: true },
        { id: 'WP-2', name: 'Storm Skirt Waypoint', x: 2, z: -25, elevation: getElevation(2, -25, sector) },
        { id: 'WP-3', name: 'Eastern Plateau Depot', x: 24, z: -4, elevation: getElevation(24, -4, sector), isObjective: true }
      ];
      setWaypoints(evadeWps);
      const computed = calculateFullRoute(evadeWps, sector, evaMode, solHour, hazards);
      setRouteData(computed);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#070B14] overflow-hidden select-none font-sans">
      {/* 1. Mission Control Top Navigation Bar */}
      <TopNav
        sector={sector}
        onSelectSector={setSector}
        solHour={solHour}
        setSolHour={setSolHour}
        solDay={solDay}
        evaMode={evaMode}
        setEvaMode={setEvaMode}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onOpenBriefing={() => setShowBriefing(true)}
        showHud={showHud}
        setShowHud={setShowHud}
      />

      {/* 2. Floating Mission Telemetry HUD (Shown when panels toggled on) */}
      {showHud && (
        <TelemetryPanel
          routeData={routeData}
          evaMode={evaMode}
        />
      )}

      {/* 3. Left-Hand Scientific Datasets Sidebar */}
      {showHud && (
        <LayerControls
          layerState={layerState}
          setLayerState={setLayerState}
        />
      )}

      {/* 4. Right-Hand EVA Route Planner */}
      {showHud && (
        <RoutePlanner
          routeData={routeData}
          activePinMode={activePinMode}
          setActivePinMode={setActivePinMode}
          onRemoveWaypoint={handleRemoveWaypoint}
          onCalculateRoute={handleRecalculate}
          onClearRoute={handleClearRoute}
          onLoadPreset={handleLoadPreset}
          sector={sector}
          evaMode={evaMode}
        />
      )}

      {/* 5. Central 3D Mars Surface Canvas */}
      <main className="w-full h-full">
        <Mars3DViewer
          sector={sector}
          layerState={layerState}
          solHour={solHour}
          solDay={solDay}
          routeData={routeData}
          hazards={hazards}
          sqlMarkers={sqlMarkers}
          activePinMode={activePinMode}
          onAddWaypoint={handleAddWaypoint}
          hoveredRouteIndex={hoveredRouteIndex}
          onSelectSector={setSector}
        />
      </main>

      {/* 6. Bottom Elevation Profile Cross-Section Graph */}
      {showHud && (
        <ElevationProfile
          routeData={routeData}
          hoveredIndex={hoveredRouteIndex}
          setHoveredIndex={setHoveredRouteIndex}
        />
      )}

      {/* 7. Bottom-Right Glassmorphic SQL Mission Console */}
      {showHud && (
        <SqlConsole
          sector={sector}
          onPlotMarkers={setSqlMarkers}
          onClearMarkers={() => setSqlMarkers([])}
          activeMarkerCount={sqlMarkers.length}
        />
      )}

      {/* 8. Expedition Operational Manual Modal */}
      <MissionBriefingModal
        isOpen={showBriefing}
        onClose={() => setShowBriefing(false)}
      />
    </div>
  );
};
export default App;
