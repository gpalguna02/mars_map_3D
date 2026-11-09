import React, { useState, useEffect } from 'react';
import { Terminal, Play, Database, Table, Sparkles, ChevronDown, ChevronUp, Trash2, CheckCircle2 } from 'lucide-react';
import { martianDb, Plotted3DMarker } from '../utils/sqlEngine';
import { SqlQueryResult, SectorId } from '../types';
import { missionAudio } from '../utils/audio';

interface SqlConsoleProps {
  sector: SectorId;
  onPlotMarkers: (markers: Plotted3DMarker[]) => void;
  onClearMarkers: () => void;
  activeMarkerCount: number;
}

export const SqlConsole: React.FC<SqlConsoleProps> = ({
  sector,
  onPlotMarkers,
  onClearMarkers,
  activeMarkerCount
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [query, setQuery] = useState("SELECT * FROM hazards WHERE type='dust_storm' OR severity='critical'");
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [history, setHistory] = useState<string[]>([
    "SELECT * FROM hazards WHERE type='dust_storm' OR severity='critical'",
    "SELECT * FROM safe_zones WHERE zone_type='habitat_hub' OR zone_type='canyon_shelter'",
    "SELECT * FROM scientific_samples WHERE mineral='hydrated_silica' OR mineral='clay_smectite'",
    "SELECT * FROM comms_relays WHERE status='active'"
  ]);

  const presetQueries = [
    { label: 'CRITICAL HAZARDS', q: "SELECT * FROM hazards WHERE severity='critical' OR type='dust_storm'" },
    { label: 'SAFE SHELTERS', q: "SELECT * FROM safe_zones WHERE radius_km >= 2.5" },
    { label: 'HYDRATED MINERALS / ICE', q: "SELECT * FROM scientific_samples WHERE mineral='hydrated_silica' OR mineral='clay_smectite'" },
    { label: 'COMMS RELAYS', q: "SELECT * FROM comms_relays WHERE frequency_ghz >= 8.0" },
    { label: 'EVA CREW STATUS', q: "SELECT * FROM eva_crews" },
    { label: 'ROVER FLEET', q: "SELECT * FROM rovers" }
  ];

  const [querySource, setQuerySource] = useState<'backend' | 'client'>('client');

  const handleExecuteQuery = async (customQ?: string) => {
    const qToRun = customQ || query;
    if (!qToRun.trim()) return;

    missionAudio.playQueryBlip();
    const { result: queryResult, markers, source } = await martianDb.executeQueryRemote(qToRun, sector);
    setResult(queryResult);
    setQuerySource(source);
    onPlotMarkers(markers);

    if (!history.includes(qToRun)) {
      setHistory(prev => [qToRun, ...prev.slice(0, 8)]);
    }
  };

  // Run initial query on mount so map has active markers
  useEffect(() => {
    handleExecuteQuery("SELECT * FROM hazards WHERE type='dust_storm' OR severity='critical'");
  }, [sector]);

  return (
    <div className="absolute bottom-6 right-6 z-20 w-80 sm:w-[480px] max-w-[calc(100vw-32px)]">
      <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/35 rounded-xl shadow-cyan-glow overflow-hidden transition-all text-slate-200">
        {/* Terminal Header */}
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs font-bold text-white tracking-wider">
              ARES-SQL MISSION CONSOLE
            </span>
            {activeMarkerCount > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-400/50 text-cyan-300 animate-pulse">
                {activeMarkerCount} 3D MARKERS PLOTTED
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeMarkerCount > 0 && (
              <button
                onClick={onClearMarkers}
                className="text-[10px] font-mono text-slate-400 hover:text-rose-400 flex items-center gap-1"
                title="Clear plotted 3D markers from map"
              >
                <Trash2 className="w-3 h-3" /> CLEAR PINS
              </button>
            )}
            <button
              onClick={() => setMinimized(!minimized)}
              className="text-slate-400 hover:text-white"
            >
              {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!minimized && (
          <div className="p-3.5 space-y-3">
            {/* Quick Presets / Query Chips */}
            <div>
              <div className="text-[10px] font-mono text-slate-400 mb-1.5 flex items-center gap-1">
                <Database className="w-3 h-3 text-cyan-400" /> QUICK QUERY CHIPS
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presetQueries.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(p.q);
                      handleExecuteQuery(p.q);
                    }}
                    className="px-2 py-1 rounded bg-slate-900 hover:bg-cyan-950/50 border border-slate-700/80 hover:border-cyan-400/50 text-[10px] font-mono text-cyan-300 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SQL Input Area */}
            <div className="relative">
              <div className="flex items-center gap-1 px-3 py-1.5 bg-black/60 border border-slate-700 rounded-t-lg font-mono text-xs text-cyan-400">
                <span className="text-pink-400 font-bold">ares@martian-db:~$</span>
                <span className="text-slate-500 text-[10px]">sqlite3 /sol/telemetry.db</span>
              </div>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleExecuteQuery();
                  }
                }}
                rows={2}
                placeholder="SELECT * FROM hazards WHERE type='dust_storm'..."
                className="w-full bg-slate-950 px-3 py-2 border-x border-b border-slate-700 rounded-b-lg font-mono text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
              />
            </div>

            {/* Execute Button */}
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono text-slate-400">
                Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200">Ctrl+Enter</kbd> to run
              </div>
              <button
                onClick={() => handleExecuteQuery()}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 shadow-cyan-glow transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>EXECUTE SQL & PLOT 3D</span>
              </button>
            </div>

            {/* Query Results Table & Error Display */}
            {result && (
              <div className="mt-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">
                      ROWS: <strong className="text-cyan-400">{result.rowCount}</strong> ({result.executionTimeMs} ms)
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-cyan-500/30 text-[9px] text-cyan-300 uppercase">
                      {querySource === 'backend' ? '⚡ BACKEND API :3001' : '💻 CLIENT ALASQL'}
                    </span>
                  </div>
                  {result.error && (
                    <span className="text-rose-400 font-bold">{result.error}</span>
                  )}
                </div>

                {result.rows.length > 0 && (
                  <div className="max-h-36 overflow-auto border border-slate-800 rounded bg-slate-900/60 font-mono text-[11px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-950 sticky top-0 text-[10px] text-cyan-300 border-b border-slate-800">
                        <tr>
                          {result.columns.map((col) => (
                            <th key={col} className="p-1.5 whitespace-nowrap font-semibold">
                              {col.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {result.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-cyan-950/30">
                            {result.columns.map((col) => (
                              <td key={col} className="p-1.5 whitespace-nowrap text-slate-300">
                                {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
