import React, { useState, useEffect } from 'react';
import { ParticipatingTeam } from './types';
import { FOUR_PARTICIPATING_TEAMS, createInitialBracket, propagateBracketWinners } from './data/teams';
import Leaderboard from './components/Leaderboard';
import BracketView from './components/BracketView';
import ResultsAdmin from './components/ResultsAdmin';
import SummaryView from './components/SummaryView';
import { Trophy, CalendarCheck, Shield, HelpCircle, Star, Sparkles, TrendingUp, RefreshCw, Check } from 'lucide-react';

const STORAGE_KEY_TEAMS = 'worldcup_challenger_teams_v2';
const STORAGE_KEY_PREDS = 'worldcup_challenger_preds_v2';
const STORAGE_KEY_RESULTS = 'worldcup_challenger_results_v2';
const STORAGE_KEY_ACTIVE = 'worldcup_challenger_active_v2';

const mapApiIdToInternalId = (apiId: string, type: string): string => {
  const numericId = parseInt(apiId);
  if (type === 'r32' || (numericId >= 73 && numericId <= 88)) {
    return `R32-${numericId - 72}`;
  }
  if (type === 'r16' || (numericId >= 89 && numericId <= 96)) {
    return `R16-${numericId - 88}`;
  }
  if (type === 'qf' || (numericId >= 97 && numericId <= 100)) {
    return `QF-${numericId - 96}`;
  }
  if (type === 'sf' || (numericId >= 101 && numericId <= 102)) {
    return `SF-${numericId - 100}`;
  }
  if (type === 'final' || numericId === 104) {
    return 'Final-1';
  }
  return '';
};

