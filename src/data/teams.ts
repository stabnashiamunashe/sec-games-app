import { Team, Match, Bracket, ParticipatingTeam } from "../types";

export const WORLD_CUP_TEAMS: Team[] = [
  { id: "1", name: "Mexico", flag: "🇲🇽", group: "A" },
  { id: "2", name: "South Africa", flag: "🇿🇦", group: "A" },
  { id: "3", name: "South Korea", flag: "🇰🇷", group: "A" },
  { id: "4", name: "Czech Republic", flag: "🇨🇿", group: "A" },
  { id: "5", name: "Canada", flag: "🇨🇦", group: "B" },
  { id: "6", name: "Bosnia and Herzegovina", flag: "🇧🇦", group: "B" },
  { id: "7", name: "Qatar", flag: "🇶🇦", group: "B" },
  { id: "8", name: "Switzerland", flag: "🇨🇭", group: "B" },
  { id: "9", name: "Brazil", flag: "🇧🇷", group: "C" },
  { id: "10", name: "Morocco", flag: "🇲🇦", group: "C" },
  { id: "11", name: "Haiti", flag: "🇭🇹", group: "C" },
  { id: "12", name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "C" },
  { id: "13", name: "USA", flag: "🇺🇸", group: "D" },
  { id: "14", name: "Paraguay", flag: "🇵🇾", group: "D" },
  { id: "15", name: "Australia", flag: "🇦🇺", group: "D" },
  { id: "16", name: "Turkey", flag: "🇹🇷", group: "D" },
  { id: "17", name: "Germany", flag: "🇩🇪", group: "E" },
  { id: "18", name: "Curaçao", flag: "🇨🇼", group: "E" },
  { id: "19", name: "Ivory Coast", flag: "🇨🇮", group: "E" },
  { id: "20", name: "Ecuador", flag: "🇪🇨", group: "E" },
  { id: "21", name: "Netherlands", flag: "🇳🇱", group: "F" },
  { id: "22", name: "Japan", flag: "🇯🇵", group: "F" },
  { id: "23", name: "Sweden", flag: "🇸🇪", group: "F" },
  { id: "24", name: "Tunisia", flag: "🇹🇳", group: "F" },
  { id: "25", name: "Belgium", flag: "🇧🇪", group: "G" },
  { id: "26", name: "Egypt", flag: "🇪🇬", group: "G" },
  { id: "27", name: "Iran", flag: "🇮🇷", group: "G" },
  { id: "28", name: "New Zealand", flag: "🇳🇿", group: "G" },
  { id: "29", name: "Spain", flag: "🇪🇸", group: "H" },
  { id: "30", name: "Cape Verde", flag: "🇨🇻", group: "H" },
  { id: "31", name: "Saudi Arabia", flag: "🇸🇦", group: "H" },
  { id: "32", name: "Uruguay", flag: "🇺🇾", group: "H" },
  { id: "33", name: "France", flag: "🇫🇷", group: "I" },
  { id: "34", name: "Senegal", flag: "🇸🇳", group: "I" },
  { id: "35", name: "Iraq", flag: "🇮🇶", group: "I" },
  { id: "36", name: "Norway", flag: "🇳🇴", group: "I" },
  { id: "37", name: "Argentina", flag: "🇦🇷", group: "J" },
  { id: "38", name: "Algeria", flag: "🇩🇿", group: "J" },
  { id: "39", name: "Austria", flag: "🇦🇹", group: "J" },
  { id: "40", name: "Jordan", flag: "🇯🇴", group: "J" },
  { id: "41", name: "Portugal", flag: "🇵🇹", group: "K" },
  { id: "42", name: "DR Congo", flag: "🇨🇩", group: "K" },
  { id: "43", name: "Uzbekistan", flag: "🇺🇿", group: "K" },
  { id: "44", name: "Colombia", flag: "🇨🇴", group: "K" },
  { id: "45", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "L" },
  { id: "46", name: "Croatia", flag: "🇭🇷", group: "L" },
  { id: "47", name: "Ghana", flag: "🇬🇭", group: "L" },
  { id: "48", name: "Panama", flag: "🇵🇦", group: "L" },
];

