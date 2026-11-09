import React, { useState } from 'react';
import { RouteData, Waypoint, SectorId, EvaMode } from '../types';
import { MapPin, Navigation2, Plus, Trash2, ArrowRight, Play, Download, CheckCircle, AlertTriangle, Compass } from 'lucide-react';
import { missionAudio } from '../utils/audio';

interface RoutePlannerProps {
  routeData: RouteData;
  activePinMode: 'none' | 'start' | 'end' | 'waypoint';
  setActivePinMode: (mode: 'none' | 'start' | 'end' | 'waypoint') => void;
  onRemoveWaypoint: (id: string) => void;
  onCalculateRoute: () => void;
  onClearRoute: () => void;
  onLoadPreset: (presetKey: string) => void;
  sector: SectorId;
  evaMode: EvaMode;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  routeData,
  activePinMode,
  setActivePinMode,
  onRemoveWaypoint,
  onCalculateRoute,
  onClearRoute,
  onLoadPreset,
  sector,
  evaMode
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const handleExportGeoJSON = () => {
    missionAudio.playClick();
    const manifest = {
      mission: 'SOL_NAV_MARTIAN_EVA',
      timestamp: new Date().toISOString(),
      sector,
      mode: evaMode,
      telemetry: {
        distanceKm: routeData.totalDistanceKm,
        estimatedTimeMin: routeData.estimatedTimeMin,
        o2ConsumptionKg: routeData.o2ConsumptionKg,
        batteryUsageKwh: routeData.batteryUsageKwh,
        maxSlopeDeg: routeData.maxSlopeDeg,
        losCoveragePercent: routeData.losCoveragePercent
      },
      waypoints: routeData.waypoints,
      pathCoordinates: routeData.pathPoints.map(p => ({
        x: p.x,
        z: p.z,
        elevation: p.elevation,
        slope: p.slopeDeg,
        los: p.losClear
      }))
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOL_NAV_EVA_ROUTE_${sector.toUpperCase()}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTriggerCalculate = () => {
    onCalculateRoute();
    missionAudio.playRouteSuccess();
  };

  return (
    <div className="absolute top-20 right-4 z-20">
      <div className={`w-80 sm:w-96 bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 rounded-xl p-4 shadow-cyan-glow text-slate-200 transition-all ${collapsed ? 'max-h-14 overflow-hidden' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Navigation2 className="w-4 h-4 text-cyan-400" />
            <h2 className="font-mono text-xs font-bold text-white tracking-wider">EVA ROUTE PLANNER</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-[10px] font-mono text-slate-400 hover:text-white"
            >
              {collapsed ? 'EXPAND' : 'MINIMIZE'}
            </button>
          </div>
        </div>

        {!collapsed && (
          <>
            {/* Quick Presets */}
            <div className="mt-3">
              <label className="text-[10px] font-mono text-slate-400">MISSION PRESETS</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => onLoadPreset('safe_traverse')}
                  className="px-2.5 py-1.5 rounded bg-slate-900/80 hover:bg-cyan-950/40 border border-slate-700/80 hover:border-cyan-500/40 text-[11px] font-mono text-slate-300 hover:text-cyan-300 text-left transition-all"
                >
                  Delta Traverse (Safe)
                </button>
                <button
                  onClick={() => onLoadPreset('hazard_evasion')}
                  className="px-2.5 py-1.5 rounded bg-slate-900/80 hover:bg-cyan-950/40 border border-slate-700/80 hover:border-cyan-500/40 text-[11px] font-mono text-slate-300 hover:text-cyan-300 text-left transition-all"
                >
                  Storm Evasion Path
                </button>
              </div>
            </div>

            {/* Pin Dropping Buttons */}
            <div className="mt-3.5 space-y-2">
              <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                <span>POINT-TO-POINT PIN SELECTION</span>
                <span className="text-cyan-400 font-semibold">{routeData.waypoints.length} PINS</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setActivePinMode(activePinMode === 'start' ? 'none' : 'start');
                    missionAudio.playClick();
                  }}
                  className={`p-2 rounded-lg border text-xs font-mono flex flex-col items-center gap-1 transition-all ${
                    activePinMode === 'start'
                      ? 'bg-emerald-950/60 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/40 shadow-sm'
                      : 'bg-slate-900/60 border-slate-700/80 text-emerald-400 hover:bg-slate-800'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px]">SET BASE</span>
                </button>

                <button
                  onClick={() => {
                    setActivePinMode(activePinMode === 'end' ? 'none' : 'end');
                    missionAudio.playClick();
                  }}
                  className={`p-2 rounded-lg border text-xs font-mono flex flex-col items-center gap-1 transition-all ${
                    activePinMode === 'end'
                      ? 'bg-pink-950/60 border-pink-400 text-pink-300 ring-2 ring-pink-500/40 shadow-sm'
                      : 'bg-slate-900/60 border-slate-700/80 text-pink-400 hover:bg-slate-800'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-pink-400" />
                  <span className="text-[10px]">SET TARGET</span>
                </button>

                <button
                  onClick={() => {
                    setActivePinMode(activePinMode === 'waypoint' ? 'none' : 'waypoint');
                    missionAudio.playClick();
                  }}
                  className={`p-2 rounded-lg border text-xs font-mono flex flex-col items-center gap-1 transition-all ${
                    activePinMode === 'waypoint'
                      ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 ring-2 ring-cyan-500/40 shadow-sm'
                      : 'bg-slate-900/60 border-slate-700/80 text-cyan-400 hover:bg-slate-800'
                  }`}
                >
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px]">+ WAYPOINT</span>
                </button>
              </div>
            </div>

            {/* Waypoint Sequence List */}
            <div className="mt-3.5">
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                {routeData.waypoints.length === 0 ? (
                  <div className="p-3 text-center text-slate-500 text-[11px] border border-dashed border-slate-800 rounded-lg">
                    No waypoints pinned. Click "SET BASE" then tap on Mars terrain to begin.
                  </div>
                ) : (
                  routeData.waypoints.map((wp, index) => {
                    const isStart = index === 0;
                    const isEnd = index === routeData.waypoints.length - 1 && routeData.waypoints.length > 1;

                    return (
                      <div
                        key={wp.id}
                        className="flex items-center justify-between p-2 rounded bg-slate-900/50 border border-slate-800/80 hover:border-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                              isStart
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                                : isEnd
                                ? 'bg-pink-500/20 text-pink-300 border border-pink-400/50'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                            }`}
                          >
                            {isStart ? 'A' : isEnd ? 'B' : index}
                          </span>
                          <div>
                            <div className="text-white font-medium text-[11px]">{wp.name}</div>
                            <div className="text-[9px] text-slate-400">
                              [{wp.x}, {wp.z}] // {wp.elevation}m
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onRemoveWaypoint(wp.id);
                            missionAudio.playClick();
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remove waypoint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Route Action Controls */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
              <button
                onClick={handleTriggerCalculate}
                disabled={routeData.waypoints.length < 2}
                className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-cyan-glow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>CALCULATE SAFE ROUTE</span>
              </button>

              <button
                onClick={onClearRoute}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 text-xs font-mono transition-colors"
                title="Clear all waypoints"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleExportGeoJSON}
                disabled={routeData.pathPoints.length === 0}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 text-xs font-mono transition-colors disabled:opacity-40"
                title="Export Route GeoJSON Manifest"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