const getWinnerIdFromApiGame = (game: any): string | null => {
  if (game.finished !== 'TRUE') return null;
  const homeScore = parseInt(game.home_score);
  const awayScore = parseInt(game.away_score);
  if (homeScore > awayScore) {
    return game.home_team_id;
  } else if (awayScore > homeScore) {
    return game.away_team_id;
  } else {
    const homePen = parseInt(game.home_penalty_score || '0');
    const awayPen = parseInt(game.away_penalty_score || '0');
    if (homePen > awayPen) {
      return game.home_team_id;
    } else if (awayPen > homePen) {
      return game.away_team_id;
    }
  }
  return null;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'predict' | 'admin' | 'summary'>('leaderboard');
  const [participatingTeams, setParticipatingTeams] = useState<ParticipatingTeam[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, string>>>({});
  const [actualResults, setActualResults] = useState<Record<string, string>>({});
  const [activeTeamId, setActiveTeamId] = useState<string>('team_alpha');
  const [simulatedDate, setSimulatedDate] = useState<string>(() => {
    return localStorage.getItem('worldcup_challenger_sim_date_v2') || '2026-06-30T11:00:00Z';
  });
  const [apiSyncStatus, setApiSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  const handleUpdateSimulatedDate = (newDate: string) => {
    setSimulatedDate(newDate);
    localStorage.setItem('worldcup_challenger_sim_date_v2', newDate);
  };

  // Load from local storage or pre-populate initial data
  useEffect(() => {
    const storedTeams = localStorage.getItem(STORAGE_KEY_TEAMS);
    const storedPreds = localStorage.getItem(STORAGE_KEY_PREDS);
    const storedResults = localStorage.getItem(STORAGE_KEY_RESULTS);
    const storedActive = localStorage.getItem(STORAGE_KEY_ACTIVE);

    let initialResults: Record<string, string> = {};

    if (storedTeams) {
      setParticipatingTeams(JSON.parse(storedTeams));
    } else {
      setParticipatingTeams(FOUR_PARTICIPATING_TEAMS);
      localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(FOUR_PARTICIPATING_TEAMS));
    }

    if (storedResults) {
      initialResults = JSON.parse(storedResults);
      setActualResults(initialResults);
    } else {
      // Settle a few initial Round of 32 games in the actual results as realistic starters based on API
      const initialSettledResults: Record<string, string> = {
        'R32-1': '5',  // Canada beat South Africa
        'R32-2': '14', // Paraguay beat Germany
        'R32-3': '10', // Morocco beat Netherlands
        'R32-4': '9',  // Brazil beat Japan
      };
      initialResults = initialSettledResults;
      setActualResults(initialSettledResults);
      localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(initialSettledResults));
    }

    if (storedActive) {
      setActiveTeamId(storedActive);
    } else {
      setActiveTeamId('team_alpha');
    }

    if (storedPreds) {
      setPredictions(JSON.parse(storedPreds));
    } else {
      // Pre-populate realistic brackets for Teams Beta, Gamma, and Delta to make the leaderboard immediately alive!
      const defaultPreds: Record<string, Record<string, string>> = {
        team_alpha: {}, // User's team - starts fresh!
        team_beta: generateRealisticGuesses(0.8), // Team Beta (strong favoritism)
        team_gamma: generateRealisticGuesses(0.5), // Team Gamma (moderate favoritism)
        team_delta: generateRealisticGuesses(0.3), // Team Delta (underdog bias)
      };
      setPredictions(defaultPreds);
      localStorage.setItem(STORAGE_KEY_PREDS, JSON.stringify(defaultPreds));
    }

    // Dynamic Live API Synchronization (World Cup 2026 games & live outcomes)
    setApiSyncStatus('syncing');
    fetch('https://worldcup26.ir/get/games')
      .then((res) => {
        if (!res.ok) throw new Error('API request failed');
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.games)) {
          const apiResults: Record<string, string> = {};
          data.games.forEach((g: any) => {
            if (g.type !== 'group' && g.finished === 'TRUE') {
              const internalId = mapApiIdToInternalId(g.id, g.type);
              const winnerId = getWinnerIdFromApiGame(g);
              if (internalId && winnerId) {
                apiResults[internalId] = winnerId;
              }
            }
          });

          // Merge live results with stored results (overwriting with authoritative API results)
          setActualResults((prev) => {
            const merged = { ...prev, ...apiResults };
            localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(merged));
            return merged;
          });
          setApiSyncStatus('synced');
        } else {
          setApiSyncStatus('error');
        }
      })
      .catch((err) => {
        console.error('Failed to sync live World Cup matches:', err);
        setApiSyncStatus('error');
      });
  }, []);

  // Helper to simulate a user's complete bracket for pre-population
  const generateRealisticGuesses = (favoritismRate: number): Record<string, string> => {
    const guesses: Record<string, string> = {};
    const bracket = createInitialBracket();

    // R32
    bracket.R32.forEach((m) => {
      // Favorite teams: Argentina (37), France (33), Brazil (9), England (45), Spain (29), Germany (17), Portugal (41), USA (13)
      const homeVal = m.homeTeamId === '37' || m.homeTeamId === '33' || m.homeTeamId === '9' || m.homeTeamId === '45' || m.homeTeamId === '29' || m.homeTeamId === '17' || m.homeTeamId === '41' || m.homeTeamId === '13';
      const pickHome = Math.random() < (homeVal ? favoritismRate : 1 - favoritismRate);
      guesses[m.id] = (pickHome ? m.homeTeamId : m.awayTeamId) || m.homeTeamId || '';
    });

    // R16
    let temp = propagateBracketWinners(bracket, guesses);
    temp.R16.forEach((m) => {
      const candidates = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      if (candidates.length > 0) {
        guesses[m.id] = candidates[Math.random() < 0.5 ? 0 : 1] || candidates[0];
      }
    });

    // QF
    temp = propagateBracketWinners(bracket, guesses);
    temp.QF.forEach((m) => {
      const candidates = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      if (candidates.length > 0) {
        guesses[m.id] = candidates[Math.random() < 0.5 ? 0 : 1] || candidates[0];
      }
    });

    // SF
    temp = propagateBracketWinners(bracket, guesses);
    temp.SF.forEach((m) => {
      const candidates = [m.homeTeamId, m.awayTeamId].filter(Boolean) as string[];
      if (candidates.length > 0) {
        guesses[m.id] = candidates[Math.random() < 0.5 ? 0 : 1] || candidates[0];
      }
    });

    // Final
    temp = propagateBracketWinners(bracket, guesses);
    const finalCand = [temp.Final[0].homeTeamId, temp.Final[0].awayTeamId].filter(Boolean) as string[];
    if (finalCand.length > 0) {
      const winner = finalCand[Math.random() < 0.5 ? 0 : 1] || finalCand[0];
      guesses[temp.Final[0].id] = winner;
      guesses['Champion'] = winner;
    }

    return guesses;
  };

  const handleSavePredictions = (teamId: string, updatedPredictions: Record<string, string>) => {
    const updated = { ...predictions, [teamId]: updatedPredictions };
    setPredictions(updated);
    localStorage.setItem(STORAGE_KEY_PREDS, JSON.stringify(updated));
  };

  const handleUpdateResults = (updatedResults: Record<string, string>) => {
    setActualResults(updatedResults);
    localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(updatedResults));
  };

  const handleRenameTeam = (teamId: string, newName: string, newAvatar: string) => {
    const updated = participatingTeams.map((team) =>
      team.id === teamId ? { ...team, name: newName, avatar: newAvatar } : team
    );
    setParticipatingTeams(updated);
    localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(updated));
  };

  const handleChangeActiveTeam = (teamId: string) => {
    setActiveTeamId(teamId);
    localStorage.setItem(STORAGE_KEY_ACTIVE, teamId);
  };

  const activeTeam = participatingTeams.find((t) => t.id === activeTeamId) || participatingTeams[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased border-4 sm:border-8 border-slate-900">
      {/* Upper Navigation Header */}
      <header className="bg-slate-900 text-white p-5 sm:p-6 flex justify-between items-center border-b-4 border-slate-900">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-blue-600 rounded-none flex items-center justify-center font-black text-xl text-white">W</div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase leading-none">Cup Clash Predictor</h1>
            <p className="text-blue-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-0.5">World Cup 2026 • Team Edition</p>
          </div>
        </div>

        {/* Quick Active User Badge */}
        {activeTeam && (
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Logged in as</p>
              <p className="font-mono text-blue-400 text-xs font-bold">{activeTeam.name.toUpperCase().replace(' ', '_')}</p>
            </div>
            <div className="h-10 w-10 border-2 border-slate-700 bg-slate-800 flex items-center justify-center rounded-none">
              <span className="text-xl select-none">{activeTeam.avatar}</span>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
        <div className="space-y-6">
          {/* Tournament Timeline Simulator Bar */}
          <div className="bg-slate-900 text-white p-4 border-4 border-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-none text-white">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Simulate Tournament Time</h3>
                  {apiSyncStatus === 'syncing' && (
                    <span className="flex items-center gap-1 text-[8px] bg-blue-600/30 text-blue-300 font-bold border border-blue-500/50 px-1.5 py-0.5 uppercase tracking-wider animate-pulse">
                      <RefreshCw className="w-2 h-2 animate-spin text-blue-400" /> Syncing
                    </span>
                  )}
                  {apiSyncStatus === 'synced' && (
                    <span className="flex items-center gap-1 text-[8px] bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-500/50 px-1.5 py-0.5 uppercase tracking-wider">
                      <Check className="w-2 h-2 text-emerald-400" /> API Linked
                    </span>
                  )}
                  {apiSyncStatus === 'error' && (
                    <span className="flex items-center gap-1 text-[8px] bg-red-600/30 text-red-300 font-bold border border-red-500/50 px-1.5 py-0.5 uppercase tracking-wider">
                      ⚠️ Live Offline
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono font-bold text-blue-400 uppercase mt-0.5">
                  Current: {new Date(simulatedDate).toUTCString().replace('GMT', 'UTC')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 w-full md:w-auto">
              {[
                { label: 'Pre-Tourney', value: '2026-06-25T12:00:00Z', tooltip: 'All matches open' },
                { label: 'Mid-R32', value: '2026-06-30T11:00:00Z', tooltip: 'R32-1 to R32-6 locked' },
                { label: 'R16 Begins', value: '2026-07-06T12:00:00Z', tooltip: 'All R32 locked, R16 open' },
                { label: 'Semifinals', value: '2026-07-15T12:00:00Z', tooltip: 'Only Semis & Finals open' },
                { label: 'End of Cup', value: '2026-07-20T12:00:00Z', tooltip: 'All matches locked' },
              ].map((preset) => {
                const isActive = simulatedDate === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => handleUpdateSimulatedDate(preset.value)}
                    title={preset.tooltip}
                    className={`py-2 px-2.5 rounded-none text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Module Selection Tabs (Geometric Balance Design) */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-300 border-2 border-slate-900 rounded-none">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`py-3 px-1 rounded-none text-xs font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span className="truncate">Standings</span>
            </button>

            <button
              onClick={() => setActiveTab('predict')}
              className={`py-3 px-1 rounded-none text-xs font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'predict'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Star className="w-4 h-4" />
              <span className="truncate">Predict</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`py-3 px-1 rounded-none text-xs font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span className="truncate">Settler</span>
            </button>

            <button
              onClick={() => setActiveTab('summary')}
              className={`py-3 px-1 rounded-none text-xs font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="truncate">Cumulative</span>
            </button>
          </div>

          {/* Active Component Wrapper */}
          <div className="min-h-[400px]">
            {activeTab === 'leaderboard' && participatingTeams.length > 0 && (
              <Leaderboard
                participatingTeams={participatingTeams}
                predictions={predictions}
                actualResults={actualResults}
                onSelectTeamPredictor={(teamId) => {
                  handleChangeActiveTeam(teamId);
                  setActiveTab('predict');
                }}
              />
            )}

            {activeTab === 'predict' && activeTeam && (
              <BracketView
                activeTeam={activeTeam}
                predictions={predictions[activeTeam.id] || {}}
                onSavePredictions={handleSavePredictions}
                participatingTeams={participatingTeams}
                onChangeActiveTeam={handleChangeActiveTeam}
                currentTime={new Date(simulatedDate)}
              />
            )}

            {activeTab === 'admin' && (
              <ResultsAdmin
                actualResults={actualResults}
                onUpdateResults={handleUpdateResults}
              />
            )}

            {activeTab === 'summary' && participatingTeams.length > 0 && (
              <SummaryView
                participatingTeams={participatingTeams}
                predictions={predictions}
                actualResults={actualResults}
                onRenameTeam={handleRenameTeam}
              />
            )}
          </div>
        </div>
      </main>

      {/* Small Ambient Footer */}
      <footer className="bg-white border-t-2 border-slate-900 py-5 text-center text-xs text-slate-500 font-bold uppercase tracking-wider">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Cup Clash Bracket Predictor Engine</span>
          <span className="font-mono text-[10px] text-blue-600">SYSTEM STATUS: OPTIMAL</span>
        </div>
      </footer>
    </div>
  );
}