export const INITIAL_R32_MATCHUPS: [string, string][] = [
  ["2", "5"], // R32-1 (Match 73): South Africa vs Canada
  ["17", "14"], // R32-2 (Match 74): Germany vs Paraguay
  ["21", "10"], // R32-3 (Match 75): Netherlands vs Morocco
  ["9", "22"], // R32-4 (Match 76): Brazil vs Japan
  ["33", "23"], // R32-5 (Match 77): France vs Sweden
  ["19", "36"], // R32-6 (Match 78): Ivory Coast vs Norway
  ["1", "20"], // R32-7 (Match 79): Mexico vs Ecuador
  ["45", "42"], // R32-8 (Match 80): England vs DR Congo
  ["13", "6"], // R32-9 (Match 81): USA vs Bosnia and Herzegovina
  ["25", "34"], // R32-10 (Match 82): Belgium vs Senegal
  ["41", "46"], // R32-11 (Match 83): Portugal vs Croatia
  ["29", "39"], // R32-12 (Match 84): Spain vs Austria
  ["8", "38"], // R32-13 (Match 85): Switzerland vs Algeria
  ["37", "30"], // R32-14 (Match 86): Argentina vs Cape Verde
  ["44", "47"], // R32-15 (Match 87): Colombia vs Ghana
  ["15", "26"], // R32-16 (Match 88): Australia vs Egypt
];

export const FOUR_PARTICIPATING_TEAMS: ParticipatingTeam[] = [
  {
    id: "team_alpha",
    name: "Team Alpha",
    color: "#3B82F6", // Blue
    avatar: "🦁",
    cumulativeHistory: [
      { season: "2018", points: 340 },
      { season: "2022", points: 410 },
    ],
  },
  {
    id: "team_beta",
    name: "Team Beta",
    color: "#EF4444", // Red
    avatar: "🦅",
    cumulativeHistory: [
      { season: "2018", points: 390 },
      { season: "2022", points: 360 },
    ],
  },
  {
    id: "team_gamma",
    name: "Team Gamma",
    color: "#10B981", // Emerald
    avatar: "🐉",
    cumulativeHistory: [
      { season: "2018", points: 310 },
      { season: "2022", points: 440 },
    ],
  },
  {
    id: "team_delta",
    name: "Team Delta",
    color: "#F59E0B", // Amber
    avatar: "🐺",
    cumulativeHistory: [
      { season: "2018", points: 420 },
      { season: "2022", points: 380 },
    ],
  },
];

