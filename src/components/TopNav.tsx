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
    <header className="fixed top-3 left-1/2 -translate-x-1/2 max-w-[96vw] h-13 px-4 py-1.5 bg-slate-950/75 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-between gap-3 sm:gap-4 z-40 shadow-2xl shadow-black/80 select-none">
      {/* Sol Nav Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 via-red-600 to-amber-500 p-0.5 shadow-lg shadow-orange-500/30">
            <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
              <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <h1 className="font-sans font-bold tracking-wider text-sm text-white flex items-center gap-1">
                SOL NAV <span className="text-cyan-400 font-semibold text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950/80 border border-cyan-500/40">3D</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Sector Selector Dropdown */}
        <div className="hidden md:flex items-center pl-2 border-l border-white/10">
          <select
            value={sector}
            onChange={(e) => {
              onSelectSector(e.target.value as SectorId);
              missionAudio.playClick();
            }}
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1 text-xs font-sans text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer transition-colors"
          >
            <option value="jezero" className="bg-slate-900 text-white">Jezero Crater (Delta & Rim)</option>
            <option value="gale" className="bg-slate-900 text-white">Gale Crater & Mt. Sharp</option>
            <option value="olympus" className="bg-slate-900 text-white">Olympus Mons Caldera Rim</option>
            <option value="valles" className="bg-slate-900 text-white">Valles Marineris Chasma</option>
          </select>
        </div>

        {/* Backend API Link Indicator */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono">
          <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className={backendOnline ? 'text-emerald-300 font-medium' : 'text-slate-500'}>
            {backendOnline ? 'LINK :3001 [ACTIVE]' : 'STANDALONE'}
          </span>
        </div>
      </div>

      {/* Middle: Sol Day & Solar Time Slider */}
      <div className="flex items-center gap-3 sm:gap-4 bg-white/5 border border-white/10 rounded-full px-3 sm:px-4 py-1">
        <div className="flex items-center gap-1.5">
          {isDaylight ? (
            <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <div className="font-mono text-xs">
            <span className="text-slate-400 text-[10px] hidden sm:inline">SOL {solDay} </span>
            <span className="text-white font-bold">{formattedTime}</span>
            <span className="text-[9px] text-cyan-400 ml-1">MTC</span>
          </div>
        </div>

        <div className="flex items-center w-20 sm:w-32 md:w-40">
          <input
            type="range"
            min="0"
            max="24.65"
            step="0.25"
            value={solHour}
            onChange={(e) => setSolHour(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange-500"
            title="Martian Sol Time (Lighting & Solar Angles)"
          />
        </div>
      </div>

      {/* Right: EVA Navigation Mode, Audio, and Briefing */}
      <div className="flex items-center gap-2">
        {/* EVA Mode Toggle: Suit vs Rover */}
        <div className="flex items-center p-0.5 rounded-full bg-white/5 border border-white/10">
          <button
            onClick={() => {
              setEvaMode('suit');
              missionAudio.playClick();
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-sans transition-all ${
              evaMode === 'suit'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Astronaut EVA Suit (Foot Traverse)"
          >
            <Footprints className="w-3 h-3" />
            <span className="hidden lg:inline">SUIT</span>
          </button>
          <button
            onClick={() => {
              setEvaMode('rover');
              missionAudio.playClick();
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-sans transition-all ${
              evaMode === 'rover'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Pressurized Rover (Drive Traverse)"
          >
            <Truck className="w-3 h-3" />
            <span className="hidden lg:inline">ROVER</span>
          </button>
        </div>

        {/* Audio Mute/Unmute */}
        <button
          onClick={toggleSound}
          className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
          title={isMuted ? 'Unmute Telemetry Sounds' : 'Mute Telemetry Sounds'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
        </button>

        {/* Mission Manual / Help Modal */}
        <button
          onClick={onOpenBriefing}
          className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 hover:text-cyan-200 transition-colors"
          title="Mission EVA Briefing & Sol Nav Manual"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Clean Mode / HUD Toggle */}
        <button
          onClick={() => {
            setShowHud(!showHud);
            missionAudio.playClick();
          }}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-sans font-medium border transition-all ${
            showHud
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-md shadow-cyan-500/20'
              : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
          }`}
          title={showHud ? 'Hide All Panels (Pure 3D Mars)' : 'Show Mission Control Panels'}
        >
          <Eye className="w-3 h-3" />
          <span>{showHud ? 'HIDE' : 'TOOLS'}</span>
        </button>
      </div>
    </header>
  );
};
