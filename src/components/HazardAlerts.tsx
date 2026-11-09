import React, { useEffect } from 'react';
import { RouteData } from '../types';
import { AlertTriangle, ShieldAlert, Wind, Mountain, X } from 'lucide-react';
import { missionAudio } from '../utils/audio';

interface HazardAlertsProps {
  routeData: RouteData;
  onAcknowledge?: () => void;
}

export const HazardAlerts: React.FC<HazardAlertsProps> = ({ routeData }) => {
  const isTriggered = routeData.hasSteepWarning || routeData.hasHazardWarning;

  // Sound alarm when hazard first detected
  useEffect(() => {
    if (isTriggered) {
      missionAudio.playHazardAlarm();
    }
  }, [routeData.hasSteepWarning, routeData.hasHazardWarning, routeData.activeHazards.length]);

  if (!isTriggered) return null;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 max-w-lg w-[90%] pointer-events-none">
      <div className="bg-rose-950/90 border-2 border-rose-500 rounded-xl p-3.5 shadow-red-glow backdrop-blur-md text-white animate-bounce pointer-events-auto">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-900/80 border border-rose-400">
            <AlertTriangle className="w-6 h-6 text-rose-300 animate-pulse" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold text-rose-200 tracking-wider flex items-center gap-2">
                CRITICAL EVA HAZARD PROXIMITY ALERT
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-900 text-rose-300 uppercase">
                EMERGENCY HUD
              </span>
            </div>

            <div className="mt-1.5 space-y-1 font-mono text-[11px] text-rose-100">
              {routeData.hasSteepWarning && (
                <div className="flex items-center gap-1.5">
                  <Mountain className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    STEEP INCLINE EXCEEDED: Route slope reaches <strong>{routeData.maxSlopeDeg}°</strong> (Rover limit is 15.0°). Rollover risk!
                  </span>
                </div>
              )}

              {routeData.activeHazards.map((h, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-rose-400" />
                  <span>COLLISION INTERSECTION: <strong>{h}</strong></span>
                </div>
              ))}
            </div>

            <p className="mt-2 text-[10px] text-rose-300/90 font-sans italic">
              ACTION REQUIRED: Insert an intermediate waypoint to skirt around the hazard boundary or lower the traverse slope grade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
