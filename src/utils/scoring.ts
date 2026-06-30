import { UserPrediction } from '../types';

export interface ScoreBreakdown {
  R32: number;
  R16: number;
  QF: number;
  SF: number;
  Final: number;
  total: number;
}

export const POINT_VALUES = {
  R32: 10,
  R16: 20,
  QF: 40,
  SF: 60,
  Final: 100
};

/**
 * Calculates score breakdown for a user's predictions against actual results.
 */
export function calculateUserScore(
  userPredictions: Record<string, string>,
  actualResults: Record<string, string>
): ScoreBreakdown {
  const breakdown: ScoreBreakdown = {
    R32: 0,
    R16: 0,
    QF: 0,
    SF: 0,
    Final: 0,
    total: 0
  };

  // 1. R32 (Matches 1 to 16)
  for (let i = 1; i <= 16; i++) {
    const mId = `R32-${i}`;
    if (actualResults[mId] && userPredictions[mId] === actualResults[mId]) {
      breakdown.R32 += POINT_VALUES.R32;
    }
  }

  // 2. R16 (Matches 1 to 8)
  for (let i = 1; i <= 8; i++) {
    const mId = `R16-${i}`;
    if (actualResults[mId] && userPredictions[mId] === actualResults[mId]) {
      breakdown.R16 += POINT_VALUES.R16;
    }
  }

  // 3. QF (Matches 1 to 4)
  for (let i = 1; i <= 4; i++) {
    const mId = `QF-${i}`;
    if (actualResults[mId] && userPredictions[mId] === actualResults[mId]) {
      breakdown.QF += POINT_VALUES.QF;
    }
  }

  // 4. SF (Matches 1 to 2)
  for (let i = 1; i <= 2; i++) {
    const mId = `SF-${i}`;
    if (actualResults[mId] && userPredictions[mId] === actualResults[mId]) {
      breakdown.SF += POINT_VALUES.SF;
    }
  }

  // 5. Final (Match 1)
  const fId = 'Final-1';
  if (actualResults[fId] && userPredictions[fId] === actualResults[fId]) {
    breakdown.Final += POINT_VALUES.Final;
  }

  breakdown.total = breakdown.R32 + breakdown.R16 + breakdown.QF + breakdown.SF + breakdown.Final;
  return breakdown;
}
