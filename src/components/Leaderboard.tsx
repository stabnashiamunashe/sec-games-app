import React, { useState } from "react";
import { ParticipatingTeam, ScorePrediction, PointsConfig } from "../types";
import { calculateUserScore } from "../utils/scoring";
import { WORLD_CUP_TEAMS } from "../data/teams";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  Award,
  ChevronDown,
  ChevronUp,
  Activity,
  ShieldCheck,
} from "lucide-react";
import Twemoji from "react-twemoji";

interface LeaderboardProps {
  participatingTeams: ParticipatingTeam[];
  predictions: Record<string, Record<string, string>>;
  scorePredictions: Record<string, Record<string, ScorePrediction>>;
  actualResults: Record<string, string>;
  onSelectTeamPredictor: (teamId: string) => void;
  games: any[];
  directPoints?: any[];
  pointsConfig: PointsConfig;
}

export default function Leaderboard({
  participatingTeams,
  predictions,
  scorePredictions,
  actualResults,
  onSelectTeamPredictor,
  games = [],
  directPoints = [],
  pointsConfig,
}: LeaderboardProps) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const teamScores = participatingTeams.map((pTeam) => {
    const p = predictions[pTeam.id] || {};
    const scorePicks = scorePredictions[pTeam.id] || {};
    // NOW USING THE DYNAMIC CONFIG PROVIDED BY THE DB
    const breakdown = calculateUserScore(
      p,
      actualResults,
      games,
      scorePicks,
      pointsConfig,
    );

    const predictionPoints = breakdown.total;
    const teamDirectPoints = (directPoints || []).filter(
      (dp) => dp.team_id === pTeam.id,
    );
    const directPointsSum = teamDirectPoints.reduce(
      (sum, item) => sum + Number(item.points || 0),
      0,
    );

    return {
      ...pTeam,
      breakdown,
      directPointsList: teamDirectPoints,
      directPointsSum,
      predictionPoints,
      currentPoints: predictionPoints + directPointsSum,
    };
  });

  const sortedTeams = [...teamScores].sort(
    (a, b) => b.currentPoints - a.currentPoints,
  );

  const getTeamName = (id: string | null): string => {
    if (!id) return "Pending";
    const t = WORLD_CUP_TEAMS.find((team) => team.id === id);
    if (t) return `${t.flag} ${t.name}`;

    const predictionTeam = participatingTeams.find((p) => p.id === id);
    return predictionTeam
      ? `${predictionTeam.avatar} ${predictionTeam.name}`
      : id;
  };

  const toggleExpand = (teamId: string) => {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
  };

  return (
    <div className="space-y-6" id="leaderboard-section">
      <div className="bg-brand-dark p-5 sm:p-6 text-white border-4 border-brand-dark rounded-none relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 font-black text-6xl uppercase tracking-tighter select-none pointer-events-none">
          SECZIM
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 relative">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tighter uppercase flex items-center gap-2 font-sans">
              <Trophy className="text-brand-gold w-6 h-6 shrink-0" />
              Championship Standings
            </h2>
            <p className="text-brand-gold text-xs font-bold uppercase tracking-widest mt-1">
              Current points from settled predictions, score-guess bonuses, and
              actual awards
            </p>
          </div>
          <div className="bg-brand-dark-medium p-3 rounded-none border-2 border-brand-dark-light text-[10px] font-mono text-brand-dark-slate space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-brand-gold"></span>
              <span>BASE ROUND WINS: SCALED DYNAMICALLY BY ROUND</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-white"></span>
              <span>
                SECZIM CORPORATE GAMES: {pointsConfig.SecZim} PTS EACH
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-brand-gold"></span>
              <span>
                THIRD-PLACE PLAYOFF: {pointsConfig.Third} PTS WINNER, {pointsConfig.Third_oneExactScore} PTS PER CORRECT SCORE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-400"></span>
              <span>SCORE GUESSES: BONUS SCALED BY ADMIN RULES</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-none border-4 border-brand-dark shadow-none overflow-hidden">
        <div className="divide-y-2 divide-brand-dark">
          {sortedTeams.map((team, index) => {
            const isFirst = index === 0;
            const isExpanded = expandedTeamId === team.id;
            const colorClass = team.color;

            return (
              <div
                key={team.id}
                className="transition-colors hover:bg-brand-gold-bg/30"
              >
                <div
                  className="flex items-center justify-between p-4 sm:p-5 cursor-pointer select-none border-l-8"
                  style={{ borderLeftColor: colorClass }}
                  onClick={() => toggleExpand(team.id)}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex items-center justify-center w-8 h-8 font-black text-lg bg-brand-dark text-white rounded-none font-sans">
                      {index + 1}
                    </div>
                    <div
                      className="w-10 h-10 rounded-none flex items-center justify-center text-xl font-bold border-2 border-brand-dark"
                      style={{ backgroundColor: `${colorClass}15` }}
                    >
                      {team.avatar}
                    </div>
                    <div>
                      <h3 className="font-black text-brand-dark text-base flex items-center gap-2 uppercase tracking-tight">
                        {team.name}
                        {isFirst && (
                          <span className="bg-brand-gold text-brand-dark text-[9px] font-black px-2 py-0.5 rounded-none uppercase tracking-widest">
                            LEADER
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-brand-dark-muted font-bold uppercase tracking-wider">
                        TAP TO EXPAND POINT HISTORY
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-black text-brand-dark font-mono">
                        {team.currentPoints}
                      </span>
                      <span className="text-[9px] text-brand-dark-light font-bold uppercase tracking-widest block">
                        points
                      </span>
                    </div>
                    <div className="text-brand-dark">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 stroke-2" />
                      ) : (
                        <ChevronDown className="w-5 h-5 stroke-2" />
                      )}
                    </div>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden border-t-2 border-brand-dark bg-brand-gold-bg/10"
                    >
                      <div
                        className="p-4 sm:p-6 space-y-4 border-l-8"
                        style={{ borderLeftColor: colorClass }}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-dark-light block mb-1">
                          PREDICTION POINTS BREAKDOWN
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center">
                          <div className="bg-white p-2 rounded-none border-2 border-brand-dark">
                            <span className="text-[9px] text-brand-dark-muted uppercase font-black tracking-widest block">
                              R32
                            </span>
                            <span className="text-sm font-black text-brand-dark font-mono">
                              {team.breakdown.R32}
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-none border-2 border-brand-dark">
                            <span className="text-[9px] text-brand-dark-muted uppercase font-black tracking-widest block">
                              R16
                            </span>
                            <span className="text-sm font-black text-brand-dark font-mono">
                              {team.breakdown.R16}
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-none border-2 border-brand-dark">
                            <span className="text-[9px] text-brand-dark-muted uppercase font-black tracking-widest block">
                              QF
                            </span>
                            <span className="text-sm font-black text-brand-dark font-mono">
                              {team.breakdown.QF}
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-none border-2 border-brand-dark">
                            <span className="text-[9px] text-brand-dark-muted uppercase font-black tracking-widest block">
                              SF
                            </span>
                            <span className="text-sm font-black text-brand-dark font-mono">
                              {team.breakdown.SF}
                            </span>
                          </div>
                          <div className="bg-brand-gold-pale p-2 rounded-none border-2 border-brand-gold">
                            <span className="text-[9px] text-brand-dark font-black uppercase tracking-widest block">
                              3rd Place
                            </span>
                            <span className="text-sm font-black text-brand-dark font-mono">
                              {team.breakdown.Third}
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-none border-2 border-brand-dark">
                            <span className="text-[9px] text-brand-dark-muted uppercase font-black tracking-widest block">
                              Final
                            </span>
                            <span className="text-sm font-black text-brand-dark font-mono">
                              {team.breakdown.Final}
                            </span>
                          </div>
                          <div className="bg-brand-gold-pale p-2 rounded-none border-2 border-brand-gold">
                            <span className="text-[9px] text-brand-dark font-black uppercase tracking-widest block">
                              SecZim
                            </span>
                            <span className="text-sm font-black text-brand-dark font-mono">
                              {team.breakdown.SecZim}
                            </span>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded-none border-2 border-emerald-500">
                            <span className="text-[9px] text-emerald-800 font-black uppercase tracking-widest block">
                              Score Bonus
                            </span>
                            <span className="text-sm font-black text-brand-dark font-mono">
                              {team.breakdown.ScoreBonus}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                          <div className="bg-white p-2 rounded-none border-2 border-brand-dark">
                            <span className="text-[9px] text-brand-dark-muted uppercase font-black tracking-widest block">
                              Prediction Points
                            </span>
                            <span className="text-sm font-black text-brand-dark font-mono">
                              {team.predictionPoints}
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-none border-2 border-brand-dark">
                            <span className="text-[9px] text-brand-dark-muted uppercase font-black tracking-widest block">
                              Actual Awards
                            </span>
                            <span className="text-sm font-black text-brand-dark font-mono">
                              {team.directPointsSum}
                            </span>
                          </div>
                          <div className="bg-brand-dark p-2 rounded-none border-2 border-brand-dark">
                            <span className="text-[9px] text-brand-gold uppercase font-black tracking-widest block">
                              Current Total
                            </span>
                            <span className="text-sm font-black text-white font-mono">
                              {team.currentPoints}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-none border-2 border-brand-dark flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Award className="text-brand-gold w-5 h-5 shrink-0" />
                            <div>
                              <span className="text-[10px] text-brand-dark-muted font-bold uppercase block tracking-wider">
                                Predicted World Cup Champion
                              </span>
                              <span className="font-black text-brand-dark text-sm sm:text-base">
                                <Twemoji>
                                  <span className="uppercase">
                                    {getTeamName(
                                      predictions[team.id]?.["Champion"] ||
                                        predictions[team.id]?.["Final-1"] ||
                                        null,
                                    )}
                                  </span>
                                </Twemoji>
                              </span>
                            </div>
                          </div>
                          <div>
                            {actualResults["Final-1"] ? (
                              (predictions[team.id]?.["Champion"] ||
                                predictions[team.id]?.["Final-1"]) ===
                              actualResults["Final-1"] ? (
                                <span className="flex items-center gap-1 text-brand-dark text-xs font-black bg-brand-gold px-3 py-1 rounded-none uppercase tracking-wider">
                                  Correct Champion (+{pointsConfig.Final})
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-white text-xs font-black bg-brand-dark-muted px-3 py-1 rounded-none uppercase tracking-wider">
                                  Incorrect
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-brand-dark-light bg-brand-gold-bg px-3 py-1 border border-brand-dark-border rounded-none uppercase font-black tracking-wider">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {team.directPointsList &&
                          team.directPointsList.length > 0 && (
                            <div className="bg-white p-4 rounded-none border-2 border-brand-dark space-y-2">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-dark flex items-center gap-1.5">
                                  <Trophy className="w-4 h-4 text-brand-gold" />{" "}
                                  Actual Points Awards
                                </span>
                                <span className="text-[10px] font-mono font-black text-brand-gold bg-brand-dark px-2 py-0.5">
                                  TOTAL: +{team.directPointsSum} PTS
                                </span>
                              </div>
                              <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto pr-1">
                                {team.directPointsList.map((dp: any) => (
                                  <div
                                    key={dp.id}
                                    className="py-2 flex items-center justify-between text-xs"
                                  >
                                    <div className="space-y-0.5">
                                      <span className="font-black text-brand-dark block uppercase">
                                        {dp.game_name}
                                      </span>
                                      <span className="text-[9px] font-mono text-brand-dark-muted block">
                                        Awarded:{" "}
                                        {new Date(
                                          dp.date_awarded,
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <span className="font-mono font-black text-brand-dark bg-brand-gold-pale px-2.5 py-1 border border-brand-gold text-xs shrink-0">
                                      +{dp.points} PTS
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => onSelectTeamPredictor(team.id)}
                            className="text-xs font-black bg-brand-dark text-white hover:bg-brand-gold hover:text-brand-dark px-4 py-2.5 rounded-none flex items-center gap-2 uppercase tracking-widest cursor-pointer border-2 border-brand-dark transition-all"
                          >
                            <Activity className="w-4 h-4 text-brand-gold" />
                            View/Edit Team Predictions
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

      <div className="bg-brand-dark text-white rounded-none p-5 sm:p-6 border-4 border-brand-dark">
        <h4 className="text-sm font-black uppercase tracking-widest text-brand-gold flex items-center gap-2 mb-3 font-sans">
          <ShieldCheck className="w-5 h-5 text-brand-gold" />
          Scoring Rules Reference
        </h4>
        <div className="text-xs font-sans">
          <div className="space-y-2 font-mono text-brand-dark-slate">
            <p>
              Scoring points per round (R32, R16, QF, SF, Final, and Custom
              Games) and score bonuses are entirely configurable dynamically by
              Tournament Administrators through the{" "}
              <span className="text-brand-gold font-bold">Admin Panel</span>.
            </p>
            <p className="mt-2 text-[10px] text-brand-dark-gray border-t border-brand-dark-medium pt-2">
              The calculations updating this leaderboard take into account the
              exact settings configured. If an administrator updates points for
              a specific round or exact score rules, those points apply to all
              successfully recorded predictions retroactively.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
