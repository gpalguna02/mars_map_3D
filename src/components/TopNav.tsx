import React from 'react';
import { SectorId, EvaMode } from '../types';
import { SECTORS } from '../utils/terrain';
import { Sun, Moon, Volume2, VolumeX, Compass, ShieldAlert, Footprints, Truck, Info, HelpCircle, Eye } from 'lucide-react';
import { missionAudio } from '../utils/audio';

interface TopNavProps {
  sector: SectorId;
  onSelectSector: (s: SectorId) => void;
  solHour: number;
  setSolHour: (h: number) => void;
  solDay: number;
  evaMode: EvaMode;
  setEvaMode: (m: EvaMode) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
  onOpenBriefing: () => void;
  showHud: boolean;
  setShowHud: (s: boolean) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  sector,
  onSelectSector,
  solHour,
  setSolHour,
  solDay,
  evaMode,
  setEvaMode,
  isMuted,
  setIsMuted,
  onOpenBriefing,
  showHud,
  setShowHud
}) => {
  const currentSector = SECTORS[sector];
  const [backendOnline, setBackendOnline] = React.useState<boolean>(false);

  React.useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('/api/health');
        setBackendOnline(res.ok);
      } catch {
        setBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 4000);
    return () => clearInterval(interval);
  }, []);

  // Convert solHour (0 to 24.65) to Martian HH:MM
  const totalMinutes = Math.floor((solHour % 24.65) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const isDaylight = solHour >= 6.0 && solHour <= 18.5;

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    missionAudio.setMuted(next);
    if (!next) missionAudio.playClick();
  };

  return (
    <header className="h-16 w-full bg-slate-950/85 backdrop-blur-md border-b border-cyan-500/25 px-4 flex items-center justify-between z-30 select-none">
      {/* Sol Nav Brand & Logo */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 via-amber-600 to-cyan-500 p-0.5 shadow-cyan-glow">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
              <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-bold tracking-wider text-base text-white flex items-center gap-1.5">
                SOL NAV <span className="text-cyan-400 font-semibold text-xs px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40">EVA-3D</span>
              </h1>
            </div>
            <p className="text-[10px] font-mono text-slate-400 tracking-tight">MARTIAN SURFACE EXPEDITION ROUTER</p>
          </div>
        </div>

        {/* Sector Selector Dropdown */}
        <div className="hidden lg:flex items-center pl-4 border-l border-slate-800">
          <div className="flex flex-col">
            <label className="text-[9px] font-mono uppercase text-slate-500">OPERATIONAL SECTOR</label>
            <select
              value={sector}
              onChange={(e) => {
                onSelectSector(e.target.value as SectorId);
                missionAudio.playClick();
              }}
              className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="jezero">Jezero Crater (Delta & Rim)</option>
              <option value="gale">Gale Crater & Mt. Sharp</option>
              <option value="olympus">Olympus Mons Caldera Rim</option>
              <option value="valles">Valles Marineris Chasma</option>
            </select>
          </div>
        </div>

        {/* Backend API Link Indicator */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono">
          <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className={backendOnline ? 'text-emerald-300 font-semibold' : 'text-slate-500'}>
            {backendOnline ? 'BACKEND LINK :3001' : 'STANDALONE MODE'}
          </span>
        </div>
      </div>

      {/* Middle: Sol Day & Solar Time Slider */}
      <div className="flex items-center gap-6 bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-1.5">
        <div className="flex items-center gap-2">
          {isDaylight ? (
            <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
          ) : (
            <Moon className="w-4 h-4 text-cyan-400" />
          )}
          <div className="font-mono text-xs">
            <span className="text-slate-400">SOL {solDay}</span>
            <span className="mx-2 text-slate-600">//</span>
            <span className="text-white font-bold">{formattedTime}</span>
            <span className="text-[10px] text-cyan-400 ml-1">MTC</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-36 sm:w-48">
          <input
            type="range"
            min="0"
            max="24.65"
            step="0.25"
            value={solHour}
            onChange={(e) => setSolHour(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            title="Adjust Martian Sol Time (Lighting & Solar Angles)"
          />
        </div>
      </div>

      {/* Right: EVA Navigation Mode, Audio, and Briefing */}
      <div className="flex items-center gap-3">
        {/* EVA Mode Toggle: Suit vs Rover */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-700/80">
          <button
            onClick={() => {
              setEvaMode('suit');
              missionAudio.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all ${
              evaMode === 'suit'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-cyan-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Astronaut EVA Suit (Foot Traverse - max incline ~22°, metabolic O2 consumption)"
          >
            <Footprints className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SUIT (WALK)</span>
          </button>
          <button
            onClick={() => {
              setEvaMode('rover');
              missionAudio.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all ${
              evaMode === 'rover'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-cyan-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Pressurized Rover (Drivable Vehicle - max incline ~15°, battery & solar recharge)"
          >
            <Truck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ROVER (DRIVE)</span>
          </button>
        </div>

        {/* Audio Mute/Unmute */}
        <button
          onClick={toggleSound}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
          title={isMuted ? 'Unmute Telemetry Sounds' : 'Mute Telemetry Sounds'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>

        {/* Mission Manual / Help Modal */}
        <button
          onClick={onOpenBriefing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/40 text-xs font-mono transition-all"
          title="Mission EVA Briefing & Sol Nav Manual"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden md:inline">MANUAL</span>
        </button>

        {/* Clean Mode / HUD Toggle */}
        <button
          onClick={() => {
            setShowHud(!showHud);
            missionAudio.playClick();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
            showHud
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-cyan-glow'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
          }`}
          title={showHud ? 'Hide All Panels (Pure 3D Mars)' : 'Show Mission Control Panels'}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showHud ? 'HIDE PANELS' : 'SHOW TOOLS'}</span>
        </button>
      </div>
    </header>
  );
};
