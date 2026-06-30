import React, { useState } from 'react';
import { ParticipatingTeam, Team } from '../types';
import { calculateUserScore, POINT_VALUES } from '../utils/scoring';
import { WORLD_CUP_TEAMS } from '../data/teams';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Award, CheckCircle, XCircle, Info, ChevronDown, ChevronUp, Star } from 'lucide-react';

interface LeaderboardProps {
  participatingTeams: ParticipatingTeam[];
  predictions: Record<string, Record<string, string>>; // teamId -> Record<matchId, teamId>
  actualResults: Record<string, string>;
  onSelectTeamPredictor: (teamId: string) => void;
}

export default function Leaderboard({
  participatingTeams,
  predictions,
  actualResults,
  onSelectTeamPredictor,
}: LeaderboardProps) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  // Calculate scores for all teams
  const teamScores = participatingTeams.map((pTeam) => {
    const p = predictions[pTeam.id] || {};
    const breakdown = calculateUserScore(p, actualResults);
    return {
      ...pTeam,
      breakdown,
      currentPoints: breakdown.total,
    };
  });

  // Sort by score (descending)
  const sortedTeams = [...teamScores].sort((a, b) => b.currentPoints - a.currentPoints);

  const getTeamName = (id: string | null): string => {
    if (!id) return 'Pending';
    const t = WORLD_CUP_TEAMS.find((team) => team.id === id);
    return t ? `${t.flag} ${t.name}` : id;
  };

  const toggleExpand = (teamId: string) => {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
  };

  return (
    <div className="space-y-6" id="leaderboard-section">
      {/* Header Info - Geometric Balance Theme */}
      <div className="bg-slate-900 p-5 sm:p-6 text-white border-4 border-slate-900 rounded-none relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 relative">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tighter uppercase flex items-center gap-2">
              <Trophy className="text-blue-400 w-6 h-6 shrink-0" />
              Live Leaderboard
            </h2>
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mt-1">
              Standings & Predictions accuracy tracker
            </p>
          </div>
          <div className="bg-slate-800 p-3 rounded-none border-2 border-slate-700 text-[10px] font-mono text-slate-300 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-blue-600"></span>
              <span>R32: {POINT_VALUES.R32} PTS EACH</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-indigo-600"></span>
              <span>R16: {POINT_VALUES.R16} PTS EACH</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-purple-600"></span>
              <span>QF: {POINT_VALUES.QF} PTS EACH</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard List - Square Geometric Rows */}
      <div className="bg-white rounded-none border-4 border-slate-900 shadow-none overflow-hidden">
        <div className="divide-y-2 divide-slate-900">
          {sortedTeams.map((team, index) => {
            const isFirst = index === 0;
            const isExpanded = expandedTeamId === team.id;
            const colorClass = team.color;

            return (
              <div key={team.id} className="transition-colors hover:bg-slate-50">
                <div
                  className={`flex items-center justify-between p-4 sm:p-5 cursor-pointer select-none border-l-8`}
                  style={{ borderLeftColor: colorClass }}
                  onClick={() => toggleExpand(team.id)}
                  id={`leaderboard-row-${team.id}`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Rank */}
                    <div className="flex items-center justify-center w-8 h-8 font-black text-lg bg-slate-900 text-white rounded-none">
                      {index + 1}
                    </div>

                    {/* Avatar Badge */}
                    <div
                      className="w-10 h-10 rounded-none flex items-center justify-center text-xl font-bold border-2 border-slate-900"
                      style={{ backgroundColor: `${colorClass}15` }}
                    >
                      {team.avatar}
                    </div>

                    {/* Team Name */}
                    <div>
                      <h3 className="font-black text-slate-900 text-base flex items-center gap-2 uppercase tracking-tight">
                        {team.name}
                        {isFirst && (
                          <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-none uppercase tracking-widest">
                            LEADER
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TAP TO EXPAND SPLIT</p>
                    </div>
                  </div>

                  {/* Points display */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                        {team.currentPoints}
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">points</span>
                    </div>
                    <div className="text-slate-900">
                      {isExpanded ? <ChevronUp className="w-5 h-5 stroke-2" /> : <ChevronDown className="w-5 h-5 stroke-2" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Predictions Breakdown */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden border-t-2 border-slate-900 bg-slate-50"
                    >
                      <div className="p-4 sm:p-6 space-y-4">
                        {/* Quick points split - Geometric blocks */}
                        <div className="grid grid-cols-5 gap-2 text-center">
                          <div className="bg-white p-2.5 rounded-none border-2 border-slate-900">
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">R32</span>
                            <span className="text-sm font-black text-slate-900 font-mono">{team.breakdown.R32}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-none border-2 border-slate-900">
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">R16</span>
                            <span className="text-sm font-black text-slate-900 font-mono">{team.breakdown.R16}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-none border-2 border-slate-900">
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">QF</span>
                            <span className="text-sm font-black text-slate-900 font-mono">{team.breakdown.QF}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-none border-2 border-slate-900">
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">SF</span>
                            <span className="text-sm font-black text-slate-900 font-mono">{team.breakdown.SF}</span>
                          </div>
                          <div className="bg-blue-50 p-2.5 rounded-none border-2 border-blue-600">
                            <span className="text-[9px] text-blue-600 uppercase font-black tracking-widest block font-sans">Final</span>
                            <span className="text-sm font-black text-blue-800 font-mono">{team.breakdown.Final}</span>
                          </div>
                        </div>

                        {/* Predicted Champion Section */}
                        <div className="bg-white p-4 rounded-none border-2 border-slate-900 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Award className="text-blue-600 w-5 h-5 shrink-0" />
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Predicted Champion</span>
                              <span className="font-black text-slate-900 text-sm sm:text-base">
                                {getTeamName(predictions[team.id]?.['Champion'] || null).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div>
                            {actualResults['Final-1'] ? (
                              predictions[team.id]?.['Champion'] === actualResults['Final-1'] ? (
                                <span className="flex items-center gap-1 text-white text-xs font-black bg-emerald-600 px-3 py-1 rounded-none uppercase tracking-wider">
                                  Correct (+100)
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-white text-xs font-black bg-rose-600 px-3 py-1 rounded-none uppercase tracking-wider">
                                  Incorrect
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 border border-slate-300 rounded-none uppercase font-black tracking-wider">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* View Prediction Tree Button */}
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => onSelectTeamPredictor(team.id)}
                            className="text-xs font-black bg-slate-900 text-white hover:bg-slate-800 px-4 py-2.5 rounded-none flex items-center gap-2 uppercase tracking-widest cursor-pointer border-2 border-slate-900"
                          >
                            <Info className="w-4 h-4 text-blue-400" />
                            View/Edit Bracket
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rules Card */}
      <div className="bg-slate-900 text-white rounded-none p-5 sm:p-6 border-4 border-slate-900">
        <h4 className="text-sm font-black uppercase tracking-widest text-blue-400 flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-blue-400" />
          Scoring Rules Reference
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2 font-mono text-slate-300 border-r border-slate-800 pr-4">
            <div className="flex justify-between">
              <span>ROUND OF 32:</span>
              <span className="text-blue-400 font-bold">+{POINT_VALUES.R32} PTS</span>
            </div>
            <div className="flex justify-between">
              <span>ROUND OF 16:</span>
              <span className="text-blue-400 font-bold">+{POINT_VALUES.R16} PTS</span>
            </div>
            <div className="flex justify-between">
              <span>QUARTERFINALS:</span>
              <span className="text-blue-400 font-bold">+{POINT_VALUES.QF} PTS</span>
            </div>
          </div>
          <div className="space-y-2 font-mono text-slate-300">
            <div className="flex justify-between">
              <span>SEMIFINALS:</span>
              <span className="text-blue-400 font-bold">+{POINT_VALUES.SF} PTS</span>
            </div>
            <div className="flex justify-between text-blue-400 font-black">
              <span>WORLD CUP FINAL:</span>
              <span>+{POINT_VALUES.Final} PTS</span>
            </div>
            <p className="text-[10px] font-sans text-slate-400 font-bold uppercase tracking-wider pt-1 border-t border-slate-800">
              * Matches must be picked stage-by-stage based on correct progression.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
