import React, { useState, useEffect } from "react";
import { ParticipatingTeam } from "./types";
import Leaderboard from "./components/Leaderboard";
import BracketView from "./components/BracketView";
import ResultsAdmin from "./components/ResultsAdmin";
import SummaryView from "./components/SummaryView";
import {
  Trophy,
  CalendarCheck,
  Shield,
  TrendingUp,
  RefreshCw,
  ArrowRightLeft,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "leaderboard" | "predict" | "admin" | "summary"
  >("leaderboard");
  const [participatingTeams, setParticipatingTeams] = useState<
    ParticipatingTeam[]
  >([]);
  const [predictions, setPredictions] = useState<
    Record<string, Record<string, string>>
  >({});
  const [games, setGames] = useState<any[]>([]);
  const [actualResults, setActualResults] = useState<Record<string, string>>(
    {},
  );
  const [directPoints, setDirectPoints] = useState<any[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string>("compliance");
  const [currentTimeIso, setCurrentTimeIso] = useState<string>(() =>
    new Date().toISOString(),
  );
  const [apiSyncStatus, setApiSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");

  const refreshServerTime = async () => {
    try {
      const timeRes = await fetch("/api/time");
      if (timeRes.ok) {
        const timeData = await timeRes.json();
        if (timeData.now) setCurrentTimeIso(timeData.now);
      }
    } catch (err) {
      console.error("Failed to refresh server time:", err);
    }
  };

  // Load all persistent data from the full-stack database
  const loadDatabaseData = async () => {
    try {
      await refreshServerTime();

      // 2. Fetch Teams
      const teamsRes = await fetch("/api/teams");
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setParticipatingTeams(teamsData);
      }

      // 3. Fetch Games
      const gamesRes = await fetch("/api/games");
      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        setGames(gamesData);

        // Extract actual results dynamically from the games finished status
        const extractedResults: Record<string, string> = {};
        gamesData.forEach((g: any) => {
          if (g.finished === "TRUE" && g.winner_id) {
            extractedResults[g.id] = g.winner_id;
          }
        });
        setActualResults(extractedResults);
      }

      // 4. Fetch Predictions
      const predsRes = await fetch("/api/predictions");
      if (predsRes.ok) {
        const predsData = await predsRes.json();
        setPredictions(predsData);
      }

      // 5. Fetch Direct non-prediction points
      const directPointsRes = await fetch("/api/direct-points");
      if (directPointsRes.ok) {
        const dpData = await directPointsRes.json();
        setDirectPoints(dpData);
      }
    } catch (err) {
      console.error("Failed to load database content:", err);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(refreshServerTime, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Sync with live World Cup API via secure server proxy
  const handleLiveSync = async () => {
    setApiSyncStatus("syncing");
    try {
      const adminPass = localStorage.getItem("seczim_admin_password_key");
      if (!adminPass) {
        alert(
          "Please sign in as an administrator before syncing live results.",
        );
        setActiveTab("admin");
        setApiSyncStatus("idle");
        return;
      }

      const response = await fetch("/api/worldcup-live-sync");
      if (!response.ok) throw new Error("Proxy failed");
      const data = await response.json();

      if (data && Array.isArray(data.games)) {
        const apiResults: Record<string, string> = {};

        // Match up mapping
        const mapApiIdToInternalId = (apiId: string, type: string): string => {
          const numericId = parseInt(apiId);
          if (type === "r32" || (numericId >= 73 && numericId <= 88))
            return `R32-${numericId - 72}`;
          if (type === "r16" || (numericId >= 89 && numericId <= 96))
            return `R16-${numericId - 88}`;
          if (type === "qf" || (numericId >= 97 && numericId <= 100))
            return `QF-${numericId - 96}`;
          if (type === "sf" || (numericId >= 101 && numericId <= 102))
            return `SF-${numericId - 100}`;
          if (type === "final" || numericId === 104) return "Final-1";
          return "";
        };

        const getWinnerIdFromApiGame = (g: any): string | null => {
          if (g.finished !== "TRUE") return null;
          const homeScore = parseInt(g.home_score);
          const awayScore = parseInt(g.away_score);
          if (homeScore > awayScore) return g.home_team_id;
          if (awayScore > homeScore) return g.away_team_id;
          const homePen = parseInt(g.home_penalty_score || "0");
          const awayPen = parseInt(g.away_penalty_score || "0");
          if (homePen > awayPen) return g.home_team_id;
          if (awayPen > homePen) return g.away_team_id;
          return null;
        };

        for (const g of data.games) {
          if (g.type !== "group" && g.finished === "TRUE") {
            const internalId = mapApiIdToInternalId(g.id, g.type);
            const winnerId = getWinnerIdFromApiGame(g);
            if (internalId && winnerId) {
              await fetch("/api/admin/games/score", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-admin-password": adminPass,
                },
                body: JSON.stringify({
                  gameId: internalId,
                  home_score: g.home_score,
                  away_score: g.away_score,
                  winner_id: winnerId,
                  finished: "TRUE",
                }),
              });
            }
          }
        }

        setApiSyncStatus("synced");
        await loadDatabaseData();
      } else {
        setApiSyncStatus("error");
      }
    } catch (err) {
      console.error("Failed to sync live outcomes:", err);
      setApiSyncStatus("error");
    }
  };

  // Local state dispatch for predictions updates
  const handleSavePredictionsState = async (
    teamId: string,
    updatedPredictions: Record<string, string>,
  ): Promise<boolean> => {
    // Refresh global state from database
    await loadDatabaseData();
    return true;
  };

  const activeTeam =
    participatingTeams.find((t) => t.id === activeTeamId) ||
    participatingTeams[0];

  return (
    <div className="min-h-screen flex flex-col antialiased border-4 sm:border-8 border-brand-dark bg-brand-gold-bg/40">
      {/* Brand Identity Navigation Header */}
      <header className="bg-brand-dark text-white p-5 sm:p-6 flex justify-between items-center border-b-4 border-brand-dark relative">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-white rounded-none flex items-center justify-center border-2 border-white select-none shadow-sm overflow-hidden">
            <img
              src="/images/logo.png"
              alt="SecZim logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase leading-none font-sans">
              SecZim Games
            </h1>
            <p className="text-brand-gold text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1">
              Securities & Exchange Commission of Zimbabwe • Portal
            </p>
          </div>
        </div>

        {/* Competitor Account Badge */}
        {activeTeam && (
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-brand-dark-gray uppercase font-bold tracking-wider">
                Predictor Desk
              </p>
              <p className="font-mono text-brand-gold text-xs font-bold uppercase">
                {activeTeam.name.replace("SecZim ", "")}
              </p>
            </div>
            <div className="h-10 w-10 border-2 border-brand-gold bg-brand-dark-medium flex items-center justify-center rounded-none text-white text-xl">
              {activeTeam.avatar}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
        <div className="space-y-6">
          {/* Tournament Clock / Live Sync */}
          <div className="bg-brand-dark text-white p-4 border-4 border-brand-dark flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-gold rounded-none text-brand-dark shrink-0">
                <CalendarCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                    Championship Lock Clock
                  </h3>

                  {apiSyncStatus === "syncing" && (
                    <span className="flex items-center gap-1 text-[8px] bg-brand-gold/20 text-brand-gold font-bold border border-brand-gold/40 px-1.5 py-0.5 uppercase tracking-wider animate-pulse">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin text-brand-gold" />{" "}
                      Syncing
                    </span>
                  )}
                  {apiSyncStatus === "synced" && (
                    <span className="flex items-center gap-1 text-[8px] bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-500/50 px-1.5 py-0.5 uppercase tracking-wider">
                      ✓ Sync OK
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono font-bold text-brand-gold uppercase mt-0.5">
                  SERVER UTC TIME:{" "}
                  {new Date(currentTimeIso).toUTCString().replace("GMT", "UTC")}
                </p>
              </div>
            </div>

            {/* Time refresh & sync buttons */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <button
                onClick={refreshServerTime}
                className="py-2 px-2.5 rounded-none text-[9px] font-black uppercase tracking-wider bg-brand-dark-medium text-brand-dark-slate border border-brand-dark-light hover:bg-brand-dark-light hover:text-white cursor-pointer flex items-center gap-1"
                title="Refresh the server clock used for prediction locks"
              >
                <RefreshCw className="w-2.5 h-2.5 shrink-0" /> Refresh Time
              </button>

              <button
                onClick={handleLiveSync}
                className="py-2 px-2.5 rounded-none text-[9px] font-black uppercase tracking-wider bg-brand-gold hover:bg-brand-gold-light text-brand-dark border border-brand-gold cursor-pointer flex items-center gap-1"
                title="Settle results from World Cup Live API"
              >
                <RefreshCw className="w-2.5 h-2.5 shrink-0" /> Sync World Cup
              </button>
            </div>
          </div>

          {/* Tab Menu - Corporate Grid Layout */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-brand-dark-border border-2 border-brand-dark rounded-none">
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`py-3 px-1 rounded-none text-xs font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "leaderboard"
                  ? "bg-brand-dark text-white"
                  : "bg-white text-brand-dark hover:bg-slate-50"
              }`}
            >
              <Trophy className="w-4 h-4 text-brand-gold" />
              <span className="truncate">Standings</span>
            </button>

            <button
              onClick={() => setActiveTab("predict")}
              className={`py-3 px-1 rounded-none text-xs font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "predict"
                  ? "bg-brand-dark text-white"
                  : "bg-white text-brand-dark hover:bg-slate-50"
              }`}
            >
              <ArrowRightLeft className="w-4 h-4 text-brand-gold" />
              <span className="truncate">Predict Desk</span>
            </button>

            <button
              onClick={() => setActiveTab("admin")}
              className={`py-3 px-1 rounded-none text-xs font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "admin"
                  ? "bg-brand-dark text-white"
                  : "bg-white text-brand-dark hover:bg-slate-50"
              }`}
            >
              <Shield className="w-4 h-4 text-brand-gold" />
              <span className="truncate">Settle/Admin</span>
            </button>

            <button
              onClick={() => setActiveTab("summary")}
              className={`py-3 px-1 rounded-none text-xs font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "summary"
                  ? "bg-brand-dark text-white"
                  : "bg-white text-brand-dark hover:bg-slate-50"
              }`}
            >
              <TrendingUp className="w-4 h-4 text-brand-gold" />
              <span className="truncate">Summary</span>
            </button>
          </div>

          {/* Dynamic Component Outlet */}
          <div className="min-h-[400px]">
            {activeTab === "leaderboard" && participatingTeams.length > 0 && (
              <Leaderboard
                participatingTeams={participatingTeams}
                predictions={predictions}
                actualResults={actualResults}
                games={games}
                directPoints={directPoints}
                onSelectTeamPredictor={(teamId) => {
                  setActiveTeamId(teamId);
                  setActiveTab("predict");
                }}
              />
            )}

            {activeTab === "predict" && activeTeam && (
              <BracketView
                activeTeam={activeTeam}
                predictions={predictions[activeTeam.id] || {}}
                onSavePredictions={handleSavePredictionsState}
                participatingTeams={participatingTeams}
                onChangeActiveTeam={(teamId) => setActiveTeamId(teamId)}
                currentTime={new Date(currentTimeIso)}
                games={games}
              />
            )}

            {activeTab === "admin" && (
              <ResultsAdmin
                actualResults={actualResults}
                onUpdateResults={async (updated) => {
                  setActualResults(updated);
                  await loadDatabaseData();
                }}
                games={games}
                participatingTeams={participatingTeams}
                onRefreshData={loadDatabaseData}
                currentTimeIso={currentTimeIso}
                onRefreshServerTime={refreshServerTime}
                directPoints={directPoints}
              />
            )}

            {activeTab === "summary" && participatingTeams.length > 0 && (
              <SummaryView
                participatingTeams={participatingTeams}
                predictions={predictions}
                actualResults={actualResults}
                games={games}
                directPoints={directPoints}
              />
            )}
          </div>
        </div>
      </main>

      {/* Small Ambient Footer */}
      <footer className="bg-brand-dark text-white border-t-4 border-brand-dark py-6 text-center text-xs font-bold uppercase tracking-wider mt-12">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-brand-dark-slate">
          <span>Securities & Exchange Commission of Zimbabwe</span>
        </div>
      </footer>
    </div>
  );
}
