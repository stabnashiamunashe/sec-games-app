import React from 'react';
import { ParticipatingTeam, ScorePrediction } from '../types';
import { calculateUserScore } from '../utils/scoring';
import { motion } from 'motion/react';
import { TrendingUp, CalendarCheck } from 'lucide-react';

interface SummaryViewProps {
  participatingTeams: ParticipatingTeam[];
  predictions: Record<string, Record<string, string>>; // teamId -> Record<matchId, teamId>
  scorePredictions: Record<string, Record<string, ScorePrediction>>;
  actualResults: Record<string, string>;
  games: any[]; // SQLite games list
  directPoints?: any[]; // optional list of direct point awards
}

export default function SummaryView({
  participatingTeams,
  predictions,
  scorePredictions,
  actualResults,
  games = [],
  directPoints = [],
}: SummaryViewProps) {
  // Compile totals for each team using database games list and direct points
  const teamsWithTotals = participatingTeams.map((pTeam) => {
    const p = predictions[pTeam.id] || {};
    const scorePicks = scorePredictions[pTeam.id] || {};
    const breakdown = calculateUserScore(p, actualResults, games, scorePicks);
    
    // Sum direct sports points
    const teamDirectPoints = (directPoints || []).filter(dp => dp.team_id === pTeam.id);
    const directPointsSum = teamDirectPoints.reduce((sum, item) => sum + Number(item.points || 0), 0);

    const currentSeasonPoints = breakdown.total + directPointsSum;

    const historyPoints = pTeam.cumulativeHistory.reduce((sum, item) => sum + item.points, 0);
    const grandTotal = historyPoints + currentSeasonPoints;

    return {
      ...pTeam,
      currentSeasonPoints,
      historyPoints,
      grandTotal,
      predictionsCount: Object.keys(p).filter((key) => key !== 'Champion' && p[key]).length,
      championPick: p['Champion'] || null,
    };
  });

  // Sort by current season points for the live standings view.
  const sortedByCurrent = [...teamsWithTotals].sort((a, b) => b.currentSeasonPoints - a.currentSeasonPoints);

  return (
    <div className="space-y-6" id="summary-view-section">
      {/* Dynamic Summary Cards - SecZim style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Current Season Standings Card */}
        <div className="bg-white rounded-none p-5 sm:p-6 border-4 border-brand-dark shadow-none space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <TrendingUp className="text-brand-gold w-5 h-5 shrink-0" />
            <h3 className="font-black text-brand-dark text-lg uppercase tracking-tight font-sans">Current Season Standings</h3>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-dark-muted">
            Starts at zero and updates from settled predictions plus admin-recorded actual points.
          </p>

          <div className="space-y-5 pt-2">
            {sortedByCurrent.map((team, index) => {
              const maxCurrentTotal = Math.max(...teamsWithTotals.map((t) => t.currentSeasonPoints)) || 1;
              const percentage = (team.currentSeasonPoints / maxCurrentTotal) * 100;

              return (
                <div key={team.id} className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-black uppercase tracking-tight">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-brand-gold font-mono w-4">#{index + 1}</span>
                      <span className="text-brand-dark">{team.avatar} {team.name}</span>
                    </div>
                    <span className="font-black text-brand-dark font-mono">
                      {team.currentSeasonPoints} <span className="text-[10px] text-brand-dark-muted">PTS</span>
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
                    <span>PREVIOUS SEASONS: {team.cumulativeHistory.map(h => `${h.season} (${h.points}p)`).join(', ') || 'NONE'}</span>
                    <span className="text-brand-gold font-black">CURRENT: {team.currentSeasonPoints}P</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Account Profiles */}
        <div className="bg-white rounded-none p-5 sm:p-6 border-4 border-brand-dark shadow-none space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <CalendarCheck className="text-brand-gold w-5 h-5 shrink-0" />
            <h3 className="font-black text-brand-dark text-lg uppercase tracking-tight font-sans">Team Profiles</h3>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-dark-muted">
            Team profile snapshot and current prediction activity.
          </p>

          <div className="divide-y-2 divide-slate-100">
            {participatingTeams.map((team) => {
              const teamData = teamsWithTotals.find((t) => t.id === team.id);

              return (
                <div key={team.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 border-2 border-brand-dark flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: `${team.color}15` }}
                      >
                        {team.avatar}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-brand-dark text-xs uppercase tracking-tight truncate">
                          {team.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-brand-dark-muted font-bold">
                          <span>PREDICTIONS MADE: {teamData?.predictionsCount || 0}</span>
                          <span>•</span>
                          <span>CURRENT POINTS: {teamData?.currentSeasonPoints || 0} PTS</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
