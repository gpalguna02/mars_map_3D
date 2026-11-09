import React, { useRef, useState } from 'react';
import { RouteData } from '../types';
import { AlertTriangle, TrendingUp, TrendingDown, Radio, Sun, ArrowUpRight } from 'lucide-react';

interface ElevationProfileProps {
  routeData: RouteData;
  hoveredIndex: number | null;
  setHoveredIndex: (idx: number | null) => void;
}

export const ElevationProfile: React.FC<ElevationProfileProps> = ({
  routeData,
  hoveredIndex,
  setHoveredIndex
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (routeData.pathPoints.length === 0) {
    return null;
  }

  const points = routeData.pathPoints;
  const elevations = points.map(p => p.elevation);
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const elevRange = Math.max(50, maxElev - minElev);
  const totalDist = routeData.totalDistanceKm || 0.1;

  // SVG Chart Dimensions
  const svgWidth = 800;
  const svgHeight = 120;
  const paddingX = 20;
  const paddingY = 20;

  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  // Build SVG path
  const coords = points.map((p, i) => {
    const x = paddingX + (p.distanceFromStart / totalDist) * chartW;
    const y = svgHeight - paddingY - ((p.elevation - minElev) / elevRange) * chartH;
    return { x, y, point: p, index: i };
  });

  const pathD = coords.reduce((acc, curr, i) => {
    return i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${svgHeight - paddingY} L ${coords[0].x} ${svgHeight - paddingY} Z`;

  // Handle Mouse Move over SVG for synchronized inspection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (mouseX - paddingX) / chartW));
    const closestIdx = Math.round(ratio * (points.length - 1));
    setHoveredIndex(closestIdx);
  };

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : points[points.length - 1];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-4xl">
      <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 rounded-xl p-3.5 shadow-cyan-glow text-slate-200 transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              ELEVATION PROFILE & SLOPE CROSS-SECTION
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-400">
              <TrendingUp className="w-3 h-3 text-emerald-400" /> +{routeData.elevationGainM}m
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <TrendingDown className="w-3 h-3 text-rose-400" /> -{routeData.elevationLossM}m
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              {collapsed ? 'SHOW' : 'HIDE'}
            </button>
          </div>
        </div>

        {!collapsed && (
          <>
            {/* 2D Cross Section SVG Graphic */}
            <div ref={containerRef} className="relative w-full h-28 bg-slate-900/60 rounded-lg p-1 border border-slate-800/80 overflow-hidden">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full cursor-crosshair overflow-visible"
                preserveAspectRatio="none"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <defs>
                  {/* Elevation fill gradient */}
                  <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.0" />
                  </linearGradient>

                  {/* 15 deg danger zone line pattern */}
                  <pattern id="dangerHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="2" strokeOpacity="0.25" />
                  </pattern>
                </defs>

                {/* Grid guidelines */}
                <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="#334155" strokeDasharray="3 3" />
                <line x1={paddingX} y1={svgHeight / 2} x2={svgWidth - paddingX} y2={svgHeight / 2} stroke="#334155" strokeDasharray="3 3" />
                <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="#334155" strokeDasharray="3 3" />

                {/* Fill Area */}
                <path d={areaD} fill="url(#elevGradient)" />

                {/* Elevation Stroke Path */}
                <path d={pathD} fill="none" stroke="#00f2fe" strokeWidth="2.5" strokeLinecap="round" />

                {/* Colored slope segments (>15 deg highlighted red, >8 deg amber) */}
                {coords.map((c, i) => {
                  if (i === 0) return null;
                  const prev = coords[i - 1];
                  const slope = c.point.slopeDeg;
                  let strokeColor = '#00f2fe';
                  if (slope > 15.0) strokeColor = '#ef4444'; // Red hazard
                  else if (slope > 8.0) strokeColor = '#f59e0b'; // Amber warning

                  return (
                    <line
                      key={i}
                      x1={prev.x}
                      y1={prev.y}
                      x2={c.x}
                      y2={c.y}
                      stroke={strokeColor}
                      strokeWidth={slope > 15.0 ? 3.5 : 2.5}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Interactive cursor line */}
                {hoveredIndex !== null && coords[hoveredIndex] && (
                  <g>
                    <line
                      x1={coords[hoveredIndex].x}
                      y1={paddingY}
                      x2={coords[hoveredIndex].x}
                      y2={svgHeight - paddingY}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={coords[hoveredIndex].x}
                      cy={coords[hoveredIndex].y}
                      r="4.5"
                      fill="#00f2fe"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                )}
              </svg>

              {/* Dynamic Telemetry Badge for Hovered Point */}
              {activePoint && (
                <div className="absolute top-2 right-2 bg-slate-950/90 border border-slate-700/80 rounded px-2.5 py-1 text-[11px] font-mono flex items-center gap-3 backdrop-blur-sm">
                  <span>DIST: <strong className="text-white">{activePoint.distanceFromStart} km</strong></span>
                  <span>ELEV: <strong className="text-cyan-300">{activePoint.elevation} m</strong></span>
                  <span className={activePoint.slopeDeg > 15 ? 'text-rose-400 font-bold' : activePoint.slopeDeg > 8 ? 'text-amber-400' : 'text-emerald-400'}>
                    SLOPE: {activePoint.slopeDeg}°
                  </span>
                  <span className={`flex items-center gap-1 ${activePoint.losClear ? 'text-emerald-400' : 'text-rose-400 font-semibold'}`}>
                    <Radio className="w-3 h-3" />
                    {activePoint.losClear ? 'LOS OK' : 'OCCLUDED'}
                  </span>
                  <span className="flex items-center gap-1 text-amber-300">
                    <Sun className="w-3 h-3 text-amber-400" />
                    {activePoint.solarIrradiance} W/m²
                  </span>
                </div>
              )}
            </div>

            {/* Incline Legend & Thresholds */}
            <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-slate-400 px-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> SAFE (&lt;8°)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> MODERATE (8°-15°)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> HAZARD (&gt;15° ROVER LIMIT)
                </span>
              </div>
              <div>
                <span>MIN: {minElev}m</span>
                <span className="mx-2">|</span>
                <span>MAX: {maxElev}m</span>
                <span className="mx-2">|</span>
                <span>AVG SLOPE: {routeData.averageSlopeDeg}°</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
