import React, { useState, useEffect } from 'react';
import { Stage, Match, Bracket, Team, ParticipatingTeam } from '../types';
import { WORLD_CUP_TEAMS, createInitialBracket, propagateBracketWinners } from '../data/teams';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Lock, ShieldAlert, Sparkles, KeyRound, Save, RefreshCw, Trophy } from 'lucide-react';

interface BracketViewProps {
  activeTeam: ParticipatingTeam;
  predictions: Record<string, string>; // matchId -> winnerId
  onSavePredictions: (teamId: string, updatedPredictions: Record<string, string>) => Promise<boolean>;
  participatingTeams: ParticipatingTeam[];
  onChangeActiveTeam: (teamId: string) => void;
  currentTime: Date;
  games: any[]; // SQLite games list
}

export default function BracketView({
  activeTeam,
  predictions,
  onSavePredictions,
  participatingTeams,
  onChangeActiveTeam,
  currentTime,
  games = [],
}: BracketViewProps) {
  const [selectedStage, setSelectedStage] = useState<Stage>('R32');
  const [currentPredictions, setCurrentPredictions] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState<'world_cup' | 'seczim_games'>('world_cup');

  // Authentication State
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPasscodeForm, setShowPasscodeForm] = useState(false);
  const [currentTeamPasscode, setCurrentTeamPasscode] = useState('');
  const [newTeamPasscode, setNewTeamPasscode] = useState('');
  const [confirmTeamPasscode, setConfirmTeamPasscode] = useState('');
  const [passcodeChangeMessage, setPasscodeChangeMessage] = useState('');
  const [isChangingPasscode, setIsChangingPasscode] = useState(false);

  // Load authenticated team from localStorage if it matches activeTeam
  useEffect(() => {
    const cachedAuth = localStorage.getItem(`seczim_auth_team_${activeTeam.id}`);
    if (cachedAuth === 'true') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setIsAuthenticated(false);
      setPasscode('');
      setAuthError('');
    }
    setShowPasscodeForm(false);
    setCurrentTeamPasscode('');
    setNewTeamPasscode('');
    setConfirmTeamPasscode('');
    setPasscodeChangeMessage('');
  }, [activeTeam.id]);

  // Sync predictions state
  useEffect(() => {
    setCurrentPredictions({ ...predictions });
  }, [predictions, activeTeam.id]);

  // Handle Authentication submit
  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;

    setIsSubmitting(true);
    setAuthError('');

    try {
      const response = await fetch('/api/teams/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: activeTeam.id, passcode })
      });
      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        localStorage.setItem(`seczim_auth_team_${activeTeam.id}`, 'true');
        setPasscode('');
      } else {
        setAuthError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setAuthError('Error authenticating with database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoutTeam = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(`seczim_auth_team_${activeTeam.id}`);
    setPasscode('');
    setAuthError('');
    setShowPasscodeForm(false);
    setCurrentTeamPasscode('');
    setNewTeamPasscode('');
    setConfirmTeamPasscode('');
    setPasscodeChangeMessage('');
  };

  const handleChangePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeChangeMessage('');

    if (!/^\d{4}$/.test(currentTeamPasscode) || !/^\d{4}$/.test(newTeamPasscode)) {
      setPasscodeChangeMessage('Current and new PINs must be exactly 4 digits.');
      return;
    }

    if (newTeamPasscode !== confirmTeamPasscode) {
      setPasscodeChangeMessage('New PIN confirmation does not match.');
      return;
    }

    setIsChangingPasscode(true);
    try {
      const response = await fetch('/api/teams/passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: activeTeam.id,
          currentPasscode: currentTeamPasscode,
          newPasscode: newTeamPasscode
        })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        alert(data.message || 'Passcode updated successfully. Please sign in again.');
        handleLogoutTeam();
      } else {
        setPasscodeChangeMessage(data.error || 'Failed to update passcode.');
      }
    } catch (err) {
      setPasscodeChangeMessage('Error updating passcode.');
    } finally {
      setIsChangingPasscode(false);
    }
  };

  // Construct a visual bracket tree using local predictions
  const visualBracket = propagateBracketWinners(createInitialBracket(), currentPredictions);

  const getTeamObj = (id: string | null): Team | null => {
    if (!id) return null;
    return WORLD_CUP_TEAMS.find((t) => t.id === id) || null;
  };

  const getPredictionTeamObj = (id: string | null): ParticipatingTeam | null => {
    if (!id) return null;
    return participatingTeams.find((t) => t.id === id) || null;
  };

  const formatKickoff = (isoString?: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')} UTC`;
  };

  // Trigger Save to database
  const savePredictionsToDb = async (updated: Record<string, string>) => {
    const authPin = prompt(`Please re-enter your 4-digit passcode PIN for ${activeTeam.name} to confirm saving:`);
    if (!authPin) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: activeTeam.id,
          passcode: authPin,
          predictions: updated,
          championId: updated['Champion'] || null
        })
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        // Dispatch save to parent to update local state
        await onSavePredictions(activeTeam.id, updated);
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to save predictions. Verify passcode.');
      }
    } catch (err) {
      alert('Error updating database predictions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Select predicted winner of a World Cup Match
  const handleSelectWinner = (matchId: string, winnerId: string | null) => {
    if (!winnerId) return;

    // Check locking based on match kickoff
    const matched = [...visualBracket.R32, ...visualBracket.R16, ...visualBracket.QF, ...visualBracket.SF, ...visualBracket.Final].find(m => m.id === matchId);
    if (matched && matched.kickoff && new Date(matched.kickoff) <= currentTime) {
      alert('This match has already kicked off and is locked!');
      return;
    }

    const updated = { ...currentPredictions, [matchId]: winnerId };

    if (matchId === 'Final-1') {
      updated['Champion'] = winnerId;
    }

    // Propagation cleansing
    const tempBracket = propagateBracketWinners(createInitialBracket(), updated);
    const cleanPredictions = { ...updated };

    tempBracket.R16.forEach(m => {
      const allowed = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      const chosen = cleanPredictions[m.id];
      if (chosen && !allowed.includes(chosen)) delete cleanPredictions[m.id];
    });

    const tempBracket2 = propagateBracketWinners(createInitialBracket(), cleanPredictions);
    tempBracket2.QF.forEach(m => {
      const allowed = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      const chosen = cleanPredictions[m.id];
      if (chosen && !allowed.includes(chosen)) delete cleanPredictions[m.id];
    });

    const tempBracket3 = propagateBracketWinners(createInitialBracket(), cleanPredictions);
    tempBracket3.SF.forEach(m => {
      const allowed = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      const chosen = cleanPredictions[m.id];
      if (chosen && !allowed.includes(chosen)) delete cleanPredictions[m.id];
    });

    const tempBracket4 = propagateBracketWinners(createInitialBracket(), cleanPredictions);
    tempBracket4.Final.forEach(m => {
      const allowed = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      const chosen = cleanPredictions[m.id];
      if (chosen && !allowed.includes(chosen)) delete cleanPredictions[m.id];
    });

    const tempBracket5 = propagateBracketWinners(createInitialBracket(), cleanPredictions);
    if (cleanPredictions['Champion'] && cleanPredictions['Champion'] !== tempBracket5.Final[0].winnerId) {
      cleanPredictions['Champion'] = tempBracket5.Final[0].winnerId || '';
    }

    setCurrentPredictions(cleanPredictions);
  };

  // Select predicted winner of custom SecZim game
  const handleSelectSecZimWinner = (gameId: string, winnerId: string, gameKickoff: string) => {
    const isStarted = gameKickoff ? new Date(gameKickoff) <= currentTime : false;
    if (isStarted) {
      alert('This SecZim game has already kicked off and is locked!');
      return;
    }

    setCurrentPredictions(prev => ({
      ...prev,
      [gameId]: winnerId
    }));
  };

  // Quick auto-fill World Cup bracket
  const handleQuickFill = () => {
    const randomGuesses: Record<string, string> = { ...currentPredictions };
    
    visualBracket.R32.forEach(m => {
      const isStarted = m.kickoff ? new Date(m.kickoff) <= currentTime : false;
      if (!isStarted) {
        const candidates = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
        if (candidates.length > 0) {
          randomGuesses[m.id] = candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
    });

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
  };

  const handleReset = () => {
    const updated = { ...currentPredictions };
    const allMatches = [
      ...visualBracket.R32, ...visualBracket.R16, ...visualBracket.QF, ...visualBracket.SF, ...visualBracket.Final
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

    // Also reset SecZim games predictions if they haven't started
    games.filter(g => g.category === 'seczim_games').forEach(g => {
      const isStarted = g.kickoff ? new Date(g.kickoff) <= currentTime : false;
      if (!isStarted) {
        delete updated[g.id];
      }
    });

    setCurrentPredictions(updated);
  };

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

  const seczimGames = games.filter(g => g.category === 'seczim_games');

  // RENDER PASSCODE ACCESS GATE IF NOT AUTHENTICATED
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto bg-white border-4 border-brand-dark rounded-none p-6 sm:p-8 space-y-6 text-center shadow-none">
        <div className="mx-auto w-16 h-16 bg-brand-gold-pale flex items-center justify-center border-4 border-brand-dark text-brand-dark">
          <KeyRound className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-brand-dark">Predictor Dashboard Locked</h2>
          <p className="text-xs text-brand-dark-light mt-2 uppercase tracking-wide">
            You are attempting to access predictions as <span className="font-bold font-mono text-brand-gold">{activeTeam.name.toUpperCase()}</span>
          </p>
          <p className="text-xs text-brand-dark-muted mt-2">
            Please enter your team's 4-digit passcode PIN to unlock predictions and submit brackets.
          </p>
        </div>

        {/* Predictor Selector inside the auth block to switch teams */}
        <div className="border-t-2 border-brand-dark pt-4 text-left">
          <label className="text-[10px] font-black uppercase tracking-widest text-brand-dark-light block mb-1">COMPETING TEAM:</label>
          <select
            value={activeTeam.id}
            onChange={(e) => onChangeActiveTeam(e.target.value)}
            className="w-full bg-slate-50 border-2 border-brand-dark font-black text-xs uppercase p-2 rounded-none focus:outline-none cursor-pointer"
            style={{ borderLeftWidth: '6px', borderLeftColor: activeTeam.color }}
          >
            {participatingTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.avatar} {t.name.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleAuthenticate} className="space-y-4">
          <input
            type="password"
            maxLength={6}
            value={passcode}
            onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
            placeholder="ENTER PASSCODE PIN"
            className="w-full text-center bg-brand-gold-bg border-2 border-brand-dark rounded-none py-3 font-mono text-2xl tracking-widest focus:outline-none focus:bg-white text-brand-dark"
          />

          {authError && <p className="text-xs text-rose-600 font-black uppercase">{authError}</p>}

          <button
            type="submit"
            disabled={isSubmitting || !passcode}
            className="w-full bg-brand-dark hover:bg-brand-gold hover:text-brand-dark text-white font-black uppercase tracking-widest py-3 border-2 border-brand-dark rounded-none text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Verifying PIN...' : 'Verify Passcode'}
          </button>
        </form>
      </div>
    );
  }

  // RENDER PRIMARY PREDICTIONS DASHBOARD (AUTHENTICATED)
  return (
    <div className="space-y-6" id="predictions-bracket-section">
      
      {/* Upper Status & Controls */}
      <div className="bg-white rounded-none p-4 sm:p-5 border-4 border-brand-dark shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeTeam.avatar}</span>
            <h3 className="font-black text-brand-dark text-base uppercase tracking-tight">{activeTeam.name} Predicts</h3>
            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-none border border-emerald-300 uppercase tracking-widest">
              Unlocked
            </span>
          </div>
          <p className="text-[10px] text-brand-dark-muted font-bold uppercase tracking-wider mt-1">
            Team PIN verified • Predictions close automatically at kickoff.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPasscodeForm((visible) => !visible)}
            className="text-[10px] font-black bg-white hover:bg-brand-gold text-brand-dark px-3 py-2 rounded-none uppercase tracking-widest border-2 border-brand-dark cursor-pointer transition-all flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Change PIN
          </button>
          <button
            onClick={handleLogoutTeam}
            className="text-[10px] font-black bg-brand-dark hover:bg-brand-gold hover:text-brand-dark text-white px-3 py-2 rounded-none uppercase tracking-widest border-2 border-brand-dark cursor-pointer transition-all"
          >
            Switch Account (Lock)
          </button>
          
          <button
            onClick={() => savePredictionsToDb(currentPredictions)}
            className="text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-none flex items-center justify-center gap-2 border-2 border-brand-dark uppercase tracking-widest cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      {showPasscodeForm && (
        <form onSubmit={handleChangePasscode} className="bg-white border-4 border-brand-dark p-4 rounded-none space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <KeyRound className="w-4 h-4 text-brand-gold" />
            <h4 className="text-xs font-black uppercase tracking-widest text-brand-dark">Change Team PIN</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={currentTeamPasscode}
              onChange={(e) => setCurrentTeamPasscode(e.target.value.replace(/\D/g, ''))}
              placeholder="CURRENT PIN"
              className="w-full bg-slate-50 border-2 border-brand-dark px-3 py-2 text-xs font-mono tracking-widest focus:outline-none focus:bg-white"
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newTeamPasscode}
              onChange={(e) => setNewTeamPasscode(e.target.value.replace(/\D/g, ''))}
              placeholder="NEW PIN"
              className="w-full bg-slate-50 border-2 border-brand-dark px-3 py-2 text-xs font-mono tracking-widest focus:outline-none focus:bg-white"
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmTeamPasscode}
              onChange={(e) => setConfirmTeamPasscode(e.target.value.replace(/\D/g, ''))}
              placeholder="CONFIRM NEW PIN"
              className="w-full bg-slate-50 border-2 border-brand-dark px-3 py-2 text-xs font-mono tracking-widest focus:outline-none focus:bg-white"
            />
          </div>
          {passcodeChangeMessage && (
            <p className="text-[10px] text-rose-600 font-black uppercase">{passcodeChangeMessage}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPasscodeForm(false)}
              className="text-[10px] font-black border-2 border-brand-dark px-3 py-2 bg-white hover:bg-slate-50 uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isChangingPasscode || !currentTeamPasscode || !newTeamPasscode || !confirmTeamPasscode}
              className="text-[10px] font-black bg-brand-dark hover:bg-brand-gold hover:text-brand-dark text-white px-3 py-2 border-2 border-brand-dark uppercase tracking-widest disabled:opacity-50"
            >
              {isChangingPasscode ? 'Saving PIN...' : 'Save New PIN'}
            </button>
          </div>
        </form>
      )}

      {/* Category Toggler: FIFA vs SECZIM */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-brand-dark border-2 border-brand-dark rounded-none text-center">
        <button
          onClick={() => setActiveCategory('world_cup')}
          className={`py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeCategory === 'world_cup' ? 'bg-brand-gold text-brand-dark' : 'text-brand-dark-slate hover:bg-brand-dark-medium'
          }`}
        >
          🏆 FIFA World Cup Bracket
        </button>
        <button
          onClick={() => setActiveCategory('seczim_games')}
          className={`py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeCategory === 'seczim_games' ? 'bg-brand-gold text-brand-dark' : 'text-brand-dark-slate hover:bg-brand-dark-medium'
          }`}
        >
          🥇 SecZim Corporate Sports
        </button>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-100 text-emerald-800 p-3 text-xs border-2 border-emerald-300 font-bold uppercase tracking-wider text-center animate-pulse">
          ✓ Predictions saved successfully in persistent SQLite database!
        </div>
      )}

      {/* RENDER DYNAMIC PREDICTIONS WRAPPERS BASED ON CATEGORY */}
      {activeCategory === 'world_cup' ? (
        <div className="space-y-6">
          {/* Quick Actions Bar */}
          <div className="bg-white border-2 border-brand-dark p-3 rounded-none flex items-center justify-between gap-4 flex-wrap">
            <span className="text-[10px] font-black text-brand-dark uppercase tracking-widest">WORLD CUP BRACKET TREE:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleQuickFill}
                className="text-[10px] font-black bg-brand-dark hover:bg-brand-gold hover:text-brand-dark text-white px-3 py-2 border border-brand-dark rounded-none uppercase tracking-widest cursor-pointer"
              >
                Auto-Fill Matches
              </button>
              <button
                onClick={handleReset}
                className="text-[10px] font-black bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 border border-brand-dark rounded-none uppercase tracking-widest cursor-pointer"
              >
                Reset Bracket
              </button>
            </div>
          </div>

          {/* Bracket Stage Selector */}
          <div className="flex bg-slate-200 p-1 border-2 border-brand-dark rounded-none overflow-x-auto gap-1">
            {stagesList.map((stage) => {
              const isActive = selectedStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setSelectedStage(stage.id)}
                  className={`flex-1 min-w-[70px] text-center py-2 px-2 rounded-none text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
                    isActive ? 'bg-brand-dark text-white' : 'bg-white text-brand-dark hover:bg-slate-100'
                  }`}
                >
                  {stage.label}
                  <span className="block text-[8px] font-bold mt-0.5 opacity-60">
                    {stage.count} {stage.count === 1 ? 'MATCH' : 'MATCH'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Champion Header */}
          {selectedStage === 'Final' && (
            <div className="bg-brand-gold text-brand-dark rounded-none p-5 border-4 border-brand-dark text-center space-y-3 shadow-none max-w-md mx-auto">
              <h4 className="text-xs font-black uppercase tracking-widest text-brand-dark flex items-center justify-center gap-2 font-sans">
                🏆 PREDICTED CHAMPION PICK
              </h4>
              {visualBracket.ChampionId ? (
                <div className="space-y-2">
                  <div className="text-3xl font-black font-sans uppercase tracking-tight">
                    {getTeamObj(visualBracket.ChampionId)?.flag} {getTeamObj(visualBracket.ChampionId)?.name}
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-widest bg-brand-dark text-white px-3 py-1.5 inline-block">
                    YOUR CHOSEN CHAMPION
                  </p>
                </div>
              ) : (
                <div className="text-sm font-black text-brand-dark-light py-2">
                  Predict the Final winner below to set your Champion!
                </div>
              )}
            </div>
          )}

          {/* FIFA Bracket Match Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getActiveStageMatches().map((match) => {
              const homeTeam = getTeamObj(match.homeTeamId);
              const awayTeam = getTeamObj(match.awayTeamId);
              const currentPrediction = currentPredictions[match.id];
              const isLocked = match.kickoff ? new Date(match.kickoff) <= currentTime : false;

              return (
                <div
                  key={match.id}
                  className={`bg-white border-2 border-brand-dark rounded-none overflow-hidden flex flex-col justify-between ${
                    isLocked ? 'opacity-85 bg-slate-50' : ''
                  }`}
                >
                  {/* Card Header Info */}
                  <div className="bg-brand-dark text-white px-3 py-2 flex justify-between items-center text-[9px] font-mono">
                    <span className="font-black tracking-widest uppercase">{match.id} - {selectedStage}</span>
                    <span className="text-brand-gold flex items-center gap-1">
                      {isLocked ? (
                        <>
                          <Lock className="w-2.5 h-2.5" /> LOCKED
                        </>
                      ) : (
                        formatKickoff(match.kickoff)
                      )}
                    </span>
                  </div>

                  {/* Prediction Selectors */}
                  <div className="p-3 space-y-2">
                    {/* Home Team */}
                    <button
                      onClick={() => handleSelectWinner(match.id, match.homeTeamId)}
                      disabled={isLocked || !match.homeTeamId}
                      className={`w-full p-2.5 rounded-none border-2 flex items-center justify-between text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        !match.homeTeamId
                          ? 'border-dashed border-slate-300 bg-slate-50 text-slate-400'
                          : currentPrediction === match.homeTeamId
                          ? 'border-brand-gold bg-brand-gold-bg text-brand-dark shadow-sm'
                          : 'border-slate-200 bg-white hover:border-brand-dark text-brand-dark'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {homeTeam ? `${homeTeam.flag} ${homeTeam.name}` : match.homeTeamLabel || 'TBD (Previous Winner)'}
                      </span>
                      {currentPrediction === match.homeTeamId && (
                        <Check className="w-4 h-4 text-brand-gold shrink-0 stroke-[3px]" />
                      )}
                    </button>

                    {/* Away Team */}
                    <button
                      onClick={() => handleSelectWinner(match.id, match.awayTeamId)}
                      disabled={isLocked || !match.awayTeamId}
                      className={`w-full p-2.5 rounded-none border-2 flex items-center justify-between text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        !match.awayTeamId
                          ? 'border-dashed border-slate-300 bg-slate-50 text-slate-400'
                          : currentPrediction === match.awayTeamId
                          ? 'border-brand-gold bg-brand-gold-bg text-brand-dark shadow-sm'
                          : 'border-slate-200 bg-white hover:border-brand-dark text-brand-dark'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {awayTeam ? `${awayTeam.flag} ${awayTeam.name}` : match.awayTeamLabel || 'TBD (Previous Winner)'}
                      </span>
                      {currentPrediction === match.awayTeamId && (
                        <Check className="w-4 h-4 text-brand-gold shrink-0 stroke-[3px]" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border-2 border-brand-dark p-3 rounded-none flex items-center justify-between">
            <span className="text-[10px] font-black text-brand-dark uppercase tracking-widest">SECZIM TEAM CHAMPIONSHIP:</span>
            <button
              onClick={handleReset}
              className="text-[10px] font-black bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 border border-brand-dark rounded-none uppercase tracking-widest cursor-pointer"
            >
              Reset SecZim Selection
            </button>
          </div>

          {/* SECZIM SPORTS GALA GAMES LIST */}
          {seczimGames.length === 0 ? (
            <div className="bg-white rounded-none border-2 border-brand-dark p-8 text-center text-sm font-bold text-brand-dark-muted">
              No SecZim sports matches have been added yet by the administrator.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {seczimGames.map((game) => {
                const homePredictionTeam = getPredictionTeamObj(game.home_team_id);
                const awayPredictionTeam = getPredictionTeamObj(game.away_team_id);
                const currentPrediction = currentPredictions[game.id];
                const isLocked = game.kickoff ? new Date(game.kickoff) <= currentTime : false;

                return (
                  <div
                    key={game.id}
                    className={`bg-white border-2 border-brand-dark rounded-none overflow-hidden ${
                      isLocked ? 'opacity-85 bg-slate-50' : ''
                    }`}
                  >
                    {/* Game Header */}
                    <div className="bg-brand-dark text-white px-4 py-2 flex justify-between items-center text-xs">
                      <div>
                        <span className="bg-brand-gold text-brand-dark text-[9px] font-black px-1.5 py-0.5 uppercase tracking-widest mr-2 inline-block">
                          {game.stage}
                        </span>
                        <span className="font-bold uppercase font-sans tracking-wide">SECZIM CORPORATE EVENT</span>
                      </div>
                      <span className="font-mono text-[10px] text-brand-gold flex items-center gap-1">
                        {isLocked ? (
                          <>
                            <Lock className="w-3 h-3" /> MATCH LOCKED
                          </>
                        ) : (
                          formatKickoff(game.kickoff)
                        )}
                      </span>
                    </div>

                    {/* Match Grid layout */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Block - Predict Home */}
                      <div
                        onClick={() => {
                          if (!isLocked && game.home_team_id) {
                            handleSelectSecZimWinner(game.id, game.home_team_id, game.kickoff);
                          }
                        }}
                        className={`p-3 border-2 rounded-none flex items-center gap-3 cursor-pointer transition-all ${
                          isLocked ? 'cursor-not-allowed' : 'hover:border-brand-dark'
                        } ${
                          currentPrediction === game.home_team_id
                            ? 'border-brand-gold bg-brand-gold-bg/30'
                            : 'border-slate-200'
                        }`}
                      >
                        <div
                          className="w-10 h-10 border-2 border-brand-dark flex items-center justify-center text-xl shrink-0"
                          style={{ backgroundColor: `${homePredictionTeam?.color || '#C09138'}15` }}
                        >
                          {homePredictionTeam?.avatar || '🟡'}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black uppercase text-brand-dark tracking-tight">
                            {homePredictionTeam?.name || game.home_team_label || 'TBD Home'}
                          </p>
                          <p className="text-[10px] text-brand-dark-muted font-bold uppercase tracking-wider">PREDICT AS WINNER</p>
                        </div>
                        {currentPrediction === game.home_team_id && (
                          <div className="w-6 h-6 bg-brand-gold border-2 border-brand-dark flex items-center justify-center rounded-none text-brand-dark">
                            <Check className="w-4 h-4 stroke-[3px]" />
                          </div>
                        )}
                      </div>

                      {/* Right Block - Predict Away */}
                      <div
                        onClick={() => {
                          if (!isLocked && game.away_team_id) {
                            handleSelectSecZimWinner(game.id, game.away_team_id, game.kickoff);
                          }
                        }}
                        className={`p-3 border-2 rounded-none flex items-center gap-3 cursor-pointer transition-all ${
                          isLocked ? 'cursor-not-allowed' : 'hover:border-brand-dark'
                        } ${
                          currentPrediction === game.away_team_id
                            ? 'border-brand-gold bg-brand-gold-bg/30'
                            : 'border-slate-200'
                        }`}
                      >
                        <div
                          className="w-10 h-10 border-2 border-brand-dark flex items-center justify-center text-xl shrink-0"
                          style={{ backgroundColor: `${awayPredictionTeam?.color || '#313131'}15` }}
                        >
                          {awayPredictionTeam?.avatar || '⚫'}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black uppercase text-brand-dark tracking-tight">
                            {awayPredictionTeam?.name || game.away_team_label || 'TBD Away'}
                          </p>
                          <p className="text-[10px] text-brand-dark-muted font-bold uppercase tracking-wider">PREDICT AS WINNER</p>
                        </div>
                        {currentPrediction === game.away_team_id && (
                          <div className="w-6 h-6 bg-brand-gold border-2 border-brand-dark flex items-center justify-center rounded-none text-brand-dark">
                            <Check className="w-4 h-4 stroke-[3px]" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
