import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./server/db";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Middleware
  app.use(express.json());

  const getServerTime = () => new Date();

  const getComparableTimestamp = (
    value?: string | Date | null,
  ): number | null => {
    if (!value) return null;
    const parsedTime = value instanceof Date ? value : new Date(value);
    const timestamp = parsedTime.getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  };

  const isKickoffLocked = (
    kickoff?: string | null,
    now: Date | string | null = getServerTime(),
  ): boolean => {
    const kickoffTime = getComparableTimestamp(kickoff);
    const referenceTime = getComparableTimestamp(now);
    if (kickoffTime === null || referenceTime === null) return false;
    return kickoffTime <= referenceTime;
  };

  const shouldLockPrediction = (
    finished: string | null | undefined,
    kickoff?: string | null,
    now: Date | string | null = getServerTime(),
  ): boolean => {
    // A finished game is always locked, regardless of kickoff time.
    if (finished === "TRUE") return true;
    return isKickoffLocked(kickoff, now);
  };

  const STADIUM_ID_TO_IANA: Record<string, string> = {
    "1": "America/Mexico_City",
    "2": "America/Mexico_City",
    "3": "America/Monterrey",
    "4": "America/Chicago",
    "5": "America/Chicago",
    "6": "America/Chicago",
    "7": "America/New_York",
    "8": "America/New_York",
    "9": "America/New_York",
    "10": "America/New_York",
    "11": "America/New_York",
    "12": "America/Toronto",
    "13": "America/Vancouver",
    "14": "America/Los_Angeles",
    "15": "America/Los_Angeles",
    "16": "America/Los_Angeles",
  };

  const STADIUM_ID_TO_UTC_OFFSET_HOURS: Record<string, number> = {
    "1": -6, // Estadio Azteca, Mexico City — fixed UTC-6, no DST since 2023
    "2": -6, // Estadio Akron, Guadalajara — fixed UTC-6
    "3": -6, // Estadio BBVA, Monterrey — fixed UTC-6
    "4": -5, // AT&T Stadium, Dallas — US Central, CDT (DST active in Jun/Jul)
    "5": -5, // NRG Stadium, Houston — CDT
    "6": -5, // Arrowhead Stadium, Kansas City — CDT
    "7": -4, // Mercedes-Benz Stadium, Atlanta — EDT
    "8": -4, // Hard Rock Stadium, Miami — EDT
    "9": -4, // Gillette Stadium, Boston — EDT
    "10": -4, // Lincoln Financial Field, Philadelphia — EDT
    "11": -4, // MetLife Stadium, NY/NJ — EDT
    "12": -4, // BMO Field, Toronto — EDT
    "13": -7, // BC Place, Vancouver — PDT
    "14": -7, // Lumen Field, Seattle — PDT
    "15": -7, // Levi's Stadium, SF Bay Area — PDT
    "16": -7, // SoFi Stadium, Los Angeles — PDT
  };

  const parseLocalDateToUtcIso = (
    localDate?: string | null,
    stadiumId?: string | null,
  ): string | null => {
    if (!localDate || !stadiumId) return null;

    const [datePart, timePart] = localDate.trim().split(" ");
    if (!datePart || !timePart) return null;

    const [month, day, year] = datePart.split("/").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);
    if (
      [month, day, year, hour, minute].some(
        (value) => Number.isNaN(value) || value === undefined,
      )
    ) {
      return null;
    }

    const offsetHours = STADIUM_ID_TO_UTC_OFFSET_HOURS[String(stadiumId)] ?? 0;
    const utcTimestamp = Date.UTC(
      year,
      month - 1,
      day,
      hour - offsetHours,
      minute,
      0,
      0,
    );
    return new Date(utcTimestamp).toISOString();
  };

  const isFourDigitPin = (value: unknown): value is string => {
    return typeof value === "string" && /^\d{4}$/.test(value);
  };

  type ScoreFields = {
    homeScore: number | null;
    awayScore: number | null;
  };

  type ExistingPrediction = ScoreFields & {
    winnerId: string;
  };

  const hasOwn = (object: Record<string, unknown>, key: string) =>
    Object.prototype.hasOwnProperty.call(object, key);

  const normalizeWinnerId = (value: unknown): string => {
    if (value === undefined || value === null) return "";
    return String(value);
  };

  const parseOptionalScore = (
    value: unknown,
    label: string,
  ): { value: number | null; error?: string } => {
    if (value === undefined || value === null) return { value: null };
    if (typeof value === "string" && value.trim() === "")
      return { value: null };

    const numericValue = typeof value === "number" ? value : Number(value);
    if (
      !Number.isInteger(numericValue) ||
      numericValue < 0 ||
      numericValue > 99
    ) {
      return {
        value: null,
        error: `${label} must be a whole number between 0 and 99`,
      };
    }

    return { value: numericValue };
  };

  const normalizeScorePrediction = (
    gameId: string,
    rawScore: unknown,
  ): { score: ScoreFields; error?: string } => {
    if (!rawScore || typeof rawScore !== "object" || Array.isArray(rawScore)) {
      return {
        score: { homeScore: null, awayScore: null },
        error: `${gameId} score prediction must include homeScore and awayScore`,
      };
    }

    const rawScoreObject = rawScore as Record<string, unknown>;
    const rawHomeScore = hasOwn(rawScoreObject, "homeScore")
      ? rawScoreObject.homeScore
      : rawScoreObject.home_score;
    const rawAwayScore = hasOwn(rawScoreObject, "awayScore")
      ? rawScoreObject.awayScore
      : rawScoreObject.away_score;
    const homeScore = parseOptionalScore(rawHomeScore, `${gameId} home score`);
    const awayScore = parseOptionalScore(rawAwayScore, `${gameId} away score`);

    if (homeScore.error) {
      return {
        score: { homeScore: null, awayScore: null },
        error: homeScore.error,
      };
    }
    if (awayScore.error) {
      return {
        score: { homeScore: null, awayScore: null },
        error: awayScore.error,
      };
    }

    return {
      score: {
        homeScore: homeScore.value,
        awayScore: awayScore.value,
      },
    };
  };

  // ----------------------------------------------------
  // API ENDPOINTS
  // ----------------------------------------------------

  // 1. Database status
  app.get("/api/status", (req, res) => {
    try {
      const teamCount = db
        .prepare("SELECT COUNT(*) as count FROM participating_teams")
        .get() as { count: number };
      const gameCount = db
        .prepare("SELECT COUNT(*) as count FROM games")
        .get() as { count: number };
      res.json({
        status: "online",
        database: "sqlite",
        teams: teamCount.count,
        games: gameCount.count,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res
        .status(500)
        .json({ error: "Database connection issue", details: err.message });
    }
  });

  // 1b. Authoritative server time used for prediction locks
  app.get("/api/time", (req, res) => {
    const now = getServerTime();
    console.log("[API TIME] now=", now.toISOString(), "timezone=UTC");
    res.json({
      now: now.toISOString(),
      timezone: "UTC",
    });
  });

  // 2. Fetch Settings
  app.get("/api/settings", (req, res) => {
    try {
      const rows = db.prepare("SELECT key, value FROM settings").all() as {
        key: string;
        value: string;
      }[];
      const settings: Record<string, string> = {};
      rows.forEach((r) => {
        if (r.key !== "admin_password") {
          settings[r.key] = r.value;
        }
      });
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Update simulated date
  app.post("/api/settings/simulated-date", (req, res) => {
    const { simulated_date } = req.body;
    if (!simulated_date) {
      return res.status(400).json({ error: "simulated_date is required" });
    }
    try {
      db.prepare(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      ).run("simulated_date", simulated_date);
      res.json({ success: true, simulated_date });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Update active tournament category
  app.post("/api/settings/category", (req, res) => {
    const { active_category } = req.body;
    if (!active_category) {
      return res.status(400).json({ error: "active_category is required" });
    }
    try {
      db.prepare(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      ).run("active_category", active_category);
      res.json({ success: true, active_category });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Fetch Prediction Teams (with scores calculated dynamically on the server or fetched)
  app.get("/api/teams", (req, res) => {
    try {
      const teams = db
        .prepare(
          "SELECT id, name, color, avatar, cumulative_history FROM participating_teams",
        )
        .all() as any[];
      const sanitizedTeams = teams.map((t) => ({
        ...t,
        cumulativeHistory: JSON.parse(t.cumulative_history || "[]"),
      }));
      res.json(sanitizedTeams);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Authenticate Prediction Team Login
  app.post("/api/teams/login", (req, res) => {
    const { teamId, passcode } = req.body;
    if (!teamId || !passcode) {
      return res
        .status(400)
        .json({ error: "teamId and passcode are required" });
    }
    try {
      const team = db
        .prepare("SELECT * FROM participating_teams WHERE id = ?")
        .get(teamId) as any;
      if (!team) {
        return res
          .status(404)
          .json({ success: false, message: "Prediction team not found" });
      }
      if (team.passcode === passcode) {
        res.json({
          success: true,
          team: {
            id: team.id,
            name: team.name,
            color: team.color,
            avatar: team.avatar,
            cumulativeHistory: JSON.parse(team.cumulative_history || "[]"),
          },
        });
      } else {
        res.json({ success: false, message: "Incorrect team passcode PIN" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6b. Authenticated team passcode change
  app.post("/api/teams/passcode", (req, res) => {
    const { teamId, currentPasscode, newPasscode } = req.body;
    if (!teamId || !currentPasscode || !newPasscode) {
      return res.status(400).json({
        error: "teamId, currentPasscode, and newPasscode are required",
      });
    }
    if (!isFourDigitPin(newPasscode)) {
      return res
        .status(400)
        .json({ error: "New passcode must be exactly 4 digits" });
    }

    try {
      const team = db
        .prepare("SELECT passcode FROM participating_teams WHERE id = ?")
        .get(teamId) as any;
      if (!team) {
        return res.status(404).json({ error: "Prediction team not found" });
      }
      if (team.passcode !== currentPasscode) {
        return res.status(401).json({ error: "Current passcode is incorrect" });
      }

      db.prepare(
        "UPDATE participating_teams SET passcode = ? WHERE id = ?",
      ).run(newPasscode, teamId);
      res.json({
        success: true,
        message:
          "Passcode updated successfully. Please sign in again with the new PIN.",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Admin Login
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    try {
      const row = db
        .prepare("SELECT value FROM settings WHERE key = ?")
        .get("admin_password") as any;
      if (row && row.value === password) {
        res.json({ success: true });
      } else {
        res.json({
          success: false,
          message: "Incorrect administrator password",
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Fetch all Games (or by category)
  app.get("/api/games", (req, res) => {
    const { category } = req.query;
    try {
      let games;
      if (category) {
        games = db
          .prepare(
            "SELECT * FROM games WHERE category = ? ORDER BY kickoff ASC",
          )
          .all(category) as any[];
      } else {
        games = db
          .prepare("SELECT * FROM games ORDER BY kickoff ASC")
          .all() as any[];
      }
      res.json(games);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Fetch all Predictions (flattened for easy use in leaderboard)
  app.get("/api/predictions", (req, res) => {
    try {
      const rows = db
        .prepare(
          "SELECT team_id, game_id, predicted_winner_id FROM predictions",
        )
        .all() as any[];
      const predictionsMap: Record<string, Record<string, string>> = {};
      rows.forEach((r) => {
        if (!r.predicted_winner_id) return;
        if (!predictionsMap[r.team_id]) {
          predictionsMap[r.team_id] = {};
        }
        predictionsMap[r.team_id][r.game_id] = r.predicted_winner_id;
      });
      res.json(predictionsMap);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Fetch Single Team predictions
  app.get("/api/predictions/:teamId", (req, res) => {
    const { teamId } = req.params;
    try {
      const rows = db
        .prepare(
          "SELECT game_id, predicted_winner_id FROM predictions WHERE team_id = ?",
        )
        .all(teamId) as any[];
      const predictions: Record<string, string> = {};
      rows.forEach((r) => {
        if (!r.predicted_winner_id) return;
        predictions[r.game_id] = r.predicted_winner_id;
      });
      res.json({ teamId, predictions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10b. Fetch all score predictions separately from winner picks
  app.get("/api/score-predictions", (req, res) => {
    try {
      const rows = db
        .prepare(
          `
        SELECT team_id, game_id, predicted_home_score, predicted_away_score
        FROM predictions
        WHERE game_id != 'Champion'
      `,
        )
        .all() as any[];
      const scorePredictionsMap: Record<
        string,
        Record<string, ScoreFields>
      > = {};
      rows.forEach((r) => {
        const homeScore =
          r.predicted_home_score === null ||
          r.predicted_home_score === undefined
            ? null
            : Number(r.predicted_home_score);
        const awayScore =
          r.predicted_away_score === null ||
          r.predicted_away_score === undefined
            ? null
            : Number(r.predicted_away_score);
        if (homeScore === null && awayScore === null) return;
        if (!scorePredictionsMap[r.team_id]) {
          scorePredictionsMap[r.team_id] = {};
        }
        scorePredictionsMap[r.team_id][r.game_id] = { homeScore, awayScore };
      });
      res.json(scorePredictionsMap);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10c. Fetch a single team's score predictions
  app.get("/api/score-predictions/:teamId", (req, res) => {
    const { teamId } = req.params;
    try {
      const rows = db
        .prepare(
          `
        SELECT game_id, predicted_home_score, predicted_away_score
        FROM predictions
        WHERE team_id = ? AND game_id != 'Champion'
      `,
        )
        .all(teamId) as any[];
      const scorePredictions: Record<string, ScoreFields> = {};
      rows.forEach((r) => {
        const homeScore =
          r.predicted_home_score === null ||
          r.predicted_home_score === undefined
            ? null
            : Number(r.predicted_home_score);
        const awayScore =
          r.predicted_away_score === null ||
          r.predicted_away_score === undefined
            ? null
            : Number(r.predicted_away_score);
        if (homeScore === null && awayScore === null) return;
        scorePredictions[r.game_id] = { homeScore, awayScore };
      });
      res.json({ teamId, scorePredictions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Save Predictions (Locked by authentication)
  app.post("/api/predictions", (req, res) => {
    const {
      teamId,
      passcode,
      predictions = {},
      championId,
      scorePredictions = {},
    } = req.body;
    if (!teamId || !passcode) {
      return res
        .status(400)
        .json({ error: "teamId and passcode are required" });
    }
    if (
      !predictions ||
      typeof predictions !== "object" ||
      Array.isArray(predictions)
    ) {
      return res.status(400).json({ error: "predictions must be an object" });
    }
    if (
      !scorePredictions ||
      typeof scorePredictions !== "object" ||
      Array.isArray(scorePredictions)
    ) {
      return res
        .status(400)
        .json({ error: "scorePredictions must be an object" });
    }

    try {
      // Validate passcode
      const team = db
        .prepare("SELECT passcode FROM participating_teams WHERE id = ?")
        .get(teamId) as any;
      if (!team || team.passcode !== passcode) {
        return res
          .status(401)
          .json({ error: "Unauthorized: Invalid passcode PIN for team" });
      }

      const submittedPredictions = {
        ...predictions,
        ...(championId ? { Champion: championId } : {}),
      } as Record<string, unknown>;
      const submittedScorePredictionsRaw = scorePredictions as Record<
        string,
        unknown
      >;
      const normalizedScorePredictions: Record<string, ScoreFields> = {};

      for (const [gameId, rawScore] of Object.entries(
        submittedScorePredictionsRaw,
      )) {
        if (gameId === "Champion") continue;

        const normalizedScore = normalizeScorePrediction(gameId, rawScore);
        if (normalizedScore.error) {
          return res.status(400).json({ error: normalizedScore.error });
        }
        normalizedScorePredictions[gameId] = normalizedScore.score;
      }

      const gameRows = db
        .prepare("SELECT id, kickoff, finished FROM games")
        .all() as {
        id: string;
        kickoff: string | null;
        finished: string | null;
      }[];
      const gamesById = new Map(gameRows.map((game) => [game.id, game]));
      const submittedGameIds = new Set([
        ...Object.keys(submittedPredictions).filter(
          (gameId) => gameId !== "Champion",
        ),
        ...Object.keys(normalizedScorePredictions),
      ]);
      const invalidGameIds = [...submittedGameIds].filter(
        (gameId) => !gamesById.has(gameId),
      );
      if (invalidGameIds.length > 0) {
        return res
          .status(400)
          .json({ error: `Unknown game IDs: ${invalidGameIds.join(", ")}` });
      }

      const existingRows = db
        .prepare(
          `
        SELECT game_id, predicted_winner_id, predicted_home_score, predicted_away_score
        FROM predictions
        WHERE team_id = ?
      `,
        )
        .all(teamId) as any[];
      const existingPredictions: Record<string, ExistingPrediction> = {};
      existingRows.forEach((row) => {
        existingPredictions[row.game_id] = {
          winnerId: row.predicted_winner_id || "",
          homeScore:
            row.predicted_home_score === null ||
            row.predicted_home_score === undefined
              ? null
              : Number(row.predicted_home_score),
          awayScore:
            row.predicted_away_score === null ||
            row.predicted_away_score === undefined
              ? null
              : Number(row.predicted_away_score),
        };
      });

      const changedGameIds = new Set([
        ...Object.keys(submittedPredictions),
        ...Object.keys(normalizedScorePredictions),
      ]);
      const lockedChanges = [...changedGameIds].filter((gameId) => {
        const lockSource =
          gameId === "Champion"
            ? gamesById.get("Final-1")
            : gamesById.get(gameId);
        if (
          !lockSource ||
          !shouldLockPrediction(lockSource.finished, lockSource.kickoff)
        )
          return false;

        const existing = existingPredictions[gameId] || {
          winnerId: "",
          homeScore: null,
          awayScore: null,
        };
        const winnerId = hasOwn(submittedPredictions, gameId)
          ? normalizeWinnerId(submittedPredictions[gameId])
          : existing.winnerId;
        const score = hasOwn(normalizedScorePredictions, gameId)
          ? normalizedScorePredictions[gameId]
          : {
              homeScore: existing.homeScore,
              awayScore: existing.awayScore,
            };

        return (
          winnerId !== existing.winnerId ||
          score.homeScore !== existing.homeScore ||
          score.awayScore !== existing.awayScore
        );
      });

      if (lockedChanges.length > 0) {
        const lockedIds = lockedChanges.join(", ");
        return res.status(409).json({
          error: `Predictions are closed for games already in play: ${lockedIds}`,
        });
      }

      // Start transaction
      const insertPred = db.prepare(`
        INSERT OR REPLACE INTO predictions (
          team_id,
          game_id,
          predicted_winner_id,
          predicted_home_score,
          predicted_away_score
        )
        VALUES (?, ?, ?, ?, ?)
      `);

      const deletePred = db.prepare(
        "DELETE FROM predictions WHERE team_id = ? AND game_id = ?",
      );

      const runInTransaction = db.transaction(
        (
          winnerPreds: Record<string, unknown>,
          scorePreds: Record<string, ScoreFields>,
        ) => {
          const predictionKeys = new Set([
            ...Object.keys(winnerPreds),
            ...Object.keys(scorePreds),
          ]);

          predictionKeys.forEach((gameId) => {
            const existing = existingPredictions[gameId] || {
              winnerId: "",
              homeScore: null,
              awayScore: null,
            };
            const winnerId = hasOwn(winnerPreds, gameId)
              ? normalizeWinnerId(winnerPreds[gameId])
              : existing.winnerId;

            if (gameId === "Champion") {
              if (winnerId) {
                insertPred.run(teamId, gameId, winnerId, null, null);
              } else {
                deletePred.run(teamId, gameId);
              }
              return;
            }

            const score = hasOwn(scorePreds, gameId)
              ? scorePreds[gameId]
              : {
                  homeScore: existing.homeScore,
                  awayScore: existing.awayScore,
                };

            if (
              winnerId ||
              score.homeScore !== null ||
              score.awayScore !== null
            ) {
              insertPred.run(
                teamId,
                gameId,
                winnerId || null,
                score.homeScore,
                score.awayScore,
              );
            } else {
              deletePred.run(teamId, gameId);
            }
          });
        },
      );

      runInTransaction(submittedPredictions, normalizedScorePredictions);
      res.json({ success: true, message: "Predictions updated successfully!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // ADMIN PANEL OPERATIONS (Secured by admin password)
  // ----------------------------------------------------

  const verifyAdmin = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const adminPassword = req.headers["x-admin-password"];
    if (!adminPassword) {
      return res.status(401).json({ error: "Missing admin password header" });
    }
    const row = db
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get("admin_password") as any;
    if (row && row.value === adminPassword) {
      next();
    } else {
      res
        .status(403)
        .json({ error: "Forbidden: Incorrect administrator password" });
    }
  };

  // 12. Update game details or score
  app.post("/api/admin/games/score", verifyAdmin, (req, res) => {
    const { gameId, home_score, away_score, winner_id, finished } = req.body;
    if (!gameId) return res.status(400).json({ error: "gameId is required" });

    try {
      db.prepare(
        `
        UPDATE games
        SET home_score = ?, away_score = ?, winner_id = ?, finished = ?
        WHERE id = ?
      `,
      ).run(
        home_score !== undefined && home_score !== null
          ? parseInt(home_score)
          : null,
        away_score !== undefined && away_score !== null
          ? parseInt(away_score)
          : null,
        winner_id || null,
        finished || "FALSE",
        gameId,
      );

      res.json({
        success: true,
        message: `Game ${gameId} score updated successfully.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 13. Create a custom game
  app.post("/api/admin/games/add", verifyAdmin, (req, res) => {
    const {
      id,
      category,
      stage,
      home_team_id,
      away_team_id,
      home_team_label,
      away_team_label,
      kickoff,
    } = req.body;
    if (!id || !category || !stage) {
      return res
        .status(400)
        .json({ error: "id, category, and stage are required" });
    }

    try {
      db.prepare(
        `
        INSERT OR REPLACE INTO games (id, category, stage, home_team_id, away_team_id, home_team_label, away_team_label, kickoff, finished, winner_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'FALSE', NULL)
      `,
      ).run(
        id,
        category,
        stage,
        home_team_id || null,
        away_team_id || null,
        home_team_label || null,
        away_team_label || null,
        kickoff || new Date().toISOString(),
      );
      res.json({ success: true, message: "Game created/updated successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 14. Delete a game
  app.post("/api/admin/games/delete", verifyAdmin, (req, res) => {
    const { gameId } = req.body;
    if (!gameId) return res.status(400).json({ error: "gameId is required" });

    try {
      db.prepare("DELETE FROM games WHERE id = ?").run(gameId);
      db.prepare("DELETE FROM predictions WHERE game_id = ?").run(gameId);
      res.json({ success: true, message: "Game deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 15. Create or Edit a prediction team
  app.post("/api/admin/teams/save", verifyAdmin, (req, res) => {
    const { id, name, color, avatar, passcode, cumulativeHistory } = req.body;
    if (!id || !name || !color || !avatar || !passcode) {
      return res.status(400).json({ error: "Missing team fields" });
    }

    try {
      const historyStr = JSON.stringify(cumulativeHistory || []);
      db.prepare(
        `
        INSERT OR REPLACE INTO participating_teams (id, name, color, avatar, passcode, cumulative_history)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      ).run(id, name, color, avatar, passcode, historyStr);
      res.json({
        success: true,
        message: `Prediction team ${name} saved successfully.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 15b. Reset a prediction team's passcode from the admin panel
  app.post("/api/admin/teams/passcode", verifyAdmin, (req, res) => {
    const { teamId, newPasscode } = req.body;
    if (!teamId || !newPasscode) {
      return res
        .status(400)
        .json({ error: "teamId and newPasscode are required" });
    }
    if (!isFourDigitPin(newPasscode)) {
      return res
        .status(400)
        .json({ error: "New passcode must be exactly 4 digits" });
    }

    try {
      const team = db
        .prepare("SELECT id FROM participating_teams WHERE id = ?")
        .get(teamId) as any;
      if (!team) {
        return res.status(404).json({ error: "Prediction team not found" });
      }

      db.prepare(
        "UPDATE participating_teams SET passcode = ? WHERE id = ?",
      ).run(newPasscode, teamId);
      res.json({ success: true, message: "Team passcode reset successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 16. Delete a prediction team
  app.post("/api/admin/teams/delete", verifyAdmin, (req, res) => {
    const { teamId } = req.body;
    if (!teamId) return res.status(400).json({ error: "teamId is required" });

    try {
      db.prepare("DELETE FROM participating_teams WHERE id = ?").run(teamId);
      db.prepare("DELETE FROM predictions WHERE team_id = ?").run(teamId);
      res.json({
        success: true,
        message: "Prediction team and their predictions deleted.",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 16b. Fetch direct points (Non-prediction actual games like Chess, Card Games, etc.)
  app.get("/api/direct-points", (req, res) => {
    try {
      const rows = db
        .prepare(
          "SELECT id, team_id, game_name, points, date_awarded FROM direct_points ORDER BY date_awarded DESC",
        )
        .all() as any[];
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 16c. Add direct points award (Admin restricted)
  app.post("/api/admin/direct-points/add", verifyAdmin, (req, res) => {
    const { team_id, game_name, points } = req.body;
    if (!team_id || !game_name || points === undefined || points === null) {
      return res
        .status(400)
        .json({ error: "team_id, game_name, and points are required" });
    }

    try {
      const id = "dp-" + Date.now();
      const date_awarded = new Date().toISOString();
      db.prepare(
        `
        INSERT INTO direct_points (id, team_id, game_name, points, date_awarded)
        VALUES (?, ?, ?, ?, ?)
      `,
      ).run(id, team_id, game_name, parseInt(points), date_awarded);

      res.json({
        success: true,
        message: `Awarded ${points} points to ${team_id} for ${game_name}.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 16d. Delete direct points award (Admin restricted)
  app.post("/api/admin/direct-points/delete", verifyAdmin, (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });

    try {
      db.prepare("DELETE FROM direct_points WHERE id = ?").run(id);
      res.json({
        success: true,
        message: "Direct points entry deleted successfully.",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 17. World Cup Live Sync Proxy
  app.get("/api/worldcup-live-sync", async (req, res) => {
    try {
      const response = await fetch("https://worldcup26.ir/get/games");
      if (!response.ok) {
        throw new Error("API server returned error status");
      }
      const data: any = await response.json();
      const enrichedGames = Array.isArray(data.games)
        ? data.games.map((game: any) => {
            const kickoffUtc = parseLocalDateToUtcIso(
              game.local_date,
              game.stadium_id,
            );
            return {
              ...game,
              stadium_timezone:
                STADIUM_ID_TO_IANA[String(game.stadium_id)] || null,
              kickoff_utc: kickoffUtc,
            };
          })
        : [];

      console.log("[WORLD CUP LIVE SYNC] Fetched data:", {
        gameCount: enrichedGames.length,
      });
      res.json({ ...data, games: enrichedGames });
    } catch (err: any) {
      res.status(502).json({
        error: "Failed to proxy world cup games API",
        details: err.message,
      });
    }
  });

  // ----------------------------------------------------
  // VITE OR STATIC ASSETS
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
