import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "seczim_games.db");
const db = new Database(dbPath);

// Enable WAL mode for performance
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS participating_teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    avatar TEXT NOT NULL,
    passcode TEXT NOT NULL,
    cumulative_history TEXT -- JSON string array
  );

  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL, -- 'world_cup' or 'seczim_games'
    stage TEXT NOT NULL,    -- 'R32', 'R16', 'QF', 'SF', 'Final', or custom stage names
    home_team_id TEXT,      -- Team ID
    away_team_id TEXT,
    home_team_label TEXT,   -- For bracket nodes (e.g. "Winner Match 73")
    away_team_label TEXT,
    home_score INTEGER,
    away_score INTEGER,
    home_penalty_score INTEGER,
    away_penalty_score INTEGER,
    winner_id TEXT,         -- Actual winner team ID
    kickoff TEXT,           -- Iso kickoff string
    finished TEXT DEFAULT 'FALSE' -- 'TRUE' or 'FALSE'
  );

  CREATE TABLE IF NOT EXISTS predictions (
    team_id TEXT,
    game_id TEXT,
    predicted_winner_id TEXT,
    predicted_home_score INTEGER,
    predicted_away_score INTEGER,
    PRIMARY KEY (team_id, game_id)
  );

  CREATE TABLE IF NOT EXISTS direct_points (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    game_name TEXT NOT NULL,
    points INTEGER NOT NULL,
    date_awarded TEXT NOT NULL
  );