export function createInitialBracket(): Bracket {
  // 1. R32 Matches (June 28 - July 3, 2026)
  // NOTE: true UTC kickoff instants (local venue time converted using each
  // stadium's UTC offset), not the raw local kickoff time with "Z" appended.
  const r32Kickoffs = [
    "2026-06-28T19:00:00Z", // R32-1 (Match 73)
    "2026-06-29T20:30:00Z", // R32-2 (Match 74)
    "2026-06-30T01:00:00Z", // R32-3 (Match 75)
    "2026-06-29T17:00:00Z", // R32-4 (Match 76)
    "2026-06-30T21:00:00Z", // R32-5 (Match 77)
    "2026-06-30T17:00:00Z", // R32-6 (Match 78)
    "2026-07-01T01:00:00Z", // R32-7 (Match 79)
    "2026-07-01T16:00:00Z", // R32-8 (Match 80)
    "2026-07-02T00:00:00Z", // R32-9 (Match 81)
    "2026-07-01T20:00:00Z", // R32-10 (Match 82)
    "2026-07-02T23:00:00Z", // R32-11 (Match 83)
    "2026-07-02T19:00:00Z", // R32-12 (Match 84)
    "2026-07-03T03:00:00Z", // R32-13 (Match 85)
    "2026-07-03T22:00:00Z", // R32-14 (Match 86)
    "2026-07-04T01:30:00Z", // R32-15 (Match 87)
    "2026-07-03T18:00:00Z", // R32-16 (Match 88)
  ];

  const R32: Match[] = INITIAL_R32_MATCHUPS.map(([home, away], index) => {
    return {
      id: `R32-${index + 1}`,
      stage: "R32",
      homeTeamId: home,
      awayTeamId: away,
      winnerId: null,
      kickoff: r32Kickoffs[index],
    };
  });

  // 2. R16 Matches (July 4 - July 7, 2026) (8 matches) — true UTC kickoff instants
  const r16Kickoffs = [
    "2026-07-04T21:00:00Z", // R16-1 (Match 89)
    "2026-07-04T17:00:00Z", // R16-2 (Match 90)
    "2026-07-05T20:00:00Z", // R16-3 (Match 91)
    "2026-07-06T00:00:00Z", // R16-4 (Match 92)
    "2026-07-06T19:00:00Z", // R16-5 (Match 93)
    "2026-07-07T00:00:00Z", // R16-6 (Match 94)
    "2026-07-07T16:00:00Z", // R16-7 (Match 95)
    "2026-07-07T20:00:00Z", // R16-8 (Match 96)
  ];

  const R16_Labels = [
    ["Winner Match 74", "Winner Match 77"], // R16-1
    ["Winner Match 73", "Winner Match 75"], // R16-2
    ["Winner Match 76", "Winner Match 78"], // R16-3
    ["Winner Match 79", "Winner Match 80"], // R16-4
    ["Winner Match 83", "Winner Match 84"], // R16-5
    ["Winner Match 81", "Winner Match 82"], // R16-6
    ["Winner Match 86", "Winner Match 88"], // R16-7
    ["Winner Match 85", "Winner Match 87"], // R16-8
  ];

  const R16: Match[] = Array.from({ length: 8 }).map((_, index) => {
    return {
      id: `R16-${index + 1}`,
      stage: "R16",
      homeTeamId: null,
      awayTeamId: null,
      homeTeamLabel: R16_Labels[index][0],
      awayTeamLabel: R16_Labels[index][1],
      winnerId: null,
      kickoff: r16Kickoffs[index],
    };
  });

  // 3. QF Matches (July 9 - July 11, 2026) (4 matches) — true UTC kickoff instants
  const qfKickoffs = [
    "2026-07-09T20:00:00Z", // QF-1 (Match 97)
    "2026-07-10T19:00:00Z", // QF-2 (Match 98)
    "2026-07-11T21:00:00Z", // QF-3 (Match 99)
    "2026-07-12T01:00:00Z", // QF-4 (Match 100)
  ];

  const QF_Labels = [
    ["Winner Match 89", "Winner Match 90"], // QF-1
    ["Winner Match 93", "Winner Match 94"], // QF-2
    ["Winner Match 91", "Winner Match 92"], // QF-3
    ["Winner Match 95", "Winner Match 96"], // QF-4
  ];

  const QF: Match[] = Array.from({ length: 4 }).map((_, index) => {
    return {
      id: `QF-${index + 1}`,
      stage: "QF",
      homeTeamId: null,
      awayTeamId: null,
      homeTeamLabel: QF_Labels[index][0],
      awayTeamLabel: QF_Labels[index][1],
      winnerId: null,
      kickoff: qfKickoffs[index],
    };
  });

  // 4. SF Matches (July 14 - July 15, 2026) (2 matches) — true UTC kickoff instants
  const sfKickoffs = [
    "2026-07-14T19:00:00Z", // SF-1 (Match 101)
    "2026-07-15T19:00:00Z", // SF-2 (Match 102)
  ];

  const SF_Labels = [
    ["Winner Match 97", "Winner Match 98"], // SF-1
    ["Winner Match 99", "Winner Match 100"], // SF-2
  ];

  const SF: Match[] = Array.from({ length: 2 }).map((_, index) => {
    return {
      id: `SF-${index + 1}`,
      stage: "SF",
      homeTeamId: null,
      awayTeamId: null,
      homeTeamLabel: SF_Labels[index][0],
      awayTeamLabel: SF_Labels[index][1],
      winnerId: null,
      kickoff: sfKickoffs[index],
    };
  });

  // 5. Final Match (July 19, 2026)
  const Final: Match[] = [
    {
      id: "Final-1",
      stage: "Final",
      homeTeamId: null,
      awayTeamId: null,
      homeTeamLabel: "Winner Match 101",
      awayTeamLabel: "Winner Match 102",
      winnerId: null,
      kickoff: "2026-07-19T19:00:00Z", // true UTC kickoff instant
    },
  ];

  return {
    R32,
    R16,
    QF,
    SF,
    Final,
    ChampionId: null,
  };
}

/**
 * Given a bracket and predictions, propagate downstream matches.
 * Uses the exact tournament path of the FIFA 2026 bracket as represented in the API.
 */
