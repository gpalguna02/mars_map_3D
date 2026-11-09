import React, { useState } from 'react';
import { RouteData, EvaMode } from '../types';
import { Clock, Battery, Wind, Radio, Sun, ShieldAlert, Activity, ChevronUp, ChevronDown } from 'lucide-react';

interface TelemetryPanelProps {
  routeData: RouteData;
  evaMode: EvaMode;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ routeData, evaMode }) => {
  const [minimized, setMinimized] = useState(false);

  const formattedHours = Math.floor(routeData.estimatedTimeMin / 60);
  const formattedMins = routeData.estimatedTimeMin % 60;
  const timeDisplay = `${formattedHours}h ${formattedMins}m`;

  // Standard EVA suit backpack carries ~1.8 kg O2 (enough for 8-10 hours)
  // Rover has dual 15 kg oxygen tanks
  const maxO2 = evaMode === 'suit' ? 1.8 : 30.0;
  const o2RemainingPct = Math.max(0, Math.round((1 - routeData.o2ConsumptionKg / maxO2) * 100));

  // Rover battery 50 kWh; Suit PLSS battery 2.5 kWh
  const maxBattery = evaMode === 'suit' ? 2.5 : 50.0;
  const batteryRemainingPct = Math.max(0, Math.round((1 - routeData.batteryUsageKwh / maxBattery) * 100));

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 hidden md:block">
      <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 rounded-xl px-4 py-2.5 shadow-cyan-glow text-slate-200">
        <div className="flex items-center gap-6">
          {/* Distance */}
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase text-slate-400">TOTAL DISTANCE</span>
            <div className="font-mono text-sm font-bold text-white flex items-baseline gap-1">
              <span>{routeData.totalDistanceKm}</span>
              <span className="text-[10px] text-cyan-400 font-normal">KM</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Travel Time */}
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-cyan-400" /> TIME EST.
            </span>
            <div className="font-mono text-sm font-bold text-cyan-300">
              {timeDisplay}
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Oxygen Consumption */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono uppercase text-slate-400 flex items-center gap-1">
                <Wind className="w-2.5 h-2.5 text-cyan-400" /> O₂ CONSUMPTION
              </span>
              <span className={`text-[9px] font-mono font-semibold ${o2RemainingPct < 25 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {o2RemainingPct}% REM
              </span>
            </div>
            <div className="font-mono text-sm font-bold text-white flex items-baseline gap-1">
              <span>{routeData.o2ConsumptionKg}</span>
              <span className="text-[10px] text-slate-400 font-normal">KG O₂</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Battery Usage */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono uppercase text-slate-400 flex items-center gap-1">
                <Battery className="w-2.5 h-2.5 text-amber-400" /> BATTERY / PWR
              </span>
              <span className={`text-[9px] font-mono font-semibold ${batteryRemainingPct < 25 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {batteryRemainingPct}%
              </span>
            </div>
            <div className="font-mono text-sm font-bold text-white flex items-baseline gap-1">
              <span>{routeData.batteryUsageKwh}</span>
              <span className="text-[10px] text-slate-400 font-normal">KWH</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Line of Sight Comms */}
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 text-emerald-400" /> BASE COMMS (LOS)
            </span>
            <div className="font-mono text-sm font-bold flex items-center gap-1">
              <span className={routeData.losCoveragePercent < 60 ? 'text-rose-400' : routeData.losCoveragePercent < 85 ? 'text-amber-400' : 'text-emerald-400'}>
                {routeData.losCoveragePercent}%
              </span>
              <span className="text-[9px] text-slate-400 uppercase font-normal">COVERAGE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
