import type { PointsConfig, ScorePrediction } from "../types";

export interface ScoreBreakdown {
  R32: number;
  R16: number;
  QF: number;
  SF: number;
  Third: number;
  Final: number;
  SecZim: number;
  ScoreBonus: number;
  total: number;
}

export const DEFAULT_POINTS_CONFIG: PointsConfig = {
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
};

const toOptionalScore = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const toOptionalPositiveNumber = (value: unknown): number | null => {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? numericValue
    : null;
};

export function normalizePointsConfig(
  overrides?: Partial<Record<keyof PointsConfig, unknown>> | null,
): PointsConfig {
  if (!overrides) return { ...DEFAULT_POINTS_CONFIG };

  const merged = { ...DEFAULT_POINTS_CONFIG };
  (Object.keys(DEFAULT_POINTS_CONFIG) as (keyof PointsConfig)[]).forEach(
    (key) => {
      const parsed = toOptionalPositiveNumber(overrides[key]);
      if (parsed !== null) {
        merged[key] = parsed;
      }
    },
  );
  return merged;
}

export function calculateUserScore(
  userPredictions: Record<string, string>,
  actualResults: Record<string, string>,
  games: any[] = [],
  scorePredictions: Record<string, ScorePrediction> = {},
  pointsConfig: PointsConfig = DEFAULT_POINTS_CONFIG,
): ScoreBreakdown {
  const points = normalizePointsConfig(pointsConfig);

  const breakdown: ScoreBreakdown = {
    R32: 0,
    R16: 0,
    QF: 0,
    SF: 0,
    Third: 0,
    Final: 0,
    SecZim: 0,
    ScoreBonus: 0,
    total: 0,
  };

  if (!games || games.length === 0) {
    // Fallback logic
    for (let i = 1; i <= 16; i++) {
      const mId = `R32-${i}`;
      if (actualResults[mId] && userPredictions[mId] === actualResults[mId]) {
        breakdown.R32 += points.R32;
      }
    }
    for (let i = 1; i <= 8; i++) {
      const mId = `R16-${i}`;
      if (actualResults[mId] && userPredictions[mId] === actualResults[mId]) {
        breakdown.R16 += points.R16;
      }
    }
    for (let i = 1; i <= 4; i++) {
      const mId = `QF-${i}`;
      if (actualResults[mId] && userPredictions[mId] === actualResults[mId]) {
        breakdown.QF += points.QF;
      }
    }
    for (let i = 1; i <= 2; i++) {
      const mId = `SF-${i}`;
      if (actualResults[mId] && userPredictions[mId] === actualResults[mId]) {
        breakdown.SF += points.SF;
      }
    }
    if (
      actualResults["Third-1"] &&
      userPredictions["Third-1"] === actualResults["Third-1"]
    ) {
      breakdown.Third += points.Third;
    }
    const fId = "Final-1";
    if (actualResults[fId] && userPredictions[fId] === actualResults[fId]) {
      breakdown.Final += points.Final;
    }
  } else {
    games.forEach((game) => {
      const isFinished =
        game.finished === "TRUE" || Boolean(actualResults[game.id]);
      const actualWinnerId = isFinished
        ? actualResults[game.id] || game.winner_id
        : null;
      const predictedWinnerId = userPredictions[game.id];

      // Score logic for Winner Pick
      if (actualWinnerId && predictedWinnerId === actualWinnerId) {
        if (game.category === "seczim_games") {
          breakdown.SecZim += points.SecZim;
        } else {
          if (game.stage === "R32") breakdown.R32 += points.R32;
          else if (game.stage === "R16") breakdown.R16 += points.R16;
          else if (game.stage === "QF") breakdown.QF += points.QF;
          else if (game.stage === "SF") breakdown.SF += points.SF;
          else if (game.stage === "Third" || game.id === "Third-1")
            breakdown.Third += points.Third;
          else if (game.stage === "Final" || game.id === "Final-1")
            breakdown.Final += points.Final;
        }
      }

      // Score logic for exact scores
      const predictedScore = scorePredictions[game.id];
      const actualHomeScore = toOptionalScore(game.home_score);
      const actualAwayScore = toOptionalScore(game.away_score);
      const predictedHomeScore = toOptionalScore(predictedScore?.homeScore);
      const predictedAwayScore = toOptionalScore(predictedScore?.awayScore);

      if (isFinished && predictedScore) {
        let exactScoreCount = 0;

        if (
          predictedHomeScore !== null &&
          actualHomeScore !== null &&
          predictedHomeScore === actualHomeScore
        ) {
          exactScoreCount += 1;
        }

        if (
          predictedAwayScore !== null &&
          actualAwayScore !== null &&
          predictedAwayScore === actualAwayScore
        ) {
          exactScoreCount += 1;
        }

        // Determine which config properties to use for the bonus
        let oneExactProp: keyof PointsConfig = "R32_oneExactScore";
        let exactProp: keyof PointsConfig = "R32_exactScoreline";

        if (game.category === "seczim_games") {
          oneExactProp = "SecZim_oneExactScore";
          exactProp = "SecZim_exactScoreline";
        } else {
          const stage =
            game.stage === "Third" || game.id === "Third-1"
              ? "Third"
              : game.stage === "Final" || game.id === "Final-1"
                ? "Final"
                : game.stage;
          oneExactProp = `${stage}_oneExactScore` as keyof PointsConfig;
          exactProp = `${stage}_exactScoreline` as keyof PointsConfig;
        }

        if (exactScoreCount >= 2) {
          breakdown.ScoreBonus += (points[exactProp] as number) || 0;
        } else if (exactScoreCount === 1) {
          breakdown.ScoreBonus += (points[oneExactProp] as number) || 0;
        }
      }
    });
  }

  breakdown.total =
    breakdown.R32 +
    breakdown.R16 +
    breakdown.QF +
    breakdown.SF +
    breakdown.Third +
    breakdown.Final +
    breakdown.SecZim +
    breakdown.ScoreBonus;

  return breakdown;
}