export function propagateBracketWinners(
  bracket: Bracket,
  predictions: Record<string, string>,
  championId: string | null = null,
): Bracket {
  const newBracket = JSON.parse(JSON.stringify(bracket)) as Bracket;

  // 1. Populate R32 winners
  newBracket.R32.forEach((m) => {
    m.winnerId = predictions[m.id] || null;
  });

  // 2. R16 propagation: based on official bracket structure
  // R16-1: Winner R32-2 (index 1) vs Winner R32-5 (index 4)
  newBracket.R16[0].homeTeamId = newBracket.R32[1].winnerId;
  newBracket.R16[0].awayTeamId = newBracket.R32[4].winnerId;

  // R16-2: Winner R32-1 (index 0) vs Winner R32-3 (index 2)
  newBracket.R16[1].homeTeamId = newBracket.R32[0].winnerId;
  newBracket.R16[1].awayTeamId = newBracket.R32[2].winnerId;

  // R16-3: Winner R32-4 (index 3) vs Winner R32-6 (index 5)
  newBracket.R16[2].homeTeamId = newBracket.R32[3].winnerId;
  newBracket.R16[2].awayTeamId = newBracket.R32[5].winnerId;

  // R16-4: Winner R32-7 (index 6) vs Winner R32-8 (index 7)
  newBracket.R16[3].homeTeamId = newBracket.R32[6].winnerId;
  newBracket.R16[3].awayTeamId = newBracket.R32[7].winnerId;

  // R16-5: Winner R32-11 (index 10) vs Winner R32-12 (index 11)
  newBracket.R16[4].homeTeamId = newBracket.R32[10].winnerId;
  newBracket.R16[4].awayTeamId = newBracket.R32[11].winnerId;

  // R16-6: Winner R32-9 (index 8) vs Winner R32-10 (index 9)
  newBracket.R16[5].homeTeamId = newBracket.R32[8].winnerId;
  newBracket.R16[5].awayTeamId = newBracket.R32[9].winnerId;

  // R16-7: Winner R32-14 (index 13) vs Winner R32-16 (index 15)
  newBracket.R16[6].homeTeamId = newBracket.R32[13].winnerId;
  newBracket.R16[6].awayTeamId = newBracket.R32[15].winnerId;

  // R16-8: Winner R32-13 (index 12) vs Winner R32-15 (index 14)
  newBracket.R16[7].homeTeamId = newBracket.R32[12].winnerId;
  newBracket.R16[7].awayTeamId = newBracket.R32[14].winnerId;

  // Set R16 winners
  newBracket.R16.forEach((m) => {
    m.winnerId = predictions[m.id] || null;
  });

  // 3. QF propagation:
  // QF-1: Winner R16-1 vs Winner R16-2
  newBracket.QF[0].homeTeamId = newBracket.R16[0].winnerId;
  newBracket.QF[0].awayTeamId = newBracket.R16[1].winnerId;

  // QF-2: Winner R16-5 vs Winner R16-6
  newBracket.QF[1].homeTeamId = newBracket.R16[4].winnerId;
  newBracket.QF[1].awayTeamId = newBracket.R16[5].winnerId;

  // QF-3: Winner R16-3 vs Winner R16-4
  newBracket.QF[2].homeTeamId = newBracket.R16[2].winnerId;
  newBracket.QF[2].awayTeamId = newBracket.R16[3].winnerId;

  // QF-4: Winner R16-7 vs Winner R16-8
  newBracket.QF[3].homeTeamId = newBracket.R16[6].winnerId;
  newBracket.QF[3].awayTeamId = newBracket.R16[7].winnerId;

  // Set QF winners
  newBracket.QF.forEach((m) => {
    m.winnerId = predictions[m.id] || null;
  });

  // 4. SF propagation:
  // SF-1: Winner QF-1 vs Winner QF-2
  newBracket.SF[0].homeTeamId = newBracket.QF[0].winnerId;
  newBracket.SF[0].awayTeamId = newBracket.QF[1].winnerId;

  // SF-2: Winner QF-3 vs Winner QF-4
  newBracket.SF[1].homeTeamId = newBracket.QF[2].winnerId;
  newBracket.SF[1].awayTeamId = newBracket.QF[3].winnerId;

  // Set SF winners
  newBracket.SF.forEach((m) => {
    m.winnerId = predictions[m.id] || null;
  });

  // 5. Final propagation: Winner SF-1 vs Winner SF-2
  newBracket.Final[0].homeTeamId = newBracket.SF[0].winnerId;
  newBracket.Final[0].awayTeamId = newBracket.SF[1].winnerId;
  newBracket.Final[0].winnerId = predictions[newBracket.Final[0].id] || null;

  newBracket.ChampionId = championId || predictions["Champion"] || null;

  return newBracket;
}

/**
 * Given a bracket that already has its team pairings resolved from real,
 * synced match data (e.g. dynamicBaseBracket in BracketView.tsx), attach
 * each match's *predicted* winner without touching homeTeamId/awayTeamId.
 *
 * Use this anywhere you're rendering a person's predictions — the matchup
 * shown for every stage must always be the real teams that actually
 * qualified, never a hypothetical pairing built from someone's guess. Only
 * ResultsAdmin (working out the real bracket from admin-entered actual
 * results) should still use propagateBracketWinners() above.
 */
export function attachPredictedWinners(
  bracket: Bracket,
  predictions: Record<string, string>,
  championId: string | null = null,
): Bracket {
  const newBracket = JSON.parse(JSON.stringify(bracket)) as Bracket;

  const attach = (matches: Match[]) => {
    matches.forEach((m) => {
      m.winnerId = predictions[m.id] || null;
    });
  };

  attach(newBracket.R32);
  attach(newBracket.R16);
  attach(newBracket.QF);
  attach(newBracket.SF);
  attach(newBracket.Final);

  newBracket.ChampionId = championId || predictions["Champion"] || null;

  return newBracket;
}