`);

const predictionColumns = db
  .prepare("PRAGMA table_info(predictions)")
  .all() as { name: string }[];
const predictionColumnNames = new Set(
  predictionColumns.map((column) => column.name),
);

if (!predictionColumnNames.has("predicted_home_score")) {
  db.prepare(
    "ALTER TABLE predictions ADD COLUMN predicted_home_score INTEGER",
  ).run();
}

if (!predictionColumnNames.has("predicted_away_score")) {
  db.prepare(
    "ALTER TABLE predictions ADD COLUMN predicted_away_score INTEGER",
  ).run();
}

// Seed Default Settings
const hasAdminPass = db
  .prepare("SELECT 1 FROM settings WHERE key = ?")
  .get("admin_password");
if (!hasAdminPass) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
    "admin_password",
    "seczimadmin",
  );
}
const hasSimDate = db
  .prepare("SELECT 1 FROM settings WHERE key = ?")
  .get("simulated_date");
if (!hasSimDate) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
    "simulated_date",
    "2026-06-30T11:00:00Z",
  );
}
const hasActiveCategory = db
  .prepare("SELECT 1 FROM settings WHERE key = ?")
  .get("active_category");
if (!hasActiveCategory) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
    "active_category",
    "world_cup",
  );
}

// Seed Prediction Teams
const teamCount = db
  .prepare("SELECT COUNT(*) as count FROM participating_teams")
  .get() as { count: number };
if (teamCount.count === 0) {
  const defaultTeams = [
    {
      id: "compliance",
      name: "Team Gold",
      color: "#C09138", // Brand Gold
      avatar: "🟡",
      passcode: "1234",
      cumulative_history: JSON.stringify([
        { season: "2022", points: 340 },
        { season: "2024", points: 410 },
      ]),
    },
    {
      id: "supervision",
      name: "Team Onyx",
      color: "#161615", // Brand Dark
      avatar: "⚫",
      passcode: "5678",
      cumulative_history: JSON.stringify([
        { season: "2022", points: 390 },
        { season: "2024", points: 360 },
      ]),
    },
    {
      id: "legal",
      name: "Team Copper",
      color: "#C69E80", // Brand Gold Medium
      avatar: "🟤",
      passcode: "9012",
      cumulative_history: JSON.stringify([
        { season: "2022", points: 310 },
        { season: "2024", points: 440 },
      ]),
    },
    {
      id: "finance",
      name: "Team Slate",
      color: "#515151", // Charcoal Light
      avatar: "🔘",
      passcode: "3456",
      cumulative_history: JSON.stringify([
        { season: "2022", points: 420 },
        { season: "2024", points: 380 },
      ]),
    },
    {
      id: "executive",
      name: "Team Ivory",
      color: "#DFC598", // Brand Gold Soft
      avatar: "⚪",
      passcode: "1111",
      cumulative_history: JSON.stringify([
        { season: "2022", points: 450 },
        { season: "2024", points: 400 },
      ]),
    },
  ];

  const insertTeam = db.prepare(`
    INSERT INTO participating_teams (id, name, color, avatar, passcode, cumulative_history)
    VALUES (@id, @name, @color, @avatar, @passcode, @cumulative_history)
  `);

  defaultTeams.forEach((t) => insertTeam.run(t));
  console.log("Seeded SecZim prediction teams");
}

// Seed Games (FIFA World Cup 2026 Bracket & Custom SecZim Games)
const gameCount = db.prepare("SELECT COUNT(*) as count FROM games").get() as {
  count: number;
};
if (gameCount.count === 0) {
  // 1. Round of 32
  const INITIAL_R32_MATCHUPS: [string, string][] = [
    ["2", "5"], // R32-1: South Africa vs Canada
    ["17", "14"], // R32-2: Germany vs Paraguay
    ["21", "10"], // R32-3: Netherlands vs Morocco
    ["9", "22"], // R32-4: Brazil vs Japan
    ["33", "23"], // R32-5: France vs Sweden
    ["19", "36"], // R32-6: Ivory Coast vs Norway
    ["1", "20"], // R32-7: Mexico vs Ecuador
    ["45", "42"], // R32-8: England vs DR Congo
    ["13", "6"], // R32-9: USA vs Bosnia
    ["25", "34"], // R32-10: Belgium vs Senegal
    ["41", "46"], // R32-11: Portugal vs Croatia
    ["29", "39"], // R32-12: Spain vs Austria
    ["8", "38"], // R32-13: Switzerland vs Algeria
    ["37", "30"], // R32-14: Argentina vs Cape Verde
    ["44", "47"], // R32-15: Colombia vs Ghana
    ["15", "26"], // R32-16: Australia vs Egypt
  ];

  // NOTE: these are true UTC kickoff instants (local venue time converted
  // using each stadium's UTC offset), not the raw local kickoff time with a
  // "Z" appended. See STADIUM_ID_TO_UTC_OFFSET_HOURS in server.ts for the
  // per-stadium offsets used to derive these.
  const r32Kickoffs = [
    "2026-06-28T19:00:00Z",
    "2026-06-29T20:30:00Z",
    "2026-06-30T01:00:00Z",
    "2026-06-29T17:00:00Z",
    "2026-06-30T21:00:00Z",
    "2026-06-30T17:00:00Z",
    "2026-07-01T01:00:00Z",
    "2026-07-01T16:00:00Z",
    "2026-07-02T00:00:00Z",
    "2026-07-01T20:00:00Z",
    "2026-07-02T23:00:00Z",
    "2026-07-02T19:00:00Z",
    "2026-07-03T03:00:00Z",
    "2026-07-03T22:00:00Z",
    "2026-07-04T01:30:00Z",
    "2026-07-03T18:00:00Z",
  ];

  const insertGame = db.prepare(`
    INSERT INTO games (id, category, stage, home_team_id, away_team_id, home_team_label, away_team_label, kickoff, finished, winner_id)
    VALUES (@id, @category, @stage, @home_team_id, @away_team_id, @home_team_label, @away_team_label, @kickoff, @finished, @winner_id)
  `);

  INITIAL_R32_MATCHUPS.forEach(([home, away], index) => {
    insertGame.run({
      id: `R32-${index + 1}`,
      category: "world_cup",
      stage: "R32",
      home_team_id: home,
      away_team_id: away,
      home_team_label: null,
      away_team_label: null,
      kickoff: r32Kickoffs[index],
      finished: "FALSE",
      winner_id: null,
    });
  });

  // 2. Round of 16 (8 matches) — true UTC kickoff instants
  const r16Kickoffs = [
    "2026-07-04T21:00:00Z",
    "2026-07-04T17:00:00Z",
    "2026-07-05T20:00:00Z",
    "2026-07-06T00:00:00Z",
    "2026-07-06T19:00:00Z",
    "2026-07-07T00:00:00Z",
    "2026-07-07T16:00:00Z",
    "2026-07-07T20:00:00Z",
  ];
  const r16Labels = [
    ["Winner Match 74", "Winner Match 77"],
    ["Winner Match 73", "Winner Match 75"],
    ["Winner Match 76", "Winner Match 78"],
    ["Winner Match 79", "Winner Match 80"],
    ["Winner Match 83", "Winner Match 84"],
    ["Winner Match 81", "Winner Match 82"],
    ["Winner Match 86", "Winner Match 88"],
    ["Winner Match 85", "Winner Match 87"],
  ];
  for (let i = 0; i < 8; i++) {
    insertGame.run({
      id: `R16-${i + 1}`,
      category: "world_cup",
      stage: "R16",
      home_team_id: null,
      away_team_id: null,
      home_team_label: r16Labels[i][0],
      away_team_label: r16Labels[i][1],
      kickoff: r16Kickoffs[i],
      finished: "FALSE",
      winner_id: null,
    });
  }

  // 3. Quarter-finals (4 matches) — true UTC kickoff instants
  const qfKickoffs = [
    "2026-07-09T20:00:00Z",
    "2026-07-10T19:00:00Z",
    "2026-07-11T21:00:00Z",
    "2026-07-12T01:00:00Z",
  ];
  const qfLabels = [
    ["Winner Match 89", "Winner Match 90"],
    ["Winner Match 93", "Winner Match 94"],
    ["Winner Match 91", "Winner Match 92"],
    ["Winner Match 95", "Winner Match 96"],
  ];
  for (let i = 0; i < 4; i++) {
    insertGame.run({
      id: `QF-${i + 1}`,
      category: "world_cup",
      stage: "QF",
      home_team_id: null,
      away_team_id: null,
      home_team_label: qfLabels[i][0],
      away_team_label: qfLabels[i][1],
      kickoff: qfKickoffs[i],
      finished: "FALSE",
      winner_id: null,
    });
  }

  // 4. Semi-finals (2 matches) — true UTC kickoff instants
  const sfKickoffs = ["2026-07-14T19:00:00Z", "2026-07-15T19:00:00Z"];
  const sfLabels = [
    ["Winner Match 97", "Winner Match 98"],
    ["Winner Match 99", "Winner Match 100"],
  ];
  for (let i = 0; i < 2; i++) {
    insertGame.run({
      id: `SF-${i + 1}`,
      category: "world_cup",
      stage: "SF",
      home_team_id: null,
      away_team_id: null,
      home_team_label: sfLabels[i][0],
      away_team_label: sfLabels[i][1],
      kickoff: sfKickoffs[i],
      finished: "FALSE",
      winner_id: null,
    });
  }

  // 5. Final
  insertGame.run({
    id: "Final-1",
    category: "world_cup",
    stage: "Final",
    home_team_id: null,
    away_team_id: null,
    home_team_label: "Winner Match 101",
    away_team_label: "Winner Match 102",
    kickoff: "2026-07-19T19:00:00Z", // true UTC kickoff instant
    finished: "FALSE",
    winner_id: null,
  });

  // Seed standard preset outcomes for World Cup R32 from earlier API sync (for realism)
  const seedApiOutcomes: Record<string, string> = {
    "R32-1": "5", // Canada beat South Africa (Match 73)
    "R32-2": "14", // Paraguay beat Germany (Match 74)
    "R32-3": "10", // Morocco beat Netherlands (Match 75)
    "R32-4": "9", // Brazil beat Japan (Match 76)
  };

  Object.entries(seedApiOutcomes).forEach(([mId, winnerId]) => {
    db.prepare(
      "UPDATE games SET winner_id = ?, finished = 'TRUE' WHERE id = ?",
    ).run(winnerId, mId);
  });

  // Seed Custom SecZim Games
  const seczimGames = [
    {
      id: "seczim-1",
      category: "seczim_games",
      stage: "SecZim Cup Semi 1",
      home_team_id: "compliance",
      away_team_id: "supervision",
      home_team_label: "Team Gold",
      away_team_label: "Team Onyx",
      home_score: 3,
      away_score: 1,
      kickoff: "2026-06-29T14:00:00Z",
      finished: "TRUE",
      winner_id: "compliance",
    },
    {
      id: "seczim-2",
      category: "seczim_games",
      stage: "SecZim Cup Semi 2",
      home_team_id: "legal",
      away_team_id: "finance",
      home_team_label: "Team Copper",
      away_team_label: "Team Slate",
      home_score: 1,
      away_score: 2,
      kickoff: "2026-06-30T14:00:00Z",
      finished: "TRUE",
      winner_id: "finance",
    },
    {
      id: "seczim-3",
      category: "seczim_games",
      stage: "SecZim Football Championship",
      home_team_id: "compliance",
      away_team_id: "finance",
      home_team_label: "Team Gold",
      away_team_label: "Team Slate",
      home_score: null,
      away_score: null,
      kickoff: "2026-07-04T15:00:00Z",
      finished: "FALSE",
      winner_id: null,
    },
    {
      id: "seczim-4",
      category: "seczim_games",
      stage: "Volleyball Corporate Friendly",
      home_team_id: "legal",
      away_team_id: "executive",
      home_team_label: "Team Copper",
      away_team_label: "Team Ivory",
      home_score: null,
      away_score: null,
      kickoff: "2026-07-05T10:00:00Z",
      finished: "FALSE",
      winner_id: null,
    },
  ];

  seczimGames.forEach((g) => {
    insertGame.run({
      id: g.id,
      category: g.category,
      stage: g.stage,
      home_team_id: g.home_team_id,
      away_team_id: g.away_team_id,
      home_team_label: g.home_team_label,
      away_team_label: g.away_team_label,
      kickoff: g.kickoff,
      finished: g.finished,
      winner_id: g.winner_id,
    });
    if (g.finished === "TRUE") {
      db.prepare(
        "UPDATE games SET home_score = ?, away_score = ? WHERE id = ?",
      ).run(g.home_score, g.away_score, g.id);
    }
  });

  console.log("Seeded initial World Cup and SecZim corporate games");
}

export { db };
