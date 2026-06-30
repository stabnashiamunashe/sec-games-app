import React, { useState } from 'react';
import { ParticipatingTeam } from '../types';
import { calculateUserScore } from '../utils/scoring';
import { WORLD_CUP_TEAMS } from '../data/teams';
import { motion } from 'motion/react';
import { Award, TrendingUp, CalendarCheck, Edit2, Check, Sparkles } from 'lucide-react';

interface SummaryViewProps {
  participatingTeams: ParticipatingTeam[];
  predictions: Record<string, Record<string, string>>; // teamId -> Record<matchId, teamId>
  actualResults: Record<string, string>;
  onRenameTeam: (teamId: string, newName: string, newAvatar: string, color: string, passcode: string, cumulativeHistory: any[]) => Promise<void>;
  games: any[]; // SQLite games list
  directPoints?: any[]; // optional list of direct point awards
}

export default function SummaryView({
  participatingTeams,
  predictions,
  actualResults,
  onRenameTeam,
  games = [],
  directPoints = [],
}: SummaryViewProps) {
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editPasscode, setEditPasscode] = useState('');

  const emojiList = ['⚖️', '🔍', '📜', '💼', '🏛️', '🛡️', '📈', '🌐', '⚡', '📊', '🤝', '🔔'];

  const getTeamName = (id: string | null): string => {
    if (!id) return 'Pending';
    const t = WORLD_CUP_TEAMS.find((team) => team.id === id);
    if (t) return `${t.flag} ${t.name}`;

    const d = participatingTeams.find((dept) => dept.id === id);
    return d ? `${d.avatar} ${d.name}` : id;
  };

  const startEditing = (team: ParticipatingTeam) => {
    setEditingTeamId(team.id);
    setEditName(team.name);
    setEditAvatar(team.avatar);
    setEditColor(team.color);
    setEditPasscode(team.passcode || '');
  };

  const handleSave = async (team: ParticipatingTeam) => {
    if (editName.trim()) {
      await onRenameTeam(team.id, editName.trim(), editAvatar, editColor, editPasscode, team.cumulativeHistory);
    }
    setEditingTeamId(null);
  };

  // Compile totals for each team using database games list and direct points
  const teamsWithTotals = participatingTeams.map((pTeam) => {
    const p = predictions[pTeam.id] || {};
    const breakdown = calculateUserScore(p, actualResults, games);
    
    // Sum direct sports points
    const teamDirectPoints = (directPoints || []).filter(dp => dp.team_id === pTeam.id);
    const directPointsSum = teamDirectPoints.reduce((sum, item) => sum + item.points, 0);

    const currentSeasonPoints = breakdown.total + directPointsSum;

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
      {/* Dynamic Summary Cards - SecZim style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Cumulative Season Standings Card */}
        <div className="bg-white rounded-none p-5 sm:p-6 border-4 border-brand-dark shadow-none space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <TrendingUp className="text-brand-gold w-5 h-5 shrink-0" />
            <h3 className="font-black text-brand-dark text-lg uppercase tracking-tight font-sans">Cumulative League Standings</h3>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-dark-muted">
            Historical totals (2022, 2024) plus the current ongoing season standings.
          </p>

          <div className="space-y-5 pt-2">
            {sortedByCumulative.map((team, index) => {
              const maxGrandTotal = Math.max(...teamsWithTotals.map((t) => t.grandTotal)) || 1;
              const percentage = (team.grandTotal / maxGrandTotal) * 100;

              return (
                <div key={team.id} className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-black uppercase tracking-tight">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-brand-gold font-mono w-4">#{index + 1}</span>
                      <span className="text-brand-dark">{team.avatar} {team.name}</span>
                    </div>
                    <span className="font-black text-brand-dark font-mono">
                      {team.grandTotal} <span className="text-[10px] text-brand-dark-muted">PTS</span>
                    </span>
                  </div>
                  {/* Progress bar - Square Theme */}
                  <div className="w-full bg-slate-100 h-4 rounded-none border-2 border-brand-dark overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-none"
                      style={{ backgroundColor: team.color }}
                    ></motion.div>
                  </div>
                  {/* Year breakdown text */}
                  <div className="flex justify-between text-[10px] font-mono text-brand-dark-muted px-1">
                    <span>PREVIOUS SEASONS: {team.cumulativeHistory.map(h => `${h.season} (${h.points}p)`).join(', ')}</span>
                    <span className="text-brand-gold font-black">CURRENT: +{team.currentSeasonPoints}P</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Account Profiler and Team Management */}
        <div className="bg-white rounded-none p-5 sm:p-6 border-4 border-brand-dark shadow-none space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <CalendarCheck className="text-brand-gold w-5 h-5 shrink-0" />
            <h3 className="font-black text-brand-dark text-lg uppercase tracking-tight font-sans">Profile Settings</h3>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-dark-muted">
            Customize display names and avatars for competing departments.
          </p>

          <div className="divide-y-2 divide-slate-100">
            {participatingTeams.map((team) => {
              const isEditing = editingTeamId === team.id;
              const teamData = teamsWithTotals.find((t) => t.id === team.id);

              return (
                <div key={team.id} className="py-3.5 first:pt-0 last:pb-0">
                  {isEditing ? (
                    <div className="space-y-3 bg-brand-gold-bg/30 p-3.5 rounded-none border-2 border-brand-dark">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Team Name"
                          maxLength={30}
                          className="flex-1 bg-white border-2 border-brand-dark rounded-none px-2.5 py-1.5 text-xs font-black uppercase tracking-wider focus:outline-none focus:border-brand-gold text-brand-dark"
                        />
                        <button
                          onClick={() => handleSave(team)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none p-2 border-2 border-brand-dark transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                        <div>
                          <label className="text-[9px] font-black uppercase text-brand-dark-muted block mb-1">Passcode PIN:</label>
                          <input
                            type="text"
                            maxLength={4}
                            value={editPasscode}
                            onChange={(e) => setEditPasscode(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white border-2 border-brand-dark px-2 py-1 font-mono tracking-widest focus:outline-none focus:border-brand-gold text-brand-dark"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-brand-dark-muted block mb-1">Theme Color:</label>
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="w-full h-8 bg-white border-2 border-brand-dark p-0.5 cursor-pointer focus:outline-none focus:border-brand-gold"
                          />
                        </div>
                      </div>

                      {/* Avatar Picker */}
                      <div>
                        <span className="text-[9px] text-brand-dark-muted font-black uppercase block mb-1.5 tracking-wider">Select Badge Icon</span>
                        <div className="flex flex-wrap gap-1">
                          {emojiList.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setEditAvatar(emoji)}
                              className={`w-8 h-8 flex items-center justify-center border-2 text-lg hover:bg-white transition-all rounded-none ${
                                editAvatar === emoji ? 'border-brand-dark bg-white font-bold' : 'border-slate-200 bg-slate-50'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 border-2 border-brand-dark flex items-center justify-center text-xl shrink-0"
                          style={{ backgroundColor: `${team.color}15` }}
                        >
                          {team.avatar}
                        </div>
                        <div>
                          <h4 className="font-black text-brand-dark text-xs uppercase tracking-tight flex items-center gap-1.5">
                            {team.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-brand-dark-muted font-bold">
                            <span>PREDICTIONS MADE: {teamData?.predictionsCount || 0}</span>
                            <span>•</span>
                            <span>GRAND TOTAL: {teamData?.grandTotal || 0} PTS</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => startEditing(team)}
                        className="p-2 border-2 border-brand-dark bg-slate-50 hover:bg-white transition-colors cursor-pointer"
                        title="Edit Profile"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-brand-dark" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
