import React, { useState, useEffect } from "react";
import {
  Stage,
  Match,
  Team,
  ParticipatingTeam,
  PointsConfig,
  ScorePrediction,
} from "../types";
import {
  WORLD_CUP_TEAMS,
  createInitialBracket,
  propagateBracketWinners,
} from "../data/teams";
import {
  Check,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  PlusCircle,
  Trash2,
  Save,
  Calendar,
  Sparkles,
  Settings2,
} from "lucide-react";
import Twemoji from "react-twemoji";

interface ResultsAdminProps {
  actualResults: Record<string, string>; // matchId -> winnerId
  onUpdateResults: (updatedResults: Record<string, string>) => void;
  games: any[]; // SQLite games list
  participatingTeams: ParticipatingTeam[];
  onRefreshData: () => Promise<void>;
  currentTimeIso: string;
  onRefreshServerTime: () => Promise<void>;
  directPoints?: any[]; // optional list of direct point awards
  predictions?: Record<string, Record<string, string>>; // teamId -> gameId -> winnerId
  scorePredictions?: Record<string, Record<string, ScorePrediction>>; // teamId -> gameId -> score
}

// Stage keys aligned with PointsConfig keys
const CONFIG_STAGES = [
  "R32",
  "R16",
  "QF",
  "SF",
  "Third",
  "Final",
  "SecZim",
] as const;

