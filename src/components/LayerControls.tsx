import React, { useState } from 'react';
import { LayerState, LayerType } from '../types';
import { Eye, Layers, Mountain, Flame, Sparkles, Wind, Grid, Sliders, ChevronLeft, ChevronRight } from 'lucide-react';
import { missionAudio } from '../utils/audio';

interface LayerControlsProps {
  layerState: LayerState;
  setLayerState: React.Dispatch<React.SetStateAction<LayerState>>;
}

export const LayerControls: React.FC<LayerControlsProps> = ({ layerState, setLayerState }) => {
  const [collapsed, setCollapsed] = useState(false);

  const handleSelectLayer = (type: LayerType) => {
    missionAudio.playClick();
    setLayerState(prev => ({ ...prev, activeLayer: type }));
  };

  const layers: { id: LayerType; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'optical',
      label: 'Optical (Visible)',
      desc: 'HiRISE & MOLA true-color regolith and rock scatter',
      icon: <Eye className="w-4 h-4 text-orange-400" />,
      color: 'border-orange-500/40 text-orange-300'
    },
    {
      id: 'topographic',
      label: 'Topographic (DEM)',
      desc: 'Hypsometric elevation mapping (-4500m to +3200m) with isohypse contours',
      icon: <Mountain className="w-4 h-4 text-emerald-400" />,
      color: 'border-emerald-500/40 text-emerald-300'
    },
    {
      id: 'thermal',
      label: 'Thermal Infrared',
      desc: 'THEMIS surface temperature gradients (140K cold traps to 280K rock faces)',
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      color: 'border-amber-500/40 text-amber-300'
    },
    {
      id: 'spectral',
      label: 'Spectral Mineralogy',
      desc: 'CRISM composition: hydrated clays & subsurface ice (cyan), basalt (violet)',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      color: 'border-purple-500/40 text-purple-300'
    },
    {
      id: 'atmospheric',
      label: 'Atmospheric & Dust',
      desc: 'Dust storm cell vortices, optical depth tau, and aeolian wind vectors',
      icon: <Wind className="w-4 h-4 text-cyan-400" />,
      color: 'border-cyan-500/40 text-cyan-300'
    }
  ];

  return (
    <div className={`absolute top-20 left-4 z-20 transition-all duration-300 ${collapsed ? '-translate-x-[calc(100%-36px)]' : 'translate-x-0'}`}>
      <div className="relative w-80 bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 rounded-xl p-4 shadow-cyan-glow text-slate-200">
        {/* Toggle Collapse Button */}
        <button
          onClick={() => {
            setCollapsed(!collapsed);
            missionAudio.playClick();
          }}
          className="absolute -right-3.5 top-6 w-7 h-7 rounded-full bg-slate-900 border border-cyan-500/40 text-cyan-400 flex items-center justify-center hover:bg-slate-800 transition-colors shadow-md"
          title={collapsed ? 'Expand Scientific Datasets' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="font-mono text-xs font-bold text-white tracking-wider">SCIENTIFIC DATASETS</h2>
          </div>
          <span className="text-[10px] font-mono text-cyan-400/80 uppercase">MRO / MOLA</span>
        </div>

        {/* Layer Buttons */}
        <div className="mt-3 space-y-2">
          {layers.map((l) => {
            const isActive = layerState.activeLayer === l.id;
            return (
              <button
                key={l.id}
                onClick={() => handleSelectLayer(l.id)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all flex flex-col gap-1 ${
                  isActive
                    ? `bg-slate-900/90 ${l.color} shadow-sm ring-1 ring-cyan-500/30`
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/70'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {l.icon}
                    <span className="font-mono text-xs font-semibold">{l.label}</span>
                  </div>
                  {isActive && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-sans line-clamp-1 pl-6">
                  {l.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Layer Legend / Ramp */}
        <div className="mt-4 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 font-mono text-[10px]">
          <div className="flex items-center justify-between mb-1.5 text-slate-400">
            <span>DATA SCALE</span>
            <span className="text-cyan-400 uppercase">{layerState.activeLayer}</span>
          </div>

          {layerState.activeLayer === 'topographic' && (
            <div>
              <div className="h-2 rounded w-full bg-gradient-to-r from-[#0d268c] via-[#00c0da] via-[#1acb4d] via-[#f3da26] via-[#e65a0d] via-[#d90d1a] to-white" />
              <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                <span>-4,500m (Basin)</span>
                <span>0m Datum</span>
                <span>+3,200m (Peak)</span>
              </div>
            </div>
          )}

          {layerState.activeLayer === 'thermal' && (
            <div>
              <div className="h-2 rounded w-full bg-gradient-to-r from-[#140d59] via-[#59148c] via-[#d9590d] to-[#fff266]" />
              <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                <span>140 K (-133°C)</span>
                <span>210 K</span>
                <span>280 K (+7°C)</span>
              </div>
            </div>
          )}

          {layerState.activeLayer === 'spectral' && (
            <div className="grid grid-cols-2 gap-1.5 text-[9px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00f2fe]" />
                <span className="text-cyan-200">Hydrated Silica / Clays</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2e2647]" />
                <span className="text-slate-300">Pyroxene Basalt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d9381a]" />
                <span className="text-rose-300">Hematite (Fe₂O₃)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f3da4d]" />
                <span className="text-amber-200">Gypsum Sulfates</span>
              </div>
            </div>
          )}

          {layerState.activeLayer === 'atmospheric' && (
            <div>
              <div className="h-2 rounded w-full bg-gradient-to-r from-slate-700 via-orange-800 to-amber-500" />
              <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                <span>Tau 0.4 (Clear)</span>
                <span>Tau 1.2</span>
                <span>Tau 2.5 (Severe Storm)</span>
              </div>
            </div>
          )}

          {layerState.activeLayer === 'optical' && (
            <div className="text-[10px] text-slate-400 italic">
              HiRISE Calibrated visible reflectance (600nm - 800nm band)
            </div>
          )}
        </div>

        {/* Global Overlays & Toggles */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Mountain className="w-3.5 h-3.5 text-cyan-400" /> CONTOUR LINES (50m)
            </span>
            <input
              type="checkbox"
              checked={layerState.showContours}
              onChange={(e) => {
                setLayerState(prev => ({ ...prev, showContours: e.target.checked }));
                missionAudio.playClick();
              }}
              className="accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5 text-cyan-400" /> MISSION GRID MESH
            </span>
            <input
              type="checkbox"
              checked={layerState.showGrid}
              onChange={(e) => {
                setLayerState(prev => ({ ...prev, showGrid: e.target.checked }));
                missionAudio.playClick();
              }}
              className="accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" /> DEM WIREFRAME
            </span>
            <input
              type="checkbox"
              checked={layerState.wireframe}
              onChange={(e) => {
                setLayerState(prev => ({ ...prev, wireframe: e.target.checked }));
                missionAudio.playClick();
              }}
              className="accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
