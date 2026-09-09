export const spadesMatchTarget = 500;

export function spadesMatchComplete(scores: { playerSide: number; opponentSide: number }) {
  return Math.max(scores.playerSide, scores.opponentSide) >= spadesMatchTarget
    && scores.playerSide !== scores.opponentSide;
}
