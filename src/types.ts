export interface Team {
  id: string;
  name: string;
  flag: string; // emoji or CSS styling
  group: string;
}

export type Stage = 'R32' | 'R16' | 'QF' | 'SF' | 'Final' | 'Champion';

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
  QF: Match[];  // 4 matches
  SF: Match[];  // 2 matches
  Final: Match[]; // 1 match
  ChampionId: string | null; // actual champion
}

export interface UserPrediction {
  teamId: string; // e.g. "Team Alpha"
  // predicted winners of each match ID
  // key is match ID, value is predicted winning team ID
  predictions: Record<string, string>; 
  championId: string | null;
}

export interface SeasonTotal {
  season: string; // e.g. "2022", "2024", "2026"
  points: number;
}

export interface ParticipatingTeam {
  id: string;
  name: string;
  color: string;
  avatar: string;
  cumulativeHistory: SeasonTotal[]; // previous seasons
  passcode?: string;
}
