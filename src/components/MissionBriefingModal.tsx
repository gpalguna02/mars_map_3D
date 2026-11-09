import React from 'react';
import { X, Compass, Mountain, Layers, Database, Radio, Sun, Footprints, Truck, ShieldAlert } from 'lucide-react';

interface MissionBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MissionBriefingModal: React.FC<MissionBriefingModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-cyan-500/40 rounded-2xl shadow-cyan-glow overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-400/50 flex items-center justify-center text-cyan-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold text-white tracking-wider">
                SOL NAV // EXPEDITION OPERATIONAL MANUAL
              </h2>
              <p className="text-[10px] font-mono text-cyan-400">MARTIAN SURFACE EVA FLIGHT RULES & SUBSYSTEMS</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6 font-mono text-xs">
          {/* Section 1: Core Navigation */}
          <div>
            <h3 className="text-cyan-300 font-bold flex items-center gap-2 text-xs uppercase mb-2">
              <Compass className="w-4 h-4 text-cyan-400" /> 1. EVA Route Planning & Waypoints
            </h3>
            <p className="text-slate-300 font-sans leading-relaxed text-xs">
              Use the top-right <strong>EVA ROUTE PLANNER</strong> to drop "Base Camp" (Start) and "Target Objective" (End) pins directly onto the 3D Martian terrain. The navigator calculates the optimal, safest path using an elevation A* algorithm with steep slope penalties. Add custom waypoints to circumvent hazardous rock formations or soft sand sinks.
            </p>
          </div>

          {/* Section 2: 2D Elevation Profile & Slope Hazard Warnings */}
          <div>
            <h3 className="text-emerald-300 font-bold flex items-center gap-2 text-xs uppercase mb-2">
              <Mountain className="w-4 h-4 text-emerald-400" /> 2. 2D Elevation Cross-Section & Incline Warnings
            </h3>
            <p className="text-slate-300 font-sans leading-relaxed text-xs">
              When a route is calculated, an interactive 2D cross-section graph renders at the bottom. Slopes &lt;8° are marked safe (<span className="text-cyan-400">Cyan</span>), 8°-15° are moderate (<span className="text-amber-400">Amber</span>), and slopes exceeding <strong>15°</strong> trigger critical rollover hazard alerts (<span className="text-rose-400">Red</span>). Hovering over the graph highlights the exact 3D point on the terrain with synchronized telemetry!
            </p>
          </div>

          {/* Section 3: Scientific Datasets */}
          <div>
            <h3 className="text-purple-300 font-bold flex items-center gap-2 text-xs uppercase mb-2">
              <Layers className="w-4 h-4 text-purple-400" /> 3. Multi-Layer Scientific Overlays
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 font-sans text-[11px]">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="font-mono text-orange-400 font-bold block mb-1">OPTICAL LAYER</span>
                HiRISE true-color visible surface regolith, bedrock basalt, and rock scatter.
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="font-mono text-emerald-400 font-bold block mb-1">TOPOGRAPHIC LAYER</span>
                Hypsometric elevation color mapping (-4500m to +3200m) with 50m contour isohypses.
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="font-mono text-amber-400 font-bold block mb-1">THERMAL INFRARED</span>
                THEMIS temperature mapping: highlights cold traps (&lt;150K) and solar-heated rocks.
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="font-mono text-purple-400 font-bold block mb-1">SPECTRAL MINERALOGY</span>
                CRISM mineral analysis: hydrated clays/ice (neon cyan), hematite (red), basalt (purple).
              </div>
            </div>
          </div>

          {/* Section 4: SQL Database Integration */}
          <div>
            <h3 className="text-amber-300 font-bold flex items-center gap-2 text-xs uppercase mb-2">
              <Database className="w-4 h-4 text-amber-400" /> 4. Live SQL Database & 3D Spatial Plotting
            </h3>
            <p className="text-slate-300 font-sans leading-relaxed text-xs">
              Execute live SQLite queries in the bottom-right terminal (e.g. <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">SELECT * FROM hazards WHERE type='dust_storm'</code>). The results update the data table and <strong>simultaneously plot interactive glowing 3D markers</strong> on the Mars surface with radar halos!
            </p>
          </div>

          {/* Section 5: LOS Comms & Solar Radiation */}
          <div>
            <h3 className="text-cyan-300 font-bold flex items-center gap-2 text-xs uppercase mb-2">
              <Radio className="w-4 h-4 text-cyan-400" /> 5. Line-of-Sight (LOS) Comms & Solar Day
            </h3>
            <p className="text-slate-300 font-sans leading-relaxed text-xs">
              Sol Nav performs raycasting from Base Camp's 25m comm mast to the astronaut traverse. If a mountain ridge or crater wall occludes the radio signal, the beam turns red and comms dead-zones are flagged. The Sol slider (00:00 to 24:39) adjusts solar shadows, day/night atmospheric color shifts, and rover solar charging.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-500">SOL NAV EVA SYSTEM // NASA-ARES ARCHITECTURE</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs transition-colors"
          >
            ACKNOWLEDGE & ENTER 3D MAP
          </button>
        </div>
      </div>
    </div>
  );
};
