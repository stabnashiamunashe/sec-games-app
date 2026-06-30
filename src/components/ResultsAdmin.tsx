import React, { useState } from 'react';
import { Stage, Match, Bracket, Team } from '../types';
import { WORLD_CUP_TEAMS, createInitialBracket, propagateBracketWinners } from '../data/teams';
import { Check, Info, Shield, RefreshCw, Sparkles } from 'lucide-react';

interface ResultsAdminProps {
  actualResults: Record<string, string>; // matchId -> winnerId
  onUpdateResults: (updatedResults: Record<string, string>) => void;
}

export default function ResultsAdmin({
  actualResults,
  onUpdateResults,
}: ResultsAdminProps) {
  const [selectedStage, setSelectedStage] = useState<Stage>('R32');

  // Compute actual bracket using propagation
  const actualBracket = propagateBracketWinners(createInitialBracket(), actualResults);

  const getTeamObj = (id: string | null): Team | null => {
    if (!id) return null;
    return WORLD_CUP_TEAMS.find((t) => t.id === id) || null;
  };

  const handleSelectWinner = (matchId: string, winnerId: string | null) => {
    if (!winnerId) return;

    const updated = { ...actualResults, [matchId]: winnerId };

    // Also handle Champion propagation if Final
    if (matchId === 'Final-1') {
      updated['Champion'] = winnerId;
    }

    // Since we propagated, we might have invalidated future round selections.
    // Let's clear any invalid future selections.
    const tempBracket = propagateBracketWinners(createInitialBracket(), updated);
    const cleanResults = { ...updated };

    tempBracket.R16.forEach(m => {
      const allowed = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      const chosen = cleanResults[m.id];
      if (chosen && !allowed.includes(chosen)) {
        delete cleanResults[m.id];
      }
    });

    const tempBracket2 = propagateBracketWinners(createInitialBracket(), cleanResults);
    tempBracket2.QF.forEach(m => {
      const allowed = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      const chosen = cleanResults[m.id];
      if (chosen && !allowed.includes(chosen)) {
        delete cleanResults[m.id];
      }
    });

    const tempBracket3 = propagateBracketWinners(createInitialBracket(), cleanResults);
    tempBracket3.SF.forEach(m => {
      const allowed = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      const chosen = cleanResults[m.id];
      if (chosen && !allowed.includes(chosen)) {
        delete cleanResults[m.id];
      }
    });

    const tempBracket4 = propagateBracketWinners(createInitialBracket(), cleanResults);
    tempBracket4.Final.forEach(m => {
      const allowed = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      const chosen = cleanResults[m.id];
      if (chosen && !allowed.includes(chosen)) {
        delete cleanResults[m.id];
      }
    });

    const tempBracket5 = propagateBracketWinners(createInitialBracket(), cleanResults);
    if (cleanResults['Champion'] && cleanResults['Champion'] !== tempBracket5.Final[0].winnerId) {
      cleanResults['Champion'] = tempBracket5.Final[0].winnerId || '';
    }

    onUpdateResults(cleanResults);
  };

  // Helper to simulate realistic results (randomly picks winners down the chain)
  const handleSimulateResults = () => {
    const simResults: Record<string, string> = {};

    // 1. R32
    actualBracket.R32.forEach(m => {
      const candidates = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      simResults[m.id] = candidates[Math.floor(Math.random() * candidates.length)];
    });

    // 2. R16
    let temp = propagateBracketWinners(createInitialBracket(), simResults);
    temp.R16.forEach(m => {
      const candidates = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      if (candidates.length > 0) {
        simResults[m.id] = candidates[Math.floor(Math.random() * candidates.length)];
      }
    });

    // 3. QF
    temp = propagateBracketWinners(createInitialBracket(), simResults);
    temp.QF.forEach(m => {
      const candidates = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      if (candidates.length > 0) {
        simResults[m.id] = candidates[Math.floor(Math.random() * candidates.length)];
      }
    });

    // 4. SF
    temp = propagateBracketWinners(createInitialBracket(), simResults);
    temp.SF.forEach(m => {
      const candidates = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      if (candidates.length > 0) {
        simResults[m.id] = candidates[Math.floor(Math.random() * candidates.length)];
      }
    });

    // 5. Final
    temp = propagateBracketWinners(createInitialBracket(), simResults);
    const finalCand = [temp.Final[0].homeTeamId, temp.Final[0].awayTeamId].filter(Boolean) as string[];
    if (finalCand.length > 0) {
      const winner = finalCand[Math.floor(Math.random() * finalCand.length)];
      simResults[temp.Final[0].id] = winner;
      simResults['Champion'] = winner;
    }

    onUpdateResults(simResults);
  };

  const handleClearResults = () => {
    onUpdateResults({});
  };

  const getActiveStageMatches = (): Match[] => {
    switch (selectedStage) {
      case 'R32': return actualBracket.R32;
      case 'R16': return actualBracket.R16;
      case 'QF': return actualBracket.QF;
      case 'SF': return actualBracket.SF;
      case 'Final': return actualBracket.Final;
      default: return actualBracket.R32;
    }
  };

  const stagesList: { id: Stage; label: string; count: number }[] = [
    { id: 'R32', label: 'R32', count: 16 },
    { id: 'R16', label: 'R16', count: 8 },
    { id: 'QF', label: 'QF', count: 4 },
    { id: 'SF', label: 'SF', count: 2 },
    { id: 'Final', label: 'Final', count: 1 },
  ];

  return (
    <div className="space-y-6" id="results-admin-section">
      {/* Top Admin Banner - Geometric Balance Theme */}
      <div className="bg-slate-900 text-white rounded-none p-5 border-4 border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-600 text-white rounded-none p-2.5 border-2 border-slate-700 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-1.5">
              Admin Results Panel
            </h3>
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mt-1">
              Simulate actual outcomes & score predictions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateResults}
            className="flex-1 sm:flex-initial text-xs font-black bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-none flex items-center justify-center gap-1.5 transition-colors border-2 border-slate-900 uppercase tracking-widest cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Simulate Cup
          </button>
          <button
            onClick={handleClearResults}
            className="flex-1 sm:flex-initial text-xs font-black bg-slate-800 hover:bg-slate-700 text-white py-3 px-4 rounded-none flex items-center justify-center gap-1.5 transition-colors border-2 border-slate-900 uppercase tracking-widest cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
            Reset Outcomes
          </button>
        </div>
      </div>

      {/* Stage Tabs - Thick Border box row */}
      <div className="flex bg-slate-300 p-1 border-2 border-slate-900 rounded-none overflow-x-auto gap-1">
        {stagesList.map((stage) => {
          const isActive = selectedStage === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.id)}
              className={`flex-1 min-w-[75px] text-center py-2.5 px-3 rounded-none text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {stage.label}
              <span className={`block text-[8px] font-bold mt-0.5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
                {stage.count} {stage.count === 1 ? 'MATCH' : 'MATCHES'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Bracket Match Grid */}
      <div className="space-y-4">
        {selectedStage === 'Final' && (
          <div className="bg-emerald-600 text-white rounded-none p-5 border-4 border-slate-900 text-center space-y-2 shadow-none max-w-md mx-auto">
            <h4 className="text-xs font-black uppercase tracking-widest text-white flex items-center justify-center gap-2">
              🏆 OFFICIAL CHAMPION SETTLED
            </h4>
            {actualBracket.ChampionId ? (
              <div className="flex flex-col items-center justify-center gap-1">
                <span className="text-4xl filter drop-shadow">{getTeamObj(actualBracket.ChampionId)?.flag}</span>
                <span className="text-xl font-black uppercase tracking-tight">
                  {getTeamObj(actualBracket.ChampionId)?.name}
                </span>
                <span className="text-[10px] text-white font-black bg-slate-900 px-3 py-1.5 rounded-none uppercase tracking-widest mt-2 border border-slate-700">
                  OFFICIAL CHAMPION RECORDED
                </span>
              </div>
            ) : (
              <p className="text-xs text-emerald-100 font-bold uppercase tracking-wider">
                Mark the Final winner below to settle the tournament champion!
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {getActiveStageMatches().map((match, matchIndex) => {
            const homeTeam = getTeamObj(match.homeTeamId);
            const awayTeam = getTeamObj(match.awayTeamId);
            const settledWinnerId = actualResults[match.id];

            const isHomeSelected = settledWinnerId === match.homeTeamId && match.homeTeamId !== null;
            const isAwaySelected = settledWinnerId === match.awayTeamId && match.awayTeamId !== null;

            return (
              <div
                key={match.id}
                className="bg-white rounded-none border-4 border-slate-900 p-4 shadow-none hover:bg-slate-50/30 transition-all relative overflow-hidden flex flex-col justify-between"
              >
                {/* Match Number & Stage indicator */}
                <div className="flex items-center justify-between mb-3 border-b-2 border-slate-200 pb-2">
                  <span className="text-[9px] font-black text-slate-800 bg-slate-200 border border-slate-900 px-2.5 py-1 rounded-none uppercase tracking-widest">
                    {match.stage} - M{matchIndex + 1}
                  </span>
                  {!settledWinnerId && (
                    <span className="text-[9px] text-amber-600 bg-amber-50 font-black border border-amber-200 px-2 py-0.5 rounded-none flex items-center gap-1 uppercase tracking-wider animate-pulse">
                      PENDING PLAY
                    </span>
                  )}
                </div>

                {/* Team Selection Options */}
                <div className="space-y-2">
                  {/* Home Team */}
                  <div
                    onClick={() => match.homeTeamId && handleSelectWinner(match.id, match.homeTeamId)}
                    className={`flex items-center justify-between p-3 rounded-none border-2 transition-all select-none ${
                      match.homeTeamId
                        ? 'cursor-pointer hover:bg-slate-50'
                        : 'bg-slate-50/50 text-slate-400 border-dashed border-slate-200'
                    } ${
                      isHomeSelected
                        ? 'border-indigo-600 bg-indigo-50/50 text-slate-950 font-black'
                        : 'border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">
                        {homeTeam ? homeTeam.flag : '❓'}
                      </span>
                      <span className={`font-black text-xs sm:text-sm uppercase tracking-tight ${isHomeSelected ? 'text-indigo-950 font-black' : 'text-slate-700'}`}>
                        {homeTeam ? homeTeam.name : (match.homeTeamLabel || 'Pending Team')}
                      </span>
                    </div>
                    {isHomeSelected && (
                      <div className="w-5 h-5 rounded-none bg-indigo-600 border border-slate-900 flex items-center justify-center text-white">
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      </div>
                    )}
                  </div>

                  {/* Versus Separator */}
                  <div className="flex items-center justify-center py-0.5">
                    <span className="text-[10px] font-black text-slate-400 tracking-widest font-mono">VS</span>
                  </div>

                  {/* Away Team */}
                  <div
                    onClick={() => match.awayTeamId && handleSelectWinner(match.id, match.awayTeamId)}
                    className={`flex items-center justify-between p-3 rounded-none border-2 transition-all select-none ${
                      match.awayTeamId
                        ? 'cursor-pointer hover:bg-slate-50'
                        : 'bg-slate-50/50 text-slate-400 border-dashed border-slate-200'
                    } ${
                      isAwaySelected
                        ? 'border-indigo-600 bg-indigo-50/50 text-slate-950 font-black'
                        : 'border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">
                        {awayTeam ? awayTeam.flag : '❓'}
                      </span>
                      <span className={`font-black text-xs sm:text-sm uppercase tracking-tight ${isAwaySelected ? 'text-indigo-950 font-black' : 'text-slate-700'}`}>
                        {awayTeam ? awayTeam.name : (match.awayTeamLabel || 'Pending Team')}
                      </span>
                    </div>
                    {isAwaySelected && (
                      <div className="w-5 h-5 rounded-none bg-indigo-600 border border-slate-900 flex items-center justify-center text-white">
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
