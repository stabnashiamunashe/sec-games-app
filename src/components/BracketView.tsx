import React, { useState, useEffect } from 'react';
import { Stage, Match, Bracket, Team, ParticipatingTeam } from '../types';
import { WORLD_CUP_TEAMS, createInitialBracket, propagateBracketWinners } from '../data/teams';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Edit, Save, Zap, HelpCircle, RefreshCw, Lock } from 'lucide-react';

interface BracketViewProps {
  activeTeam: ParticipatingTeam;
  predictions: Record<string, string>; // matchId -> winnerId
  onSavePredictions: (teamId: string, updatedPredictions: Record<string, string>) => void;
  participatingTeams: ParticipatingTeam[];
  onChangeActiveTeam: (teamId: string) => void;
  currentTime: Date;
}

export default function BracketView({
  activeTeam,
  predictions,
  onSavePredictions,
  participatingTeams,
  onChangeActiveTeam,
  currentTime,
}: BracketViewProps) {
  const [selectedStage, setSelectedStage] = useState<Stage>('R32');
  const [currentPredictions, setCurrentPredictions] = useState<Record<string, string>>({});

  // Reset local state when activeTeam or incoming predictions change
  useEffect(() => {
    setCurrentPredictions({ ...predictions });
  }, [predictions, activeTeam.id]);

  // Construct a visual bracket tree using local predictions
  const visualBracket = propagateBracketWinners(createInitialBracket(), currentPredictions);

  const getTeamObj = (id: string | null): Team | null => {
    if (!id) return null;
    return WORLD_CUP_TEAMS.find((t) => t.id === id) || null;
  };

  const formatKickoff = (isoString?: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getUTCMonth()];
    const day = date.getUTCDate();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${month} ${day}, ${hours}:${minutes} UTC`;
  };

  // Select predicted winner of a match
  const handleSelectWinner = (matchId: string, winnerId: string | null) => {
    if (!winnerId) return;

    // Check if match has started
    const matched = [...visualBracket.R32, ...visualBracket.R16, ...visualBracket.QF, ...visualBracket.SF, ...visualBracket.Final].find(m => m.id === matchId);
    if (matched && matched.kickoff && new Date(matched.kickoff) <= currentTime) {
      // Locked! Do not allow edits.
      return;
    }

    const updated = { ...currentPredictions, [matchId]: winnerId };

    // Also, if this is a final match, set champion
    if (matchId === 'Final-1') {
      updated['Champion'] = winnerId;
    }

    // Since we propagated, we might have invalidated future round selections.
    // Let's clear any invalid future selections.
    const tempBracket = propagateBracketWinners(createInitialBracket(), updated);
    
    // Validate future stages: R16, QF, SF, Final, Champion
    const validTeamIds = new Set<string>();
    WORLD_CUP_TEAMS.forEach(t => validTeamIds.add(t.id));

    const cleanPredictions = { ...updated };

    // For R16, valid options are the actual winners of preceding R32 matches
    tempBracket.R16.forEach(m => {
      const allowed = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      const chosen = cleanPredictions[m.id];
      if (chosen && !allowed.includes(chosen)) {
        delete cleanPredictions[m.id];
      }
    });

    // Re-propagate with cleaned R16 to check QF
    const tempBracket2 = propagateBracketWinners(createInitialBracket(), cleanPredictions);
    tempBracket2.QF.forEach(m => {
      const allowed = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      const chosen = cleanPredictions[m.id];
      if (chosen && !allowed.includes(chosen)) {
        delete cleanPredictions[m.id];
      }
    });

    // Re-propagate to check SF
    const tempBracket3 = propagateBracketWinners(createInitialBracket(), cleanPredictions);
    tempBracket3.SF.forEach(m => {
      const allowed = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      const chosen = cleanPredictions[m.id];
      if (chosen && !allowed.includes(chosen)) {
        delete cleanPredictions[m.id];
      }
    });

    // Re-propagate to check Final
    const tempBracket4 = propagateBracketWinners(createInitialBracket(), cleanPredictions);
    tempBracket4.Final.forEach(m => {
      const allowed = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      const chosen = cleanPredictions[m.id];
      if (chosen && !allowed.includes(chosen)) {
        delete cleanPredictions[m.id];
      }
    });

    // Re-propagate to check Champion
    const tempBracket5 = propagateBracketWinners(createInitialBracket(), cleanPredictions);
    if (cleanPredictions['Champion'] && cleanPredictions['Champion'] !== tempBracket5.Final[0].winnerId) {
      cleanPredictions['Champion'] = tempBracket5.Final[0].winnerId || '';
    }

    setCurrentPredictions(cleanPredictions);
    onSavePredictions(activeTeam.id, cleanPredictions);
  };

  // Helper to pre-populate quick random guesses (preserving started matches)
  const handleQuickFill = () => {
    const randomGuesses: Record<string, string> = { ...currentPredictions };
    
    // Fill R32 matches that haven't started yet
    visualBracket.R32.forEach(m => {
      const isStarted = m.kickoff ? new Date(m.kickoff) <= currentTime : false;
      if (!isStarted) {
        const candidates = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
        if (candidates.length > 0) {
          randomGuesses[m.id] = candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
    });

    // To properly propagate and choose downstream winners, we do it stage-by-stage
    let temp = propagateBracketWinners(createInitialBracket(), randomGuesses);
    temp.R16.forEach(m => {
      const isStarted = m.kickoff ? new Date(m.kickoff) <= currentTime : false;
      if (!isStarted) {
        const candidates = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
        if (candidates.length > 0) {
          randomGuesses[m.id] = candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
    });

    temp = propagateBracketWinners(createInitialBracket(), randomGuesses);
    temp.QF.forEach(m => {
      const isStarted = m.kickoff ? new Date(m.kickoff) <= currentTime : false;
      if (!isStarted) {
        const candidates = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
        if (candidates.length > 0) {
          randomGuesses[m.id] = candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
    });

    temp = propagateBracketWinners(createInitialBracket(), randomGuesses);
    temp.SF.forEach(m => {
      const isStarted = m.kickoff ? new Date(m.kickoff) <= currentTime : false;
      if (!isStarted) {
        const candidates = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
        if (candidates.length > 0) {
          randomGuesses[m.id] = candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
    });

    temp = propagateBracketWinners(createInitialBracket(), randomGuesses);
    const finalMatch = temp.Final[0];
    const isFinalStarted = finalMatch.kickoff ? new Date(finalMatch.kickoff) <= currentTime : false;
    if (!isFinalStarted) {
      const finalCand = [finalMatch.homeTeamId, finalMatch.awayTeamId].filter(Boolean) as string[];
      if (finalCand.length > 0) {
        const winner = finalCand[Math.floor(Math.random() * finalCand.length)];
        randomGuesses[finalMatch.id] = winner;
        randomGuesses['Champion'] = winner;
      }
    }

    setCurrentPredictions(randomGuesses);
    onSavePredictions(activeTeam.id, randomGuesses);
  };

  const handleReset = () => {
    // Only clear predictions for matches that have NOT started yet!
    const updated = { ...currentPredictions };
    
    const allMatches = [
      ...visualBracket.R32,
      ...visualBracket.R16,
      ...visualBracket.QF,
      ...visualBracket.SF,
      ...visualBracket.Final
    ];

    allMatches.forEach(m => {
      const isStarted = m.kickoff ? new Date(m.kickoff) <= currentTime : false;
      if (!isStarted) {
        delete updated[m.id];
      }
    });

    const finalMatch = visualBracket.Final[0];
    const isFinalStarted = finalMatch.kickoff ? new Date(finalMatch.kickoff) <= currentTime : false;
    if (!isFinalStarted) {
      delete updated['Champion'];
    }

    setCurrentPredictions(updated);
    onSavePredictions(activeTeam.id, updated);
  };

  // Get active matches list based on selected stage
  const getActiveStageMatches = (): Match[] => {
    switch (selectedStage) {
      case 'R32': return visualBracket.R32;
      case 'R16': return visualBracket.R16;
      case 'QF': return visualBracket.QF;
      case 'SF': return visualBracket.SF;
      case 'Final': return visualBracket.Final;
      default: return visualBracket.R32;
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
    <div className="space-y-6" id="predictions-bracket-section">
      {/* Upper Selectors - Geometric Balance layout */}
      <div className="bg-white rounded-none p-4 sm:p-5 border-4 border-slate-900 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Active Team Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 shrink-0">Predictor Account:</label>
          <div className="relative inline-block w-full sm:w-64">
            <select
              value={activeTeam.id}
              onChange={(e) => onChangeActiveTeam(e.target.value)}
              className="w-full bg-white hover:bg-slate-50 border-2 border-slate-900 text-slate-900 font-black uppercase tracking-wider py-2.5 px-3 pr-8 rounded-none appearance-none focus:outline-none focus:border-blue-600 cursor-pointer text-xs"
              style={{ borderLeftWidth: '8px', borderLeftColor: activeTeam.color }}
            >
              {participatingTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.avatar} {team.name.toUpperCase()}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-900">
              <svg className="fill-current h-4 w-4 stroke-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Quick actions - Stark Geometric flat buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickFill}
            className="flex-1 sm:flex-initial text-xs font-black bg-slate-900 text-white hover:bg-slate-800 py-3 px-4 rounded-none flex items-center justify-center gap-1.5 uppercase tracking-widest transition-colors cursor-pointer border-2 border-slate-900"
          >
            <Zap className="w-4 h-4 text-blue-400 fill-blue-400" />
            Auto-Fill
          </button>
          <button
            onClick={handleReset}
            className="flex-1 sm:flex-initial text-xs font-black bg-rose-600 hover:bg-rose-500 text-white py-3 px-4 rounded-none flex items-center justify-center gap-1.5 transition-colors border-2 border-slate-900 uppercase tracking-widest cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Bracket
          </button>
        </div>
      </div>

      {/* Stage Navigation Tabs - Thick Border box row */}
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
        {/* Dynamic Champion Header */}
        {selectedStage === 'Final' && (
          <div className="bg-blue-600 text-white rounded-none p-5 border-4 border-slate-900 text-center space-y-3 shadow-none max-w-md mx-auto">
            <h4 className="text-xs font-black uppercase tracking-widest text-white flex items-center justify-center gap-2">
              🏆 PREDICTED CHAMPION PICK
            </h4>
            {visualBracket.ChampionId ? (
              <div className="flex flex-col items-center justify-center gap-1">
                <span className="text-4xl filter drop-shadow">{getTeamObj(visualBracket.ChampionId)?.flag}</span>
                <span className="text-xl font-black uppercase tracking-tight">
                  {getTeamObj(visualBracket.ChampionId)?.name}
                </span>
                <span className="text-[10px] text-white font-black bg-slate-900 px-3 py-1.5 rounded-none uppercase tracking-widest mt-2 border border-slate-700">
                  CHOSEN TO WIN CUP!
                </span>
              </div>
            ) : (
              <p className="text-xs text-blue-100 font-bold uppercase tracking-wider">
                Select the Final winner below to crown your Champion!
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {getActiveStageMatches().map((match, matchIndex) => {
            const homeTeam = getTeamObj(match.homeTeamId);
            const awayTeam = getTeamObj(match.awayTeamId);
            const selectedWinnerId = currentPredictions[match.id];

            const isHomeSelected = selectedWinnerId === match.homeTeamId && match.homeTeamId !== null;
            const isAwaySelected = selectedWinnerId === match.awayTeamId && match.awayTeamId !== null;
            const isStarted = match.kickoff ? new Date(match.kickoff) <= currentTime : false;

            return (
              <div
                key={match.id}
                className={`rounded-none border-4 border-slate-900 p-4 shadow-none transition-all relative overflow-hidden flex flex-col justify-between ${
                  isStarted 
                    ? 'bg-slate-50/60 border-slate-700 opacity-90' 
                    : 'bg-white hover:bg-slate-50/30'
                }`}
              >
                {/* Match Number, Stage, Kickoff & Lock Indicator */}
                <div className="flex flex-col mb-3 border-b-2 border-slate-200 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-800 bg-slate-200 border border-slate-900 px-2.5 py-1 rounded-none uppercase tracking-widest">
                      {match.stage} - M{matchIndex + 1}
                    </span>
                    {isStarted ? (
                      <span className="text-[9px] text-amber-700 bg-amber-50 font-black border border-amber-200 px-2 py-0.5 rounded-none flex items-center gap-1 uppercase tracking-wider">
                        <Lock className="w-3 h-3 text-amber-700" /> LOCKED
                      </span>
                    ) : !selectedWinnerId ? (
                      <span className="text-[9px] text-red-600 bg-red-50 font-black border border-red-200 px-2 py-0.5 rounded-none flex items-center gap-1 uppercase tracking-wider">
                        <HelpCircle className="w-3 h-3 text-red-600" /> PICK WINNER
                      </span>
                    ) : (
                      <span className="text-[9px] text-emerald-700 bg-emerald-50 font-black border border-emerald-200 px-2 py-0.5 rounded-none flex items-center gap-1 uppercase tracking-wider">
                        OPEN
                      </span>
                    )}
                  </div>
                  {match.kickoff && (
                    <span className="text-[9px] text-slate-500 font-mono font-bold mt-1.5 uppercase tracking-tight">
                      KICKOFF: {formatKickoff(match.kickoff)}
                    </span>
                  )}
                </div>

                {/* Team Selection Options */}
                <div className="space-y-2">
                  {/* Home Team */}
                  <div
                    onClick={() => !isStarted && match.homeTeamId && handleSelectWinner(match.id, match.homeTeamId)}
                    className={`flex items-center justify-between p-3 rounded-none border-2 transition-all select-none ${
                      match.homeTeamId
                        ? isStarted
                          ? 'cursor-not-allowed bg-slate-50/30'
                          : 'cursor-pointer hover:bg-slate-50'
                        : 'bg-slate-50/50 text-slate-400 border-dashed border-slate-200'
                    } ${
                      isHomeSelected
                        ? 'border-blue-600 bg-blue-50/50 text-slate-950 font-black'
                        : 'border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">
                        {homeTeam ? homeTeam.flag : '❓'}
                      </span>
                      <span className={`font-black text-xs sm:text-sm uppercase tracking-tight ${isHomeSelected ? 'text-blue-900 font-black' : 'text-slate-700'}`}>
                        {homeTeam ? homeTeam.name : (match.homeTeamLabel || 'Pending Team')}
                      </span>
                    </div>
                    {isHomeSelected && (
                      <div className="w-5 h-5 rounded-none bg-blue-600 border border-slate-900 flex items-center justify-center text-white">
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
                    onClick={() => !isStarted && match.awayTeamId && handleSelectWinner(match.id, match.awayTeamId)}
                    className={`flex items-center justify-between p-3 rounded-none border-2 transition-all select-none ${
                      match.awayTeamId
                        ? isStarted
                          ? 'cursor-not-allowed bg-slate-50/30'
                          : 'cursor-pointer hover:bg-slate-50'
                        : 'bg-slate-50/50 text-slate-400 border-dashed border-slate-200'
                    } ${
                      isAwaySelected
                        ? 'border-blue-600 bg-blue-50/50 text-slate-950 font-black'
                        : 'border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">
                        {awayTeam ? awayTeam.flag : '❓'}
                      </span>
                      <span className={`font-black text-xs sm:text-sm uppercase tracking-tight ${isAwaySelected ? 'text-blue-900 font-black' : 'text-slate-700'}`}>
                        {awayTeam ? awayTeam.name : (match.awayTeamLabel || 'Pending Team')}
                      </span>
                    </div>
                    {isAwaySelected && (
                      <div className="w-5 h-5 rounded-none bg-blue-600 border border-slate-900 flex items-center justify-center text-white">
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
