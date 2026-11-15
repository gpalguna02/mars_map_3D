import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Layers, Sun, Navigation, Eye, EyeOff, AlertTriangle, ChevronUp, ChevronDown, X, Play, Pause, Camera
} from 'lucide-react';

export default function UIControls({
  solHour,
  setSolHour,
  isPlayingTime,
  setIsPlayingTime,
  geologyVisible,
  setGeologyVisible,
  imagesVisible,
  setImagesVisible,
  routeVisible,
  setRouteVisible,
  routeData,
  onCalculateRoute,
  routeLoading,
  selectedImage,
  onCloseImageModal,
}) {
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(true);
  const [startLat, setStartLat] = useState('18.38');
  const [startLon, setStartLon] = useState('77.58');
  const [endLat, setEndLat] = useState('18.42');
  const [endLon, setEndLon] = useState('77.40');

  const handleRouteSubmit = (e) => {
    e.preventDefault();
    onCalculateRoute(parseFloat(startLat), parseFloat(startLon), parseFloat(endLat), parseFloat(endLon));
  };

  const formattedSolTime = () => {
    const hrs = Math.floor(solHour);
    const mins = Math.floor((solHour - hrs) * 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')} MTC`;
  };

  return (
    <>
      {/* 1. TOP HEADER & HUD DOCK */}
      <header className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center space-x-3 bg-black/60 backdrop-blur-md border border-neutral-800/80 px-4 py-2 rounded-xl pointer-events-auto shadow-2xl">
          <div className="w-3 h-3 rounded-full bg-mars-glow animate-pulse" />
          <h1 className="text-sm font-bold tracking-widest text-neutral-100 uppercase">
            SOL NAV <span className="text-mars-glow font-normal">// EVA 3D NAVIGATOR</span>
          </h1>
          <span className="text-xs bg-neutral-900 border border-neutral-700 text-neutral-400 px-2 py-0.5 rounded">
            MOLA DEM 4.0
          </span>
        </div>

        <div className="flex items-center space-x-3 bg-black/60 backdrop-blur-md border border-neutral-800/80 px-4 py-2 rounded-xl pointer-events-auto shadow-2xl text-xs">
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="text-neutral-400">SOL TIME:</span>
          <span className="text-amber-400 font-bold tracking-wider">{formattedSolTime()}</span>
        </div>
      </header>

      {/* 2. LEFT DATA LAYER & ROUTE PLANNER SIDEBAR */}
      <aside className="absolute top-20 left-4 w-80 bg-black/70 backdrop-blur-lg border border-neutral-800/80 rounded-2xl p-4 z-20 space-y-5 shadow-2xl text-xs pointer-events-auto">
        <div>
          <div className="flex items-center space-x-2 text-neutral-400 uppercase tracking-wider mb-3">
            <Layers className="w-4 h-4 text-mars-glow" />
            <span className="font-semibold">Data Layer Hub</span>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => setGeologyVisible(!geologyVisible)}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition ${
                geologyVisible
                  ? 'bg-neutral-900/90 border-mars-glow/40 text-neutral-200'
                  : 'bg-black/30 border-neutral-800/60 text-neutral-500'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${geologyVisible ? 'bg-cyan-400' : 'bg-neutral-600'}`} />
                <span>USGS Geologic Layers</span>
              </div>
              {geologyVisible ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setImagesVisible(!imagesVisible)}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition ${
                imagesVisible
                  ? 'bg-neutral-900/90 border-emerald-500/40 text-neutral-200'
                  : 'bg-black/30 border-neutral-800/60 text-neutral-500'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${imagesVisible ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                <span>Perseverance Image Hub</span>
              </div>
              {imagesVisible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setRouteVisible(!routeVisible)}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition ${
                routeVisible
                  ? 'bg-neutral-900/90 border-amber-500/40 text-neutral-200'
                  : 'bg-black/30 border-neutral-800/60 text-neutral-500'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${routeVisible ? 'bg-amber-400' : 'bg-neutral-600'}`} />
                <span>Curiosity Traverse Path</span>
              </div>
              {routeVisible ? <Eye className="w-4 h-4 text-amber-400" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <form onSubmit={handleRouteSubmit} className="pt-2 border-t border-neutral-800/80 space-y-3">
          <div className="flex items-center space-x-2 text-neutral-400 uppercase tracking-wider">
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold">Curiosity Route Planner</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1">START LAT</label>
              <input
                type="number"
                step="0.01"
                value={startLat}
                onChange={(e) => setStartLat(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-neutral-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1">START LON</label>
              <input
                type="number"
                step="0.01"
                value={startLon}
                onChange={(e) => setStartLon(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-neutral-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1">TARGET LAT</label>
              <input
                type="number"
                step="0.01"
                value={endLat}
                onChange={(e) => setEndLat(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-neutral-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1">TARGET LON</label>
              <input
                type="number"
                step="0.01"
                value={endLon}
                onChange={(e) => setEndLon(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-neutral-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={routeLoading}
            className="w-full py-2 bg-mars-rust hover:bg-mars-glow text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {routeLoading ? 'CALCULATING TRAVERSE...' : 'DISPATCH A* PATHFINDING'}
          </button>
        </form>

        <div className="pt-2 border-t border-neutral-800/80 space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Worldview Sun Angle</span>
            <button
              onClick={() => setIsPlayingTime(!isPlayingTime)}
              className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition"
              title={isPlayingTime ? 'Pause Time' : 'Play Time-Lapse'}
            >
              {isPlayingTime ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="24.66"
            step="0.1"
            value={solHour}
            onChange={(e) => setSolHour(parseFloat(e.target.value))}
            className="w-full accent-mars-glow cursor-pointer bg-neutral-900 h-1.5 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-neutral-500">
            <span>00:00 (Dawn)</span>
            <span>12:00 (Noon)</span>
            <span>24:39 (Night)</span>
          </div>
        </div>
      </aside>

      {/* 3. BOTTOM DRAWER: ELEVATION PROFILE GRAPH */}
      <section className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-xl border border-neutral-800/90 rounded-2xl p-4 z-20 pointer-events-auto transition-all shadow-2xl">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/80 text-xs">
          <div className="flex items-center space-x-3">
            <span className="font-bold tracking-wider text-neutral-200 uppercase">
              MOLA Elevation Cross-Section
            </span>
            {routeData && (
              <>
                <span className="text-neutral-500">|</span>
                <span className="text-neutral-400">Dist: <strong className="text-neutral-200">{routeData.total_distance_km} km</strong></span>
                <span className="text-neutral-500">|</span>
                <span className="text-neutral-400">Max Slope: <strong className="text-neutral-200">{routeData.max_slope_deg}°</strong></span>
                {routeData.hazard_count > 0 && (
                  <span className="flex items-center space-x-1 text-mars-hazard bg-red-950/60 border border-red-800/80 px-2 py-0.5 rounded-full text-[10px]">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{routeData.hazard_count} Hazard Segments (&gt;15°)</span>
                  </span>
                )}
              </>
            )}
          </div>

          <button
            onClick={() => setProfileDrawerOpen(!profileDrawerOpen)}
            className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            {profileDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {profileDrawerOpen && (
          <div className="w-full h-36">
            {routeData && routeData.points && routeData.points.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={routeData.points} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="distance_km"
                    stroke="#525252"
                    tick={{ fill: '#737373', fontSize: 10 }}
                    unit=" km"
                  />
                  <YAxis
                    dataKey="elevation_m"
                    stroke="#525252"
                    tick={{ fill: '#737373', fontSize: 10 }}
                    unit="m"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const pt = payload[0].payload;
                        return (
                          <div className="bg-neutral-950/95 border border-neutral-700 p-2.5 rounded-lg text-[11px] shadow-xl space-y-1">
                            <div className="text-neutral-400">Station: {pt.distance_km} km</div>
                            <div className="text-cyan-400 font-bold">Elev: {pt.elevation_m} m</div>
                            <div className={pt.is_hazard ? 'text-red-400 font-bold flex items-center space-x-1' : 'text-neutral-300'}>
                              <span>Slope: {pt.slope_deg}°</span>
                              {pt.is_hazard && <span>(CRITICAL HAZARD)</span>}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="elevation_m"
                    stroke="#00e5ff"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#elevationGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                Dispatch Curiosity Route Planner to compute elevation cross-section.
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. PERSEVERANCE RAW IMAGE MODAL */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-neutral-200">{selectedImage.title}</h3>
              </div>
              <button
                onClick={onCloseImageModal}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black border border-neutral-900">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.title}
                  className="w-full h-auto object-cover max-h-96"
                />
                <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded text-[10px] text-emerald-400 font-bold border border-emerald-900/60">
                  {selectedImage.camera}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                  <div className="text-neutral-500 text-[10px]">MARTIAN SOL</div>
                  <div className="font-bold text-neutral-200">Sol {selectedImage.sol}</div>
                </div>
                <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                  <div className="text-neutral-500 text-[10px]">EARTH DATE</div>
                  <div className="font-bold text-neutral-200">{selectedImage.earth_date}</div>
                </div>
                <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                  <div className="text-neutral-500 text-[10px]">ELEVATION</div>
                  <div className="font-bold text-neutral-200">{selectedImage.elevation_m} m</div>
                </div>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed bg-neutral-900/40 p-3 rounded-lg border border-neutral-900">
                {selectedImage.caption}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
