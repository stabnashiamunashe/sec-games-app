import type { ScorePrediction } from "../types";

export interface ScoreBreakdown {
  R32: number;
  R16: number;
  QF: number;
  SF: number;
  Final: number;
  SecZim: number;
  ScoreBonus: number;
  total: number;
}

export const POINT_VALUES = {
  R32: 5,
  R16: 5,
  QF: 5,
  SF: 5,
  Final: 5,
  SecZim: 5,
};

export const SCORE_BONUS_VALUES = {
  oneExactScore: 2.5,
  exactScoreline: 5,
};

const toOptionalScore = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

/**
 * Calculates score breakdown for a user's predictions against actual results,
 * dynamically referencing the full games dataset to handle any tournament structure (including custom SecZim games).
 */
export function calculateUserScore(
  userPredictions: Record<string, string>,
  actualResults: Record<string, string>,
  games: any[] = [],
  scorePredictions: Record<string, ScorePrediction> = {},
): ScoreBreakdown {
  const breakdown: ScoreBreakdown = {
    R32: 0,
    R16: 0,
    QF: 0,
    SF: 0,
    Final: 0,
    SecZim: 0,
    ScoreBonus: 0,
    total: 0,
  };

  if (!games || games.length === 0) {
    // Fallback for default World Cup brackets if games are not loaded yet
    for (let i = 1; i <= 16; i++) {
      const mId = `R32-${i}`;
      if (actualResults[mId] && userPredictions[mId] === actualResults[mId]) {
        breakdown.R32 += POINT_VALUES.R32;
      }
    }
    for (let i = 1; i <= 8; i++) {
      const mId = `R16-${i}`;
      if (actualResults[mId] && userPredictions[mId] === actualResults[mId]) {
        breakdown.R16 += POINT_VALUES.R16;
      }
    }
    for (let i = 1; i <= 4; i++) {
      const mId = `QF-${i}`;
      if (actualResults[mId] && userPredictions[mId] === actualResults[mId]) {
        breakdown.QF += POINT_VALUES.QF;
      }
    }
    for (let i = 1; i <= 2; i++) {
      const mId = `SF-${i}`;
      if (actualResults[mId] && userPredictions[mId] === actualResults[mId]) {
        breakdown.SF += POINT_VALUES.SF;
      }
    }
    const fId = "Final-1";
    if (actualResults[fId] && userPredictions[fId] === actualResults[fId]) {
      breakdown.Final += POINT_VALUES.Final;
    }
  } else {
    // Fully dynamic SQL-backed game calculation!
    games.forEach((game) => {
      const isFinished =
        game.finished === "TRUE" || Boolean(actualResults[game.id]);
      const actualWinnerId = isFinished
        ? actualResults[game.id] || game.winner_id
        : null;
      const predictedWinnerId = userPredictions[game.id];

      if (actualWinnerId && predictedWinnerId === actualWinnerId) {
        if (game.category === "seczim_games") {
          breakdown.SecZim += POINT_VALUES.SecZim;
        } else {
          if (game.stage === "R32") {
            breakdown.R32 += POINT_VALUES.R32;
          } else if (game.stage === "R16") {
            breakdown.R16 += POINT_VALUES.R16;
          } else if (game.stage === "QF") {
            breakdown.QF += POINT_VALUES.QF;
          } else if (game.stage === "SF") {
            breakdown.SF += POINT_VALUES.SF;
          } else if (game.stage === "Final" || game.id === "Final-1") {
            breakdown.Final += POINT_VALUES.Final;
          }
        }
      }

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

        if (exactScoreCount >= 2) {
          breakdown.ScoreBonus += SCORE_BONUS_VALUES.exactScoreline;
        } else if (exactScoreCount === 1) {
          breakdown.ScoreBonus += SCORE_BONUS_VALUES.oneExactScore;
        }
      }
    });
  }

  breakdown.total =
    breakdown.R32 +
    breakdown.R16 +
    breakdown.QF +
    breakdown.SF +
    breakdown.Final +
    breakdown.SecZim +
    breakdown.ScoreBonus;

  return breakdown;
}
