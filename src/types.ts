export interface Team {
  id: string;
  name: string;
  flag: string; // emoji or CSS styling
  group: string;
}

export type Stage = "R32" | "R16" | "QF" | "SF" | "Final" | "Champion";

export interface Match {
  id: string; // e.g. "R32-1"
  stage: Stage;
  homeTeamId: string | null; // null if waiting for previous round
  awayTeamId: string | null;
  homeTeamLabel?: string; // e.g. "Winner R32-1"
  awayTeamLabel?: string;
  winnerId: string | null; // actual winner of the match
  kickoff?: string; // ISO string representing match start time
}

export interface Bracket {
  // Matches for each stage
  R32: Match[]; // 16 matches
  R16: Match[]; // 8 matches
  QF: Match[]; // 4 matches
  SF: Match[]; // 2 matches
  Final: Match[]; // 1 match
  ChampionId: string | null; // actual champion
}

export interface UserPrediction {
  teamId: string; // e.g. "Team Alpha"
  predictions: Record<string, string>;
  championId: string | null;
}

export interface ScorePrediction {
  homeScore: number | null;
  awayScore: number | null;
}

export interface SeasonTotal {
  season: string; // e.g. "2022", "2024", "2026"
  points: number;
}

export interface ParticipatingTeam {
  id: string;
  name: string;
  avatar: string;
  cumulativeHistory: SeasonTotal[]; // previous seasons
  passcode?: string;
}

// Admin-adjustable scoring configuration by round
export interface PointsConfig {
  R32: number;
  R16: number;
  QF: number;
  SF: number;
  Final: number;
  SecZim: number;

  R32_oneExactScore: number;
  R32_exactScoreline: number;

  R16_oneExactScore: number;
  R16_exactScoreline: number;

  QF_oneExactScore: number;
  QF_exactScoreline: number;

  SF_oneExactScore: number;
  SF_exactScoreline: number;

  Final_oneExactScore: number;
  Final_exactScoreline: number;

  SecZim_oneExactScore: number;
  SecZim_exactScoreline: number;
}