export default function ResultsAdmin({
  actualResults,
  onUpdateResults,
  games = [],
  participatingTeams,
  onRefreshData,
  currentTimeIso,
  onRefreshServerTime,
  directPoints = [],
  predictions = {},
  scorePredictions = {},
}: ResultsAdminProps) {
  // Admin Login State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem("seczim_admin_authenticated") === "true";
  });
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Category Toggler
  const [selectedCategory, setSelectedCategory] = useState<
    "world_cup" | "seczim_games"
  >("world_cup");
  const [selectedStage, setSelectedStage] = useState<Stage>("R32");

  // Toggle Forms
  const [showGameForm, setShowGameForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showDirectPointsForm, setShowDirectPointsForm] = useState(false);
  const [showPointsConfigForm, setShowPointsConfigForm] = useState(false);

  // Points Configuration State (Now with per-round score configs)
  const [pointsConfig, setPointsConfig] = useState<PointsConfig>({
    R32: 5,
    R16: 5,
    QF: 5,
    SF: 5,
    Third: 40,
    Final: 5,
    SecZim: 5,
    R32_oneExactScore: 7.5,
    R32_exactScoreline: 15,
    R16_oneExactScore: 7.5,
    R16_exactScoreline: 15,
    QF_oneExactScore: 7.5,
    QF_exactScoreline: 15,
    SF_oneExactScore: 7.5,
    SF_exactScoreline: 15,
    Third_oneExactScore: 20,
    Third_exactScoreline: 40,
    Final_oneExactScore: 7.5,
    Final_exactScoreline: 15,
    SecZim_oneExactScore: 7.5,
    SecZim_exactScoreline: 15,
  });

  // Custom Game Creation State
  const [newGameId, setNewGameId] = useState("");
  const [newGameStage, setNewGameStage] = useState("");
  const [newGameHomeId, setNewGameHomeId] = useState("");
  const [newGameAwayId, setNewGameAwayId] = useState("");
  const [newGameHomeLabel, setNewGameHomeLabel] = useState("");
  const [newGameAwayLabel, setNewGameAwayLabel] = useState("");
  const [newGameKickoff, setNewGameKickoff] = useState("2026-07-04T12:00:00Z");

  // Custom Team Creation State
  const [newTeamId, setNewTeamId] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#C09138");
  const [newTeamAvatar, setNewTeamAvatar] = useState("⚽");
  const [newTeamPasscode, setNewTeamPasscode] = useState("1234");
  const [teamPasscodeEdits, setTeamPasscodeEdits] = useState<
    Record<string, string>
  >({});
  const [savingPasscodeTeamId, setSavingPasscodeTeamId] = useState<
    string | null
  >(null);

  // Custom Direct Points State
  const [newDirectPointsTeamId, setNewDirectPointsTeamId] = useState("");
  const [newDirectPointsGameName, setNewDirectPointsGameName] = useState("");
  const [newDirectPointsPoints, setNewDirectPointsPoints] = useState("30");

  // Score entry temporary states
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [tempHomeScore, setTempHomeScore] = useState("");
  const [tempAwayScore, setTempAwayScore] = useState("");
  const [tempWinnerId, setTempWinnerId] = useState("");

  // Admin prediction override state (bypasses the kickoff/finished lock so
  // an admin can fix/enter any team's pick even after a match has started).
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [overrideTeamId, setOverrideTeamId] = useState("");
  const [overrideGameId, setOverrideGameId] = useState("");
  const [overrideWinnerId, setOverrideWinnerId] = useState("");
  const [overrideHomeScore, setOverrideHomeScore] = useState("");
  const [overrideAwayScore, setOverrideAwayScore] = useState("");
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // Fetch points config on load
  useEffect(() => {
    if (isAdminLoggedIn) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data.points_config) {
            setPointsConfig(JSON.parse(data.points_config));
          }
        })
        .catch(console.error);
    }
  }, [isAdminLoggedIn]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) return;

    setIsSubmitting(true);
    setLoginError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = await response.json();

      if (data.success) {
        setIsAdminLoggedIn(true);
        localStorage.setItem("seczim_admin_authenticated", "true");
        localStorage.setItem("seczim_admin_password_key", adminPassword);
        setLoginError("");
      } else {
        setLoginError(data.message || "Incorrect admin password.");
      }
    } catch (err) {
      setLoginError("Error connecting to authentication service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem("seczim_admin_authenticated");
    localStorage.removeItem("seczim_admin_password_key");
    setAdminPassword("");
  };

  const getAdminKey = () =>
    localStorage.getItem("seczim_admin_password_key") || "";

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError("");

    if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) {
      setPasswordChangeError("Please fill in all three fields.");
      return;
    }
    if (newPasswordInput.length < 4) {
      setPasswordChangeError(
        "New password must be at least 4 characters long.",
      );
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeError("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": getAdminKey(),
        },
        body: JSON.stringify({
          currentPassword: currentPasswordInput,
          newPassword: newPasswordInput,
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        // Keep the session working with the new password without forcing a
        // re-login.
        localStorage.setItem("seczim_admin_password_key", newPasswordInput);
        setCurrentPasswordInput("");
        setNewPasswordInput("");
        setConfirmPasswordInput("");
        setShowPasswordForm(false);
        alert("Admin password updated successfully.");
      } else {
        setPasswordChangeError(
          data.error || "Failed to update admin password.",
        );
      }
    } catch (err) {
      setPasswordChangeError("Error connecting to the server.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSavePointsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/settings/points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": getAdminKey(),
        },
        body: JSON.stringify({ points_config: pointsConfig }),
      });

      if (response.ok) {
        alert("Points configuration updated successfully!");
        setShowPointsConfigForm(false);
        await onRefreshData();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to update points configuration.");
      }
    } catch (err) {
      alert("Error saving points configuration.");
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamId || !newTeamName) return;
    try {
      const response = await fetch("/api/admin/teams/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": getAdminKey(),
        },
        body: JSON.stringify({
          id: newTeamId.toLowerCase().trim(),
          name: newTeamName.trim(),
          color: newTeamColor,
          avatar: newTeamAvatar,
          passcode: newTeamPasscode,
          cumulativeHistory: [
            { season: "2022", points: 300 },
            { season: "2024", points: 300 },
          ],
        }),
      });
      if (response.ok) {
        alert("Team added successfully!");
        setNewTeamId("");
        setNewTeamName("");
        setShowTeamForm(false);
        await onRefreshData();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to save team.");
      }
    } catch (err) {
      alert("Error adding team to database.");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this prediction team? This will delete all their predictions and brackets!",
      )
    )
      return;
    try {
      const response = await fetch("/api/admin/teams/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": getAdminKey(),
        },
        body: JSON.stringify({ teamId }),
      });
      if (response.ok) {
        alert("Team deleted.");
        await onRefreshData();
      } else {
        alert("Failed to delete team.");
      }
    } catch (err) {
      alert("Error deleting team.");
    }
  };

  const handleResetTeamPasscode = async (teamId: string) => {
    const newPasscode = teamPasscodeEdits[teamId] || "";
    if (!/^\d{4}$/.test(newPasscode)) {
      alert("Please enter a new 4-digit PIN.");
      return;
    }
    setSavingPasscodeTeamId(teamId);
    try {
      const response = await fetch("/api/admin/teams/passcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": getAdminKey(),
        },
        body: JSON.stringify({ teamId, newPasscode }),
      });
      if (response.ok) {
        alert("Team passcode reset successfully.");
        setTeamPasscodeEdits((prev) => ({ ...prev, [teamId]: "" }));
        await onRefreshData();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to reset passcode.");
      }
    } catch (err) {
      alert("Error resetting team passcode.");
    } finally {
      setSavingPasscodeTeamId(null);
    }
  };

  const handleAwardDirectPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newDirectPointsTeamId ||
      !newDirectPointsGameName ||
      !newDirectPointsPoints
    ) {
      alert("Please select a team, enter game name, and points.");
      return;
    }
    try {
      const response = await fetch("/api/admin/direct-points/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": getAdminKey(),
        },
        body: JSON.stringify({
          team_id: newDirectPointsTeamId,
          game_name: newDirectPointsGameName.trim(),
          points: parseInt(newDirectPointsPoints),
        }),
      });
      if (response.ok) {
        alert("Actual points awarded successfully!");
        setNewDirectPointsGameName("");
        await onRefreshData();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to award points.");
      }
    } catch (err) {
      alert("Error awarding points.");
    }
  };

  const handleDeleteDirectPoints = async (id: string) => {
    if (!confirm("Are you sure you want to delete this points entry?")) return;
    try {
      const response = await fetch("/api/admin/direct-points/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": getAdminKey(),
        },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        await onRefreshData();
      } else {
        alert("Failed to delete points entry.");
      }
    } catch (err) {
      alert("Error deleting points entry.");
    }
  };

  const handleAddCustomGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameId || !newGameStage) return;
    try {
      const response = await fetch("/api/admin/games/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": getAdminKey(),
        },
        body: JSON.stringify({
          id: newGameId.trim(),
          category: selectedCategory,
          stage: newGameStage.trim(),
          home_team_id: newGameHomeId || null,
          away_team_id: newGameAwayId || null,
          home_team_label: newGameHomeLabel || null,
          away_team_label: newGameAwayLabel || null,
          kickoff: newGameKickoff,
        }),
      });
      if (response.ok) {
        alert("Game created/updated successfully!");
        setNewGameId("");
        setNewGameStage("");
        setNewGameHomeId("");
        setNewGameAwayId("");
        setNewGameHomeLabel("");
        setNewGameAwayLabel("");
        setShowGameForm(false);
        await onRefreshData();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to save game.");
      }
    } catch (err) {
      alert("Error adding game to database.");
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (
      !confirm(
        `Are you sure you want to delete game ${gameId}? This cannot be undone.`,
      )
    )
      return;
    try {
      const response = await fetch("/api/admin/games/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": getAdminKey(),
        },
        body: JSON.stringify({ gameId }),
      });
      if (response.ok) {
        alert("Game deleted successfully.");
        await onRefreshData();
      } else {
        alert("Failed to delete game.");
      }
    } catch (err) {
      alert("Error deleting game.");
    }
  };

  const handleSaveScore = async (gameId: string) => {
    if (!tempWinnerId) {
      alert("Please select the winning team/outcome before settling!");
      return;
    }
    try {
      const gameBeingSettled = games.find((g) => g.id === gameId);

      const response = await fetch("/api/admin/games/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": getAdminKey(),
        },
        body: JSON.stringify({
          gameId,
          home_score: tempHomeScore ? parseInt(tempHomeScore) : null,
          away_score: tempAwayScore ? parseInt(tempAwayScore) : null,
          winner_id: tempWinnerId,
          finished: "TRUE",
          home_team_id: gameBeingSettled?.home_team_id || null,
          away_team_id: gameBeingSettled?.away_team_id || null,
          home_team_label: gameBeingSettled?.home_team_label || null,
          away_team_label: gameBeingSettled?.away_team_label || null,
        }),
      });

      if (response.ok) {
        const updatedResults = { ...actualResults, [gameId]: tempWinnerId };
        if (gameId === "Final-1") {
          updatedResults["Champion"] = tempWinnerId;
        }

        if (selectedCategory === "world_cup") {
          const tempBracket = propagateBracketWinners(
            createInitialBracket(),
            updatedResults,
          );
          const cleanResults = { ...updatedResults };

          tempBracket.R16.forEach((m) => {
            const allowed = [m.homeTeamId, m.awayTeamId].filter(
              Boolean,
            ) as string[];
            if (cleanResults[m.id] && !allowed.includes(cleanResults[m.id]))
              delete cleanResults[m.id];
          });
          const tempBracket2 = propagateBracketWinners(
            createInitialBracket(),
            cleanResults,
          );
          tempBracket2.QF.forEach((m) => {
            const allowed = [m.homeTeamId, m.awayTeamId].filter(
              Boolean,
            ) as string[];
            if (cleanResults[m.id] && !allowed.includes(cleanResults[m.id]))
              delete cleanResults[m.id];
          });
          const tempBracket3 = propagateBracketWinners(
            createInitialBracket(),
            cleanResults,
          );
          tempBracket3.SF.forEach((m) => {
            const allowed = [m.homeTeamId, m.awayTeamId].filter(
              Boolean,
            ) as string[];
            if (cleanResults[m.id] && !allowed.includes(cleanResults[m.id]))
              delete cleanResults[m.id];
          });
          const tempBracket4 = propagateBracketWinners(
            createInitialBracket(),
            cleanResults,
          );
          tempBracket4.Final.forEach((m) => {
            const allowed = [m.homeTeamId, m.awayTeamId].filter(
              Boolean,
            ) as string[];
            if (cleanResults[m.id] && !allowed.includes(cleanResults[m.id]))
              delete cleanResults[m.id];
          });

          onUpdateResults(cleanResults);
        } else {
          onUpdateResults(updatedResults);
        }

        setEditingGameId(null);
        alert("Score settled and standings updated.");
        await onRefreshData();
      } else {
        alert("Failed to save score. Please try again.");
      }
    } catch (err) {
      alert("Error updating score.");
    }
  };

  const handleOverridePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideTeamId || !overrideGameId) {
      alert("Please choose both a prediction team and a game/outcome.");
      return;
    }
    setIsSavingOverride(true);
    try {
      const response = await fetch("/api/admin/predictions/override", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": getAdminKey(),
        },
        body: JSON.stringify({
          teamId: overrideTeamId,
          gameId: overrideGameId,
          winnerId: overrideWinnerId || null,
          homeScore: overrideHomeScore === "" ? null : overrideHomeScore,
          awayScore: overrideAwayScore === "" ? null : overrideAwayScore,
        }),
      });
      if (response.ok) {
        alert(
          `Prediction override saved for ${overrideTeamId} on ${overrideGameId}. This bypasses the normal lock.`,
        );
        setOverrideWinnerId("");
        setOverrideHomeScore("");
        setOverrideAwayScore("");
        await onRefreshData();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to save prediction override.");
      }
    } catch (err) {
      alert("Error saving prediction override.");
    } finally {
      setIsSavingOverride(false);
    }
  };

  const getTeamName = (
    id: string | null,
    category: "world_cup" | "seczim_games",
    fallbackLabel?: string | null,
  ): string => {
    if (!id) return fallbackLabel || "Pending";
    if (category === "world_cup") {
      const t = WORLD_CUP_TEAMS.find((team) => team.id === id);
      return t ? `${t.flag} ${t.name}` : id;
    } else {
      const t = participatingTeams.find((team) => team.id === id);
      return t ? `${t.avatar} ${t.name}` : id;
    }
  };

  const filteredGames = games.filter((g) => {
    if (selectedCategory === "world_cup") {
      return g.category === "world_cup" && g.stage === selectedStage;
    } else {
      return g.category === "seczim_games";
    }
  });

  const stagesList: { id: Stage; label: string }[] = [
    { id: "R32", label: "R32" },
    { id: "R16", label: "R16" },
    { id: "QF", label: "QF" },
    { id: "SF", label: "SF" },
    { id: "Third", label: "3rd Place" },
    { id: "Final", label: "Final" },
  ];

  const handleToggleForm = (formType: string) => {
    setShowGameForm(formType === "game" ? !showGameForm : false);
    setShowTeamForm(formType === "team" ? !showTeamForm : false);
    setShowDirectPointsForm(
      formType === "points" ? !showDirectPointsForm : false,
    );
    setShowPointsConfigForm(
      formType === "config" ? !showPointsConfigForm : false,
    );
    setShowOverrideForm(formType === "override" ? !showOverrideForm : false);
    setShowPasswordForm(formType === "password" ? !showPasswordForm : false);
  };

  // Games available to pick in the override form: whatever category/stage
  // the admin currently has selected, so the dropdown matches what they're
  // already looking at below. World Cup also gets a virtual "Champion Pick"
  // entry since that's a special prediction slot, not a real game row.
  const overrideGameOptions = games
    .filter((g) =>
      selectedCategory === "world_cup"
        ? g.category === "world_cup"
        : g.category === "seczim_games",
    )
    .map((g) => ({
      id: g.id,
      label: `${g.id} — ${getTeamName(g.home_team_id, selectedCategory, g.home_team_label)} vs ${getTeamName(g.away_team_id, selectedCategory, g.away_team_label)}`,
    }));

  const selectedOverrideGame = games.find((g) => g.id === overrideGameId);
  const existingOverridePrediction =
    overrideTeamId && overrideGameId
      ? predictions[overrideTeamId]?.[overrideGameId]
      : undefined;
  const existingOverrideScore =
    overrideTeamId && overrideGameId
      ? scorePredictions[overrideTeamId]?.[overrideGameId]
      : undefined;

  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto bg-white border-4 border-brand-dark p-6 sm:p-8 space-y-6 text-center shadow-none">
        <div className="mx-auto w-16 h-16 bg-brand-gold-pale border-4 border-brand-dark flex items-center justify-center text-brand-dark">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-brand-dark">
            Settle / Admin Panel Locked
          </h2>
          <p className="text-xs text-brand-dark-muted mt-2">
            This module is restricted to SecZim Tournament Administrators to
            settle matches and manage prediction team profiles.
          </p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="ENTER ADMIN PASSWORD"
            className="w-full text-center bg-brand-gold-bg border-2 border-brand-dark py-3 font-mono text-base tracking-widest focus:outline-none focus:bg-white text-brand-dark"
          />
          {loginError && (
            <p className="text-xs text-rose-600 font-black uppercase">
              {loginError}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !adminPassword}
            className="w-full bg-brand-dark hover:bg-brand-gold hover:text-brand-dark text-white font-black uppercase tracking-widest py-3 border-2 border-brand-dark text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? "Authenticating..." : "Sign In as Admin"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="results-admin-section">
      <div className="bg-brand-dark text-white p-5 border-4 border-brand-dark flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 font-sans">
            <ShieldCheck className="text-brand-gold w-6 h-6 shrink-0" />
            SecZim Sports Admin Console
          </h2>
          <p className="text-brand-gold text-[10px] font-bold uppercase tracking-wider mt-1">
            Authorize bracket progression, adjust scoring rules, and record
            actual points
          </p>
        </div>
        <button
          onClick={handleAdminLogout}
          className="text-xs font-black bg-brand-dark-medium hover:bg-brand-gold hover:text-brand-dark text-white px-3 py-2 border-2 border-brand-dark-light rounded-none uppercase tracking-widest cursor-pointer transition-all"
        >
          Sign Out Admin
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border-2 border-brand-dark p-4 rounded-none space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-brand-dark-light">
            DATABASE CONSOLE CREATORS
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleToggleForm("game")}
              className="text-[10px] font-black bg-brand-dark text-white hover:bg-brand-gold hover:text-brand-dark px-3 py-2 border border-brand-dark rounded-none uppercase tracking-widest flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add New Custom Game
            </button>
            <button
              onClick={() => handleToggleForm("team")}
              className="text-[10px] font-black bg-brand-dark text-white hover:bg-brand-gold hover:text-brand-dark px-3 py-2 border border-brand-dark rounded-none uppercase tracking-widest flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Register Competitor Team
            </button>
            <button
              onClick={() => handleToggleForm("points")}
              className="text-[10px] font-black bg-brand-gold text-brand-dark hover:bg-brand-dark hover:text-white px-3 py-2 border border-brand-gold rounded-none uppercase tracking-widest flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Award Actual Points
            </button>
            <button
              onClick={() => handleToggleForm("config")}
              className="text-[10px] font-black bg-slate-200 text-brand-dark hover:bg-brand-dark hover:text-white px-3 py-2 border border-brand-dark rounded-none uppercase tracking-widest flex items-center gap-1 cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" /> Configure Scoring System
            </button>
            <button
              onClick={() => handleToggleForm("override")}
              className="text-[10px] font-black bg-rose-600 text-white hover:bg-brand-dark px-3 py-2 border border-rose-700 rounded-none uppercase tracking-widest flex items-center gap-1 cursor-pointer"
              title="Set or fix any team's prediction, even on games that are already locked"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Override Locked Prediction
            </button>
            <button
              onClick={() => handleToggleForm("password")}
              className="text-[10px] font-black bg-brand-dark-medium text-white hover:bg-brand-gold hover:text-brand-dark px-3 py-2 border border-brand-dark-medium rounded-none uppercase tracking-widest flex items-center gap-1 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Change Admin Password
            </button>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-brand-dark-muted block mb-1.5">
              ACTIVE CATEGORY TOGGLE:
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 border-2 border-brand-dark">
              <button
                onClick={() => setSelectedCategory("world_cup")}
                className={`py-1.5 text-xs font-black uppercase transition-all cursor-pointer ${
                  selectedCategory === "world_cup"
                    ? "bg-brand-dark text-white"
                    : "text-slate-500 hover:text-brand-dark"
                }`}
              >
                World Cup Bracket
              </button>
              <button
                onClick={() => setSelectedCategory("seczim_games")}
                className={`py-1.5 text-xs font-black uppercase transition-all cursor-pointer ${
                  selectedCategory === "seczim_games"
                    ? "bg-brand-dark text-white"
                    : "text-slate-500 hover:text-brand-dark"
                }`}
              >
                SecZim Sports Gala
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-brand-dark p-4 rounded-none space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-brand-dark-light flex items-center gap-1">
            <Calendar className="w-4 h-4 text-brand-gold" /> Official Lock Clock
          </h4>
          <p className="text-[10px] text-brand-dark-muted">
            Predictions close automatically when the current server UTC time
            reaches each match kickoff.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 bg-slate-50 border-2 border-brand-dark px-3 py-2 text-xs font-mono font-bold text-brand-dark">
              {new Date(currentTimeIso).toUTCString().replace("GMT", "UTC")}
            </div>
            <button
              type="button"
              onClick={onRefreshServerTime}
              className="text-[10px] font-black bg-brand-dark text-white hover:bg-brand-gold hover:text-brand-dark px-3 py-2 border border-brand-dark rounded-none uppercase tracking-widest cursor-pointer"
            >
              Refresh Time
            </button>
          </div>
        </div>
      </div>

      {showTeamForm && (
        <form
          onSubmit={handleAddTeam}
          className="bg-white border-4 border-brand-dark p-5 rounded-none space-y-4"
        >
          <h3 className="text-sm font-black uppercase tracking-wide text-brand-dark border-b border-slate-200 pb-2">
            Register Competing SecZim Team
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                Unique Team ID:
              </label>
              <input
                type="text"
                required
                placeholder="e.g. compliance"
                value={newTeamId}
                onChange={(e) => setNewTeamId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-brand-dark px-2.5 py-1.5 text-xs font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                Display Name:
              </label>
              <input
                type="text"
                required
                placeholder="Team Gold"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="w-full bg-slate-50 border-2 border-brand-dark px-2.5 py-1.5 text-xs font-black uppercase tracking-wide focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                Passcode PIN (4-digit):
              </label>
              <input
                type="text"
                required
                maxLength={4}
                placeholder="1234"
                value={newTeamPasscode}
                onChange={(e) =>
                  setNewTeamPasscode(e.target.value.replace(/\D/g, ""))
                }
                className="w-full bg-slate-50 border-2 border-brand-dark px-2.5 py-1.5 text-xs font-mono tracking-widest focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                  Avatar Badge:
                </label>
                <input
                  type="text"
                  required
                  placeholder="⚖️"
                  value={newTeamAvatar}
                  onChange={(e) => setNewTeamAvatar(e.target.value)}
                  className="w-full text-center bg-slate-50 border-2 border-brand-dark px-2 py-1 text-base focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                  Theme Color:
                </label>
                <input
                  type="color"
                  value={newTeamColor}
                  onChange={(e) => setNewTeamColor(e.target.value)}
                  className="w-full h-9 bg-slate-50 border-2 border-brand-dark p-0.5 cursor-pointer focus:outline-none"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowTeamForm(false)}
              className="text-xs font-black border-2 border-brand-dark px-4 py-2 hover:bg-slate-50 uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs font-black bg-brand-dark text-white px-4 py-2 hover:bg-brand-gold hover:text-brand-dark border-2 border-brand-dark uppercase tracking-wider"
            >
              Register Team
            </button>
          </div>
        </form>
      )}

      {showOverrideForm && (
        <div className="bg-white border-4 border-rose-600 p-5 rounded-none space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-rose-700 border-b border-slate-200 pb-2">
            Override Locked Prediction (Admin Only)
          </h3>
          <p className="text-[10px] text-brand-dark-muted font-bold uppercase tracking-wide">
            Use this to set or correct a prediction team's pick on a game that
            has already kicked off or finished. Normal team predictors cannot
            edit locked games — this form bypasses that lock.
          </p>

          <form
            onSubmit={handleOverridePrediction}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                Prediction Team:
              </label>
              <select
                required
                value={overrideTeamId}
                onChange={(e) => setOverrideTeamId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-brand-dark px-2 py-1.5 text-xs font-black uppercase focus:outline-none"
              >
                <option value="">-- Choose Team --</option>
                {participatingTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.avatar} {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                Game / Outcome (
                {selectedCategory === "world_cup"
                  ? "World Cup Bracket"
                  : "SecZim Games"}
                ):
              </label>
              <select
                required
                value={overrideGameId}
                onChange={(e) => {
                  setOverrideGameId(e.target.value);
                  setOverrideWinnerId("");
                  setOverrideHomeScore("");
                  setOverrideAwayScore("");
                }}
                className="w-full bg-slate-50 border-2 border-brand-dark px-2 py-1.5 text-xs font-mono focus:outline-none"
              >
                <option value="">-- Choose Game --</option>
                {selectedCategory === "world_cup" && (
                  <option value="Champion">Champion Pick (Final Winner)</option>
                )}
                {overrideGameOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
              <p className="text-[9px] text-brand-dark-muted mt-1">
                Tip: switch the category/stage tabs below to find other games —
                this list follows that filter.
              </p>
            </div>

            {overrideTeamId && overrideGameId && (
              <div className="sm:col-span-2 bg-slate-50 border border-slate-200 p-2 text-[10px] font-mono text-brand-dark-muted">
                Current saved pick:{" "}
                {existingOverridePrediction
                  ? getTeamName(existingOverridePrediction, selectedCategory)
                  : "None"}
                {existingOverrideScore &&
                  (existingOverrideScore.homeScore !== null ||
                    existingOverrideScore.awayScore !== null) &&
                  ` (${existingOverrideScore.homeScore ?? "-"} - ${existingOverrideScore.awayScore ?? "-"})`}
              </div>
            )}

            {overrideGameId &&
              overrideGameId !== "Champion" &&
              selectedOverrideGame && (
                <div className="sm:col-span-2 grid grid-cols-2 gap-1 text-[9px] font-black font-sans">
                  <button
                    type="button"
                    onClick={() =>
                      setOverrideWinnerId(
                        selectedOverrideGame.home_team_id || "",
                      )
                    }
                    disabled={!selectedOverrideGame.home_team_id}
                    className={`p-2 border uppercase disabled:opacity-40 ${overrideWinnerId === selectedOverrideGame.home_team_id ? "bg-brand-dark text-white border-brand-dark" : "bg-white border-slate-300"}`}
                  >
                    {getTeamName(
                      selectedOverrideGame.home_team_id,
                      selectedCategory,
                    )}{" "}
                    Win
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOverrideWinnerId(
                        selectedOverrideGame.away_team_id || "",
                      )
                    }
                    disabled={!selectedOverrideGame.away_team_id}
                    className={`p-2 border uppercase disabled:opacity-40 ${overrideWinnerId === selectedOverrideGame.away_team_id ? "bg-brand-dark text-white border-brand-dark" : "bg-white border-slate-300"}`}
                  >
                    {getTeamName(
                      selectedOverrideGame.away_team_id,
                      selectedCategory,
                    )}{" "}
                    Win
                  </button>
                </div>
              )}

            {overrideGameId === "Champion" && (
              <div className="sm:col-span-2">
                <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                  Predicted Champion Team ID (WORLD_CUP_TEAMS id):
                </label>
                <input
                  type="text"
                  placeholder="e.g. 37 for Argentina"
                  value={overrideWinnerId}
                  onChange={(e) => setOverrideWinnerId(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-brand-dark px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                />
              </div>
            )}

            {overrideGameId && overrideGameId !== "Champion" && (
              <div className="sm:col-span-2 flex gap-2 items-center">
                <label className="text-[9px] font-black uppercase text-brand-dark-light">
                  Optional Score Prediction:
                </label>
                <input
                  type="number"
                  placeholder="Home"
                  value={overrideHomeScore}
                  onChange={(e) => setOverrideHomeScore(e.target.value)}
                  className="w-16 bg-white border border-brand-dark p-1 text-center text-xs font-mono font-bold"
                />
                <span className="font-bold font-mono text-xs text-brand-dark-muted">
                  -
                </span>
                <input
                  type="number"
                  placeholder="Away"
                  value={overrideAwayScore}
                  onChange={(e) => setOverrideAwayScore(e.target.value)}
                  className="w-16 bg-white border border-brand-dark p-1 text-center text-xs font-mono font-bold"
                />
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowOverrideForm(false)}
                className="text-xs font-black border-2 border-brand-dark px-4 py-2 hover:bg-slate-50 uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingOverride}
                className="text-xs font-black bg-rose-600 text-white px-4 py-2 hover:bg-brand-dark border-2 border-rose-700 uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {isSavingOverride ? "Saving..." : "Save Override"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showPasswordForm && (
        <form
          onSubmit={handleChangePassword}
          className="bg-white border-4 border-brand-dark p-5 rounded-none space-y-4"
        >
          <h3 className="text-sm font-black uppercase tracking-wide text-brand-dark border-b border-slate-200 pb-2">
            Change Admin Password
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                Current Password:
              </label>
              <input
                type="password"
                required
                value={currentPasswordInput}
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
                className="w-full bg-slate-50 border-2 border-brand-dark px-2.5 py-1.5 text-xs font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                New Password:
              </label>
              <input
                type="password"
                required
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full bg-slate-50 border-2 border-brand-dark px-2.5 py-1.5 text-xs font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                Confirm New Password:
              </label>
              <input
                type="password"
                required
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                className="w-full bg-slate-50 border-2 border-brand-dark px-2.5 py-1.5 text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          {passwordChangeError && (
            <p className="text-xs text-rose-600 font-black uppercase">
              {passwordChangeError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm(false);
                setPasswordChangeError("");
                setCurrentPasswordInput("");
                setNewPasswordInput("");
                setConfirmPasswordInput("");
              }}
              className="text-xs font-black border-2 border-brand-dark px-4 py-2 hover:bg-slate-50 uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isChangingPassword}
              className="text-xs font-black bg-brand-dark-medium text-white px-4 py-2 hover:bg-brand-gold hover:text-brand-dark border-2 border-brand-dark-medium uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              {isChangingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      )}

      {showDirectPointsForm && (
        <div className="bg-white border-4 border-brand-dark p-5 rounded-none space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-brand-dark border-b border-slate-200 pb-2">
            Award Actual Points (Chess, Cards, Table Tennis, etc.)
          </h3>
          <form
            onSubmit={handleAwardDirectPoints}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                Select Team:
              </label>
              <select
                required
                value={newDirectPointsTeamId}
                onChange={(e) => setNewDirectPointsTeamId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-brand-dark px-2 py-1.5 text-xs font-black uppercase focus:outline-none"
              >
                <option value="">-- Choose Team --</option>
                {participatingTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.avatar} {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                Game / Competition Name:
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Chess Tournament"
                value={newDirectPointsGameName}
                onChange={(e) => setNewDirectPointsGameName(e.target.value)}
                className="w-full bg-slate-50 border-2 border-brand-dark px-2.5 py-1.5 text-xs font-black uppercase tracking-wide focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                Points to Award:
              </label>
              <input
                type="number"
                required
                min="1"
                max="1000"
                value={newDirectPointsPoints}
                onChange={(e) => setNewDirectPointsPoints(e.target.value)}
                className="w-full bg-slate-50 border-2 border-brand-dark px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full text-xs font-black bg-brand-gold hover:bg-brand-dark hover:text-white text-brand-dark px-4 py-2 border-2 border-brand-dark uppercase tracking-wider transition-all cursor-pointer"
              >
                Award Points
              </button>
            </div>
          </form>

          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-dark-light mb-2">
              Existing Actual Points Records ({directPoints.length})
            </h4>
            {directPoints.length === 0 ? (
              <p className="text-xs text-brand-dark-muted font-bold uppercase italic">
                No direct points awarded yet.
              </p>
            ) : (
              <div className="overflow-x-auto border-2 border-brand-dark max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-brand-dark text-white font-sans text-[10px] font-black uppercase tracking-widest border-b border-brand-dark">
                      <th className="p-2 border-r border-brand-dark-light">
                        Team
                      </th>
                      <th className="p-2 border-r border-brand-dark-light">
                        Game Name
                      </th>
                      <th className="p-2 border-r border-brand-dark-light">
                        Points
                      </th>
                      <th className="p-2 border-r border-brand-dark-light">
                        Awarded Date
                      </th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {directPoints.map((dp: any) => {
                      const team = participatingTeams.find(
                        (t) => t.id === dp.team_id,
                      );
                      const teamLabel = team
                        ? `${team.avatar} ${team.name}`
                        : dp.team_id;
                      return (
                        <tr
                          key={dp.id}
                          className="hover:bg-slate-50 text-brand-dark"
                        >
                          <td className="p-2 border-r border-slate-200 font-bold uppercase">
                            {teamLabel}
                          </td>
                          <td className="p-2 border-r border-slate-200 uppercase font-black">
                            {dp.game_name}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono font-black text-brand-gold bg-brand-gold-pale/30">
                            +{dp.points}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-[10px] font-mono">
                            {new Date(dp.date_awarded).toLocaleString()}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => handleDeleteDirectPoints(dp.id)}
                              className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                              title="Delete point record"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showGameForm && (
        <form
          onSubmit={handleAddCustomGame}
          className="bg-white border-4 border-brand-dark p-5 rounded-none space-y-4"
        >
          <h3 className="text-sm font-black uppercase tracking-wide text-brand-dark border-b border-slate-200 pb-2">
            Create Custom Match / Sports Event
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-sans">
            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                Game Unique ID:
              </label>
              <input
                type="text"
                required
                placeholder="e.g. seczim-5"
                value={newGameId}
                onChange={(e) => setNewGameId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-brand-dark px-2.5 py-1.5 font-mono"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                Sport / Stage Title:
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Soccer Quarterfinals"
                value={newGameStage}
                onChange={(e) => setNewGameStage(e.target.value)}
                className="w-full bg-slate-50 border-2 border-brand-dark px-2.5 py-1.5 font-black uppercase tracking-wider"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                Kickoff Time (Local/UTC):
              </label>
              <input
                type="datetime-local"
                required
                value={newGameKickoff.slice(0, 16)}
                onChange={(e) =>
                  setNewGameKickoff(new Date(e.target.value).toISOString())
                }
                className="w-full bg-slate-50 border-2 border-brand-dark px-2.5 py-1"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-brand-dark-light block mb-1">
                Select Category:
              </label>
              <select
                value={selectedCategory}
                onChange={(e: any) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border-2 border-brand-dark px-2.5 py-1.5 font-bold uppercase"
              >
                <option value="seczim_games">SecZim Corporate Games</option>
                <option value="world_cup">FIFA World Cup Bracket</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 border-2 border-brand-dark">
              <h5 className="text-[10px] font-black uppercase mb-2 text-brand-dark-light">
                COMPETITOR A (HOME):
              </h5>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="text-[8px] font-bold block mb-1">
                    Choose Team (For SecZim category):
                  </label>
                  <select
                    value={newGameHomeId}
                    onChange={(e) => setNewGameHomeId(e.target.value)}
                    className="w-full bg-white border border-brand-dark p-1 text-xs"
                  >
                    <option value="">-- CUSTOM / TBD LABEL --</option>
                    {participatingTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.avatar} {t.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[8px] font-bold block mb-1">
                    Custom Display Label (World Cup / Bracket node):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Winner Match 73"
                    value={newGameHomeLabel}
                    onChange={(e) => setNewGameHomeLabel(e.target.value)}
                    className="w-full bg-white border border-brand-dark p-1 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 border-2 border-brand-dark">
              <h5 className="text-[10px] font-black uppercase mb-2 text-brand-dark-light">
                COMPETITOR B (AWAY):
              </h5>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="text-[8px] font-bold block mb-1">
                    Choose Team (For SecZim category):
                  </label>
                  <select
                    value={newGameAwayId}
                    onChange={(e) => setNewGameAwayId(e.target.value)}
                    className="w-full bg-white border border-brand-dark p-1 text-xs"
                  >
                    <option value="">-- CUSTOM / TBD LABEL --</option>
                    {participatingTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.avatar} {t.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[8px] font-bold block mb-1">
                    Custom Display Label (World Cup / Bracket node):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Winner Match 74"
                    value={newGameAwayLabel}
                    onChange={(e) => setNewGameAwayLabel(e.target.value)}
                    className="w-full bg-white border border-brand-dark p-1 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowGameForm(false)}
              className="text-xs font-black border-2 border-brand-dark px-4 py-2 hover:bg-slate-50 uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs font-black bg-brand-dark text-white px-4 py-2 hover:bg-brand-gold hover:text-brand-dark border-2 border-brand-dark uppercase tracking-wider"
            >
              Save Custom Match
            </button>
          </div>
        </form>
      )}

      {showPointsConfigForm && (
        <form
          onSubmit={handleSavePointsConfig}
          className="bg-white border-4 border-brand-dark p-5 rounded-none space-y-4"
        >
          <h3 className="text-sm font-black uppercase tracking-wide text-brand-dark border-b border-slate-200 pb-2 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-brand-gold" /> Configure Global
            Scoring Points
          </h3>
          <p className="text-[10px] uppercase font-bold text-brand-dark-muted mb-2 tracking-widest">
            Adjust how many points are awarded per round dynamically. These
            changes apply immediately to the global leaderboard.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
            {CONFIG_STAGES.map((stage) => {
              const baseKey = stage as keyof PointsConfig;
              const oneExactKey =
                `${stage}_oneExactScore` as keyof PointsConfig;
              const exactScoreKey =
                `${stage}_exactScoreline` as keyof PointsConfig;

              return (
                <div
                  key={stage}
                  className="bg-slate-50 border-2 border-brand-dark p-3 space-y-3"
                >
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-dark bg-brand-gold px-2 py-1 inline-block">
                    {stage === "SecZim"
                      ? "SecZim Corporate Events"
                      : stage === "Third"
                        ? "World Cup: Third-place Playoff"
                      : `World Cup: ${stage}`}
                  </h4>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-white border border-brand-dark-border p-1.5">
                      <label className="text-[9px] font-bold uppercase text-brand-dark-light">
                        Correct Match Winner:
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={pointsConfig[baseKey] as number}
                        onChange={(e) =>
                          setPointsConfig({
                            ...pointsConfig,
                            [baseKey]: Number(e.target.value),
                          })
                        }
                        className="w-16 bg-slate-50 border border-brand-dark px-1.5 py-1 text-[10px] font-mono font-black focus:outline-none text-right"
                      />
                    </div>
                    <div className="flex justify-between items-center bg-emerald-50 border border-emerald-300 p-1.5">
                      <label className="text-[9px] font-bold uppercase text-emerald-800">
                        One Exact Score (+):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={pointsConfig[oneExactKey] as number}
                        onChange={(e) =>
                          setPointsConfig({
                            ...pointsConfig,
                            [oneExactKey]: Number(e.target.value),
                          })
                        }
                        className="w-16 bg-white border border-emerald-500 px-1.5 py-1 text-[10px] font-mono font-black focus:outline-none text-right text-emerald-900"
                      />
                    </div>
                    <div className="flex justify-between items-center bg-emerald-50 border border-emerald-300 p-1.5">
                      <label className="text-[9px] font-bold uppercase text-emerald-800">
                        Perfect Scoreline (+):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={pointsConfig[exactScoreKey] as number}
                        onChange={(e) =>
                          setPointsConfig({
                            ...pointsConfig,
                            [exactScoreKey]: Number(e.target.value),
                          })
                        }
                        className="w-16 bg-white border border-emerald-500 px-1.5 py-1 text-[10px] font-mono font-black focus:outline-none text-right text-emerald-900"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={() => setShowPointsConfigForm(false)}
              className="text-xs font-black border-2 border-brand-dark px-4 py-2 hover:bg-slate-50 uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs font-black bg-brand-dark text-white px-4 py-2 hover:bg-brand-gold hover:text-brand-dark border-2 border-brand-dark uppercase tracking-wider flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Global Configuration
            </button>
          </div>
        </form>
      )}

      {/* LIST COMPETING TEAMS (FOR DELETION / CREDENTIAL MONITORING) */}
      <div className="bg-white rounded-none p-4 sm:p-5 border-4 border-brand-dark">
        <h3 className="text-xs font-black uppercase tracking-widest text-brand-dark-light mb-3">
          REGISTERED PREDICTION TEAMS ({participatingTeams.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {participatingTeams.map((team) => (
            <div
              key={team.id}
              className="border-2 border-brand-dark p-3 bg-slate-50 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">{team.avatar}</span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black uppercase text-brand-dark truncate">
                      {team.name}
                    </h4>
                    <p className="text-[9px] font-mono font-black text-brand-gold uppercase mt-0.5">
                      PIN HIDDEN
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTeam(team.id)}
                  className="text-rose-600 hover:text-rose-800 p-1.5 transition-colors cursor-pointer border border-transparent hover:border-rose-300 bg-white shrink-0"
                  title="Delete team"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="NEW PIN"
                  value={teamPasscodeEdits[team.id] || ""}
                  onChange={(e) =>
                    setTeamPasscodeEdits((prev) => ({
                      ...prev,
                      [team.id]: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  className="min-w-0 flex-1 bg-white border-2 border-brand-dark px-2 py-1.5 text-xs font-mono tracking-widest focus:outline-none focus:border-brand-gold"
                />
                <button
                  type="button"
                  onClick={() => handleResetTeamPasscode(team.id)}
                  disabled={
                    savingPasscodeTeamId === team.id ||
                    !teamPasscodeEdits[team.id]
                  }
                  className="text-[9px] font-black bg-brand-dark text-white hover:bg-brand-gold hover:text-brand-dark px-2 py-1.5 border-2 border-brand-dark rounded-none uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {savingPasscodeTeamId === team.id ? "Saving" : "Reset"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN GAMES LIST AND MATCH SETTLEMENT ENGINE */}
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white border-2 border-brand-dark p-3 flex-wrap gap-2">
          <span className="text-xs font-black text-brand-dark uppercase tracking-widest">
            {selectedCategory === "world_cup"
              ? "WORLD CUP BRACKET MATCHNODES"
              : "SECZIM GAMES SETTLER LIST"}
          </span>

          {selectedCategory === "world_cup" && (
            <div className="flex bg-slate-100 p-0.5 border border-brand-dark gap-1">
              {stagesList.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStage(s.id)}
                  className={`px-3 py-1 text-[10px] font-black uppercase cursor-pointer ${
                    selectedStage === s.id
                      ? "bg-brand-dark text-white"
                      : "text-slate-500 hover:text-brand-dark"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredGames.length === 0 ? (
            <div className="bg-white border-2 border-brand-dark p-8 text-center text-xs font-bold text-slate-400">
              No matching sports events found in this category.
            </div>
          ) : (
            filteredGames.map((game) => {
              const isSettled = game.finished === "TRUE";
              const isEditing = editingGameId === game.id;
              const homeName = getTeamName(
                game.home_team_id,
                selectedCategory,
                game.home_team_label,
              );
              const awayName = getTeamName(
                game.away_team_id,
                selectedCategory,
                game.away_team_label,
              );
              const kickoffDate = new Date(game.kickoff);
              const hasKickedOff = kickoffDate <= new Date(currentTimeIso);

              return (
                <div
                  key={game.id}
                  className={`bg-white border-2 border-brand-dark rounded-none overflow-hidden flex flex-col justify-between ${isSettled ? "border-brand-gold-medium bg-slate-50/50" : ""}`}
                >
                  <div className="bg-brand-dark text-white px-3 py-1.5 flex justify-between items-center text-[10px] font-mono">
                    <span className="font-bold tracking-widest uppercase">
                      {game.id} - {game.stage}
                    </span>
                    <span className="text-brand-gold flex items-center gap-1">
                      {isSettled ? (
                        <span className="bg-brand-gold text-brand-dark font-sans text-[8px] font-black px-1.5 py-0.5">
                          OFFICIALLY SETTLED
                        </span>
                      ) : hasKickedOff ? (
                        <span className="bg-rose-500 text-white font-sans text-[8px] font-black px-1.5 py-0.5 animate-pulse">
                          LIVE / IN PLAY
                        </span>
                      ) : (
                        `KICKOFF: ${kickoffDate.toUTCString().replace("GMT", "UTC")}`
                      )}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-3 font-sans">
                        <span className="font-black text-xs uppercase text-brand-dark">
                          <Twemoji>
                            <span>{homeName}</span>
                          </Twemoji>
                        </span>
                        <span className="font-bold text-xs text-brand-dark-muted font-mono">
                          vs
                        </span>
                        <span className="font-black text-xs uppercase text-brand-dark">
                          <Twemoji>
                            <span>{awayName}</span>
                          </Twemoji>
                        </span>
                      </div>
                      {isSettled && (
                        <p className="text-xs font-mono font-black text-brand-gold">
                          OFFICIAL WINNER:{" "}
                          <Twemoji>
                            <span className="uppercase">
                              {getTeamName(game.winner_id, selectedCategory)}
                            </span>
                          </Twemoji>
                          {game.home_score !== null &&
                            ` (${game.home_score} - ${game.away_score})`}
                        </p>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="bg-brand-gold-bg border border-brand-gold p-3 rounded-none w-full sm:w-auto space-y-3">
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            placeholder="A Score"
                            value={tempHomeScore}
                            onChange={(e) => setTempHomeScore(e.target.value)}
                            className="w-16 bg-white border border-brand-dark p-1 text-center text-xs font-mono font-bold"
                          />
                          <span className="font-bold font-mono text-xs text-brand-dark-muted">
                            -
                          </span>
                          <input
                            type="number"
                            placeholder="B Score"
                            value={tempAwayScore}
                            onChange={(e) => setTempAwayScore(e.target.value)}
                            className="w-16 bg-white border border-brand-dark p-1 text-center text-xs font-mono font-bold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-brand-dark block">
                            CHOOSE WINNING OUTCOME:
                          </label>
                          <div className="grid grid-cols-2 gap-1 text-[9px] font-black font-sans">
                            <button
                              type="button"
                              onClick={() =>
                                setTempWinnerId(game.home_team_id || "")
                              }
                              className={`p-1 border uppercase ${tempWinnerId === game.home_team_id ? "bg-brand-dark text-white border-brand-dark" : "bg-white border-slate-300"}`}
                            >
                              Comp A Win
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setTempWinnerId(game.away_team_id || "")
                              }
                              className={`p-1 border uppercase ${tempWinnerId === game.away_team_id ? "bg-brand-dark text-white border-brand-dark" : "bg-white border-slate-300"}`}
                            >
                              Comp B Win
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingGameId(null)}
                            className="text-[9px] font-black border border-brand-dark bg-white px-2 py-1.5 uppercase tracking-wider cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveScore(game.id)}
                            className="text-[9px] font-black bg-emerald-600 text-white px-2 py-1.5 border border-brand-dark uppercase tracking-wider cursor-pointer"
                          >
                            Save Result
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 w-full sm:w-auto">
                        <button
                          onClick={() => {
                            setEditingGameId(game.id);
                            setTempHomeScore(
                              game.home_score !== null
                                ? String(game.home_score)
                                : "",
                            );
                            setTempAwayScore(
                              game.away_score !== null
                                ? String(game.away_score)
                                : "",
                            );
                            setTempWinnerId(game.winner_id || "");
                          }}
                          className="flex-1 sm:flex-initial text-[10px] font-black bg-brand-dark text-white hover:bg-brand-gold hover:text-brand-dark px-3 py-2 border border-brand-dark rounded-none uppercase tracking-widest cursor-pointer"
                        >
                          {isSettled ? "Edit Score" : "Settle Game Outcome"}
                        </button>
                        {game.id.startsWith("seczim-") && (
                          <button
                            onClick={() => handleDeleteGame(game.id)}
                            className="text-rose-600 hover:text-white hover:bg-rose-600 p-2 border border-rose-300 rounded-none transition-colors cursor-pointer"
                            title="Delete Game"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
