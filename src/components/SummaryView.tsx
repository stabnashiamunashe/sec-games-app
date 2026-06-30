import React, { useState } from 'react';
import { ParticipatingTeam, Team } from '../types';
import { calculateUserScore } from '../utils/scoring';
import { WORLD_CUP_TEAMS } from '../data/teams';
import { motion } from 'motion/react';
import { Award, TrendingUp, Calendar, CalendarCheck, Edit2, Check, Sparkles } from 'lucide-react';

interface SummaryViewProps {
  participatingTeams: ParticipatingTeam[];
  predictions: Record<string, Record<string, string>>; // teamId -> Record<matchId, teamId>
  actualResults: Record<string, string>;
  onRenameTeam: (teamId: string, newName: string, newAvatar: string) => void;
}

export default function SummaryView({
  participatingTeams,
  predictions,
  actualResults,
  onRenameTeam,
}: SummaryViewProps) {
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  const emojiList = ['🦁', '🦅', '🐉', '🐺', '🐯', '🐼', '🦊', '🦄', '🐆', '🦈', '🐻', '🐍'];

  const getTeamName = (id: string | null): string => {
    if (!id) return 'Pending';
    const t = WORLD_CUP_TEAMS.find((team) => team.id === id);
    return t ? `${t.flag} ${t.name}` : id;
  };

  const startEditing = (team: ParticipatingTeam) => {
    setEditingTeamId(team.id);
    setEditName(team.name);
    setEditAvatar(team.avatar);
  };

  const handleSave = (teamId: string) => {
    if (editName.trim()) {
      onRenameTeam(teamId, editName.trim(), editAvatar);
    }
    setEditingTeamId(null);
  };

  // Compile totals for each team
  const teamsWithTotals = participatingTeams.map((pTeam) => {
    const p = predictions[pTeam.id] || {};
    const breakdown = calculateUserScore(p, actualResults);
    const currentSeasonPoints = breakdown.total;

    // Sum history points + current season points
    const historyPoints = pTeam.cumulativeHistory.reduce((sum, item) => sum + item.points, 0);
    const grandTotal = historyPoints + currentSeasonPoints;

    return {
      ...pTeam,
      currentSeasonPoints,
      grandTotal,
      predictionsCount: Object.keys(p).filter((key) => key !== 'Champion' && p[key]).length,
      championPick: p['Champion'] || null,
    };
  });

  // Sort by grandTotal descending for display
  const sortedByCumulative = [...teamsWithTotals].sort((a, b) => b.grandTotal - a.grandTotal);

  return (
    <div className="space-y-6" id="summary-view-section">
      {/* Dynamic Summary Cards - Geometric theme style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cumulative Season Standings Card */}
        <div className="bg-white rounded-none p-5 sm:p-6 border-4 border-slate-900 shadow-none space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <TrendingUp className="text-blue-600 w-5 h-5 shrink-0" />
            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Cumulative Standing</h3>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Historical totals (2018, 2022) plus the ongoing 2026 season scores.
          </p>

          <div className="space-y-5 pt-2">
            {sortedByCumulative.map((team, index) => {
              const maxGrandTotal = Math.max(...teamsWithTotals.map((t) => t.grandTotal)) || 1;
              const percentage = (team.grandTotal / maxGrandTotal) * 100;

              return (
                <div key={team.id} className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-black uppercase tracking-tight">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-blue-600 font-mono w-4">#{index + 1}</span>
                      <span className="text-slate-900">{team.avatar} {team.name}</span>
                    </div>
                    <span className="font-black text-slate-900 font-mono">{team.grandTotal} <span className="text-[10px] text-slate-400">PTS</span></span>
                  </div>
                  {/* Progress bar representing share of max points - Square Theme */}
                  <div className="w-full bg-slate-100 h-4 rounded-none border-2 border-slate-900 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-none"
                      style={{ backgroundColor: team.color }}
                    ></motion.div>
                  </div>
                  {/* Year breakdown text */}
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1">
                    <span>PRIOR: {team.cumulativeHistory.map(h => `${h.season} (${h.points}p)`).join(', ')}</span>
                    <span className="text-blue-600 font-black">2026: +{team.currentSeasonPoints}P</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Account Profiler and Team Management */}
        <div className="bg-white rounded-none p-5 sm:p-6 border-4 border-slate-900 shadow-none space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <CalendarCheck className="text-blue-600 w-5 h-5 shrink-0" />
            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Account Settings</h3>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Edit the competing user accounts. All brackets and histories will persist!
          </p>

          <div className="divide-y-2 divide-slate-100">
            {participatingTeams.map((team) => {
              const isEditing = editingTeamId === team.id;
              const teamData = teamsWithTotals.find((t) => t.id === team.id);

              return (
                <div key={team.id} className="py-3.5 first:pt-0 last:pb-0">
                  {isEditing ? (
                    <div className="space-y-3 bg-slate-50 p-3.5 rounded-none border-2 border-slate-900">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Team Name"
                          maxLength={25}
                          className="flex-1 bg-white border-2 border-slate-900 rounded-none px-2.5 py-1.5 text-xs font-black uppercase tracking-wider focus:outline-none"
                        />
                        <button
                          onClick={() => handleSave(team.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none p-2 border-2 border-slate-950 transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Avatar Picker */}
                      <div>
                        <span className="text-[9px] text-slate-500 font-black uppercase block mb-1.5 tracking-wider">Select Badge Emoji</span>
                        <div className="flex flex-wrap gap-1">
                          {emojiList.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setEditAvatar(emoji)}
                              className={`w-7 h-7 flex items-center justify-center rounded-none text-xs transition-all border-2 ${
                                editAvatar === emoji
                                  ? 'bg-blue-100 border-blue-600 scale-110 font-bold'
                                  : 'bg-white border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-none border-2 border-slate-900 flex items-center justify-center text-lg font-bold"
                          style={{ backgroundColor: `${team.color}15` }}
                        >
                          {team.avatar}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5 uppercase tracking-tight">
                            {team.name}
                            <button
                              onClick={() => startEditing(team)}
                              className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </h4>
                          <p className="text-[10px] font-mono text-slate-400">
                            GRAND CUMULATIVE: <strong className="text-slate-700 font-black font-sans">{teamData?.grandTotal} PTS</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-right text-xs font-mono">
                        <span className="font-black text-slate-900 block">
                          {teamData?.predictionsCount} / 31
                        </span>
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">PREDICTED</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid of Team Detail Breakdowns */}
      <div className="space-y-4 pt-2">
        <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight border-b-4 border-slate-900 pb-1">Campaign Quick-Picks</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teamsWithTotals.map((team) => (
            <div
              key={team.id}
              className="bg-white rounded-none border-4 border-slate-900 p-5 shadow-none space-y-4"
              style={{ borderTopWidth: '12px', borderTopColor: team.color }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{team.avatar}</span>
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{team.name}</h4>
                </div>
                <div className="bg-slate-100 px-2.5 py-1 border border-slate-300 text-right rounded-none">
                  <span className="text-[8px] text-slate-400 font-black uppercase block tracking-wider">CURRENT SCORE</span>
                  <span className="text-xs font-black text-blue-600 font-mono">+{team.currentSeasonPoints} PTS</span>
                </div>
              </div>

              {/* Mini Prediction Card Info */}
              <div className="bg-slate-50 rounded-none border-2 border-slate-900 p-3 text-xs space-y-2 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Predicted Champion:</span>
                  <span className="font-black text-slate-800 text-[11px]">
                    {team.championPick ? getTeamName(team.championPick).toUpperCase() : 'NOT SET'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t-2 border-slate-200 pt-2">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Bracket Locked:</span>
                  <span className="font-bold text-slate-800 text-[10px]">
                    {team.predictionsCount === 31 ? (
                      <span className="text-emerald-600 font-black uppercase tracking-wider bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                        LOCKED
                      </span>
                    ) : (
                      <span className="text-slate-600 uppercase tracking-wider">
                        {Math.round((team.predictionsCount / 31) * 100)}% COMPLETE
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
