import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Middleware
  app.use(express.json());

  const getServerTime = () => new Date();

  const isKickoffLocked = (kickoff?: string | null): boolean => {
    if (!kickoff) return false;
    const kickoffTime = new Date(kickoff);
    if (Number.isNaN(kickoffTime.getTime())) return false;
    return kickoffTime <= getServerTime();
  };

  const isFourDigitPin = (value: unknown): value is string => {
    return typeof value === 'string' && /^\d{4}$/.test(value);
  };

  // ----------------------------------------------------
  // API ENDPOINTS
  // ----------------------------------------------------

  // 1. Database status
  app.get('/api/status', (req, res) => {
    try {
      const teamCount = db.prepare('SELECT COUNT(*) as count FROM participating_teams').get() as { count: number };
      const gameCount = db.prepare('SELECT COUNT(*) as count FROM games').get() as { count: number };
      res.json({
        status: 'online',
        database: 'sqlite',
        teams: teamCount.count,
        games: gameCount.count,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Database connection issue', details: err.message });
    }
  });

  // 1b. Authoritative server time used for prediction locks
  app.get('/api/time', (req, res) => {
    const now = getServerTime();
    res.json({
      now: now.toISOString(),
      timezone: 'UTC'
    });
  });

  // 2. Fetch Settings
  app.get('/api/settings', (req, res) => {
    try {
      const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
      const settings: Record<string, string> = {};
      rows.forEach(r => {
        if (r.key !== 'admin_password') {
          settings[r.key] = r.value;
        }
      });
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Update simulated date
  app.post('/api/settings/simulated-date', (req, res) => {
    const { simulated_date } = req.body;
    if (!simulated_date) {
      return res.status(400).json({ error: 'simulated_date is required' });
    }
    try {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('simulated_date', simulated_date);
      res.json({ success: true, simulated_date });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Update active tournament category
  app.post('/api/settings/category', (req, res) => {
    const { active_category } = req.body;
    if (!active_category) {
      return res.status(400).json({ error: 'active_category is required' });
    }
    try {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('active_category', active_category);
      res.json({ success: true, active_category });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Fetch Prediction Teams (with scores calculated dynamically on the server or fetched)
  app.get('/api/teams', (req, res) => {
    try {
      const teams = db.prepare('SELECT id, name, color, avatar, cumulative_history FROM participating_teams').all() as any[];
      const sanitizedTeams = teams.map(t => ({
        ...t,
        cumulativeHistory: JSON.parse(t.cumulative_history || '[]')
      }));
      res.json(sanitizedTeams);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Authenticate Prediction Team Login
  app.post('/api/teams/login', (req, res) => {
    const { teamId, passcode } = req.body;
    if (!teamId || !passcode) {
      return res.status(400).json({ error: 'teamId and passcode are required' });
    }
    try {
      const team = db.prepare('SELECT * FROM participating_teams WHERE id = ?').get(teamId) as any;
      if (!team) {
        return res.status(404).json({ success: false, message: 'Prediction team not found' });
      }
      if (team.passcode === passcode) {
        res.json({
          success: true,
          team: {
            id: team.id,
            name: team.name,
            color: team.color,
            avatar: team.avatar,
            cumulativeHistory: JSON.parse(team.cumulative_history || '[]')
          }
        });
      } else {
        res.json({ success: false, message: 'Incorrect team passcode PIN' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6b. Authenticated team passcode change
  app.post('/api/teams/passcode', (req, res) => {
    const { teamId, currentPasscode, newPasscode } = req.body;
    if (!teamId || !currentPasscode || !newPasscode) {
      return res.status(400).json({ error: 'teamId, currentPasscode, and newPasscode are required' });
    }
    if (!isFourDigitPin(newPasscode)) {
      return res.status(400).json({ error: 'New passcode must be exactly 4 digits' });
    }

    try {
      const team = db.prepare('SELECT passcode FROM participating_teams WHERE id = ?').get(teamId) as any;
      if (!team) {
        return res.status(404).json({ error: 'Prediction team not found' });
      }
      if (team.passcode !== currentPasscode) {
        return res.status(401).json({ error: 'Current passcode is incorrect' });
      }

      db.prepare('UPDATE participating_teams SET passcode = ? WHERE id = ?').run(newPasscode, teamId);
      res.json({ success: true, message: 'Passcode updated successfully. Please sign in again with the new PIN.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Admin Login
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_password') as any;
      if (row && row.value === password) {
        res.json({ success: true });
      } else {
        res.json({ success: false, message: 'Incorrect administrator password' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Fetch all Games (or by category)
  app.get('/api/games', (req, res) => {
    const { category } = req.query;
    try {
      let games;
      if (category) {
        games = db.prepare('SELECT * FROM games WHERE category = ? ORDER BY kickoff ASC').all(category) as any[];
      } else {
        games = db.prepare('SELECT * FROM games ORDER BY kickoff ASC').all() as any[];
      }
      res.json(games);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Fetch all Predictions (flattened for easy use in leaderboard)
  app.get('/api/predictions', (req, res) => {
    try {
      const rows = db.prepare('SELECT team_id, game_id, predicted_winner_id FROM predictions').all() as any[];
      const predictionsMap: Record<string, Record<string, string>> = {};
      rows.forEach(r => {
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
  app.get('/api/predictions/:teamId', (req, res) => {
    const { teamId } = req.params;
    try {
      const rows = db.prepare('SELECT game_id, predicted_winner_id FROM predictions WHERE team_id = ?').all(teamId) as any[];
      const predictions: Record<string, string> = {};
      rows.forEach(r => {
        predictions[r.game_id] = r.predicted_winner_id;
      });
      res.json({ teamId, predictions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Save Predictions (Locked by authentication)
  app.post('/api/predictions', (req, res) => {
    const { teamId, passcode, predictions, championId } = req.body;
    if (!teamId || !passcode || !predictions) {
      return res.status(400).json({ error: 'teamId, passcode, and predictions are required' });
    }

    try {
      // Validate passcode
      const team = db.prepare('SELECT passcode FROM participating_teams WHERE id = ?').get(teamId) as any;
      if (!team || team.passcode !== passcode) {
        return res.status(401).json({ error: 'Unauthorized: Invalid passcode PIN for team' });
      }

      const submittedPredictions = {
        ...predictions,
        ...(championId ? { Champion: championId } : {})
      } as Record<string, string>;

      const gameRows = db.prepare('SELECT id, kickoff FROM games').all() as { id: string; kickoff: string | null }[];
      const gamesById = new Map(gameRows.map((game) => [game.id, game]));
      const invalidGameIds = Object.keys(submittedPredictions).filter((gameId) => gameId !== 'Champion' && !gamesById.has(gameId));
      if (invalidGameIds.length > 0) {
        return res.status(400).json({ error: `Unknown game IDs: ${invalidGameIds.join(', ')}` });
      }

      const existingRows = db.prepare('SELECT game_id, predicted_winner_id FROM predictions WHERE team_id = ?').all(teamId) as any[];
      const existingPredictions: Record<string, string> = {};
      existingRows.forEach((row) => {
        existingPredictions[row.game_id] = row.predicted_winner_id;
      });

      const lockedChanges = Object.entries(submittedPredictions).filter(([gameId, winnerId]) => {
        const lockSource = gameId === 'Champion' ? gamesById.get('Final-1') : gamesById.get(gameId);
        if (!lockSource || !isKickoffLocked(lockSource.kickoff)) return false;
        return (winnerId || '') !== (existingPredictions[gameId] || '');
      });

      if (lockedChanges.length > 0) {
        const lockedIds = lockedChanges.map(([gameId]) => gameId).join(', ');
        return res.status(409).json({
          error: `Predictions are closed for games already in play: ${lockedIds}`
        });
      }

      // Start transaction
      const insertPred = db.prepare(`
        INSERT OR REPLACE INTO predictions (team_id, game_id, predicted_winner_id)
        VALUES (?, ?, ?)
      `);

      const deletePred = db.prepare('DELETE FROM predictions WHERE team_id = ? AND game_id = ?');

      const runInTransaction = db.transaction((preds: Record<string, string>) => {
        Object.entries(preds).forEach(([gameId, winnerId]) => {
          if (winnerId) {
            insertPred.run(teamId, gameId, winnerId);
          } else {
            deletePred.run(teamId, gameId);
          }
        });

        if (championId) {
          insertPred.run(teamId, 'Champion', championId);
        }
      });

      runInTransaction(predictions);
      res.json({ success: true, message: 'Predictions updated successfully!' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // ADMIN PANEL OPERATIONS (Secured by admin password)
  // ----------------------------------------------------

  const verifyAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const adminPassword = req.headers['x-admin-password'];
    if (!adminPassword) {
      return res.status(401).json({ error: 'Missing admin password header' });
    }
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_password') as any;
    if (row && row.value === adminPassword) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: Incorrect administrator password' });
    }
  };

  // 12. Update game details or score
  app.post('/api/admin/games/score', verifyAdmin, (req, res) => {
    const { gameId, home_score, away_score, winner_id, finished } = req.body;
    if (!gameId) return res.status(400).json({ error: 'gameId is required' });

    try {
      db.prepare(`
        UPDATE games
        SET home_score = ?, away_score = ?, winner_id = ?, finished = ?
        WHERE id = ?
      `).run(
        home_score !== undefined && home_score !== null ? parseInt(home_score) : null,
        away_score !== undefined && away_score !== null ? parseInt(away_score) : null,
        winner_id || null,
        finished || 'FALSE',
        gameId
      );

      res.json({ success: true, message: `Game ${gameId} score updated successfully.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 13. Create a custom game
  app.post('/api/admin/games/add', verifyAdmin, (req, res) => {
    const { id, category, stage, home_team_id, away_team_id, home_team_label, away_team_label, kickoff } = req.body;
    if (!id || !category || !stage) {
      return res.status(400).json({ error: 'id, category, and stage are required' });
    }

    try {
      db.prepare(`
        INSERT OR REPLACE INTO games (id, category, stage, home_team_id, away_team_id, home_team_label, away_team_label, kickoff, finished, winner_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'FALSE', NULL)
      `).run(
        id,
        category,
        stage,
        home_team_id || null,
        away_team_id || null,
        home_team_label || null,
        away_team_label || null,
        kickoff || new Date().toISOString()
      );
      res.json({ success: true, message: 'Game created/updated successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 14. Delete a game
  app.post('/api/admin/games/delete', verifyAdmin, (req, res) => {
    const { gameId } = req.body;
    if (!gameId) return res.status(400).json({ error: 'gameId is required' });

    try {
      db.prepare('DELETE FROM games WHERE id = ?').run(gameId);
      db.prepare('DELETE FROM predictions WHERE game_id = ?').run(gameId);
      res.json({ success: true, message: 'Game deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 15. Create or Edit a prediction team
  app.post('/api/admin/teams/save', verifyAdmin, (req, res) => {
    const { id, name, color, avatar, passcode, cumulativeHistory } = req.body;
    if (!id || !name || !color || !avatar || !passcode) {
      return res.status(400).json({ error: 'Missing team fields' });
    }

    try {
      const historyStr = JSON.stringify(cumulativeHistory || []);
      db.prepare(`
        INSERT OR REPLACE INTO participating_teams (id, name, color, avatar, passcode, cumulative_history)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, name, color, avatar, passcode, historyStr);
      res.json({ success: true, message: `Prediction team ${name} saved successfully.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 15b. Reset a prediction team's passcode from the admin panel
  app.post('/api/admin/teams/passcode', verifyAdmin, (req, res) => {
    const { teamId, newPasscode } = req.body;
    if (!teamId || !newPasscode) {
      return res.status(400).json({ error: 'teamId and newPasscode are required' });
    }
    if (!isFourDigitPin(newPasscode)) {
      return res.status(400).json({ error: 'New passcode must be exactly 4 digits' });
    }

    try {
      const team = db.prepare('SELECT id FROM participating_teams WHERE id = ?').get(teamId) as any;
      if (!team) {
        return res.status(404).json({ error: 'Prediction team not found' });
      }

      db.prepare('UPDATE participating_teams SET passcode = ? WHERE id = ?').run(newPasscode, teamId);
      res.json({ success: true, message: 'Team passcode reset successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 16. Delete a prediction team
  app.post('/api/admin/teams/delete', verifyAdmin, (req, res) => {
    const { teamId } = req.body;
    if (!teamId) return res.status(400).json({ error: 'teamId is required' });

    try {
      db.prepare('DELETE FROM participating_teams WHERE id = ?').run(teamId);
      db.prepare('DELETE FROM predictions WHERE team_id = ?').run(teamId);
      res.json({ success: true, message: 'Prediction team and their predictions deleted.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 16b. Fetch direct points (Non-prediction actual games like Chess, Card Games, etc.)
  app.get('/api/direct-points', (req, res) => {
    try {
      const rows = db.prepare('SELECT id, team_id, game_name, points, date_awarded FROM direct_points ORDER BY date_awarded DESC').all() as any[];
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 16c. Add direct points award (Admin restricted)
  app.post('/api/admin/direct-points/add', verifyAdmin, (req, res) => {
    const { team_id, game_name, points } = req.body;
    if (!team_id || !game_name || points === undefined || points === null) {
      return res.status(400).json({ error: 'team_id, game_name, and points are required' });
    }

    try {
      const id = 'dp-' + Date.now();
      const date_awarded = new Date().toISOString();
      db.prepare(`
        INSERT INTO direct_points (id, team_id, game_name, points, date_awarded)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, team_id, game_name, parseInt(points), date_awarded);

      res.json({ success: true, message: `Awarded ${points} points to ${team_id} for ${game_name}.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 16d. Delete direct points award (Admin restricted)
  app.post('/api/admin/direct-points/delete', verifyAdmin, (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });

    try {
      db.prepare('DELETE FROM direct_points WHERE id = ?').run(id);
      res.json({ success: true, message: 'Direct points entry deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 17. World Cup Live Sync Proxy
  app.get('/api/worldcup-live-sync', async (req, res) => {
    try {
      const response = await fetch('https://worldcup26.ir/get/games');
      if (!response.ok) {
        throw new Error('API server returned error status');
      }
      const data: any = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: 'Failed to proxy world cup games API', details: err.message });
    }
  });

  // ----------------------------------------------------
  // VITE OR STATIC ASSETS
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
