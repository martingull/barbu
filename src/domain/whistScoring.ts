export type WhistPartnershipTricks = {
  playerSide: number;
  opponentSide: number;
};

export type WhistSessionMode = "game" | "rubber";

export function settleWhistHand(
  scores: WhistPartnershipTricks,
  games: WhistPartnershipTricks,
  oddTricks: WhistPartnershipTricks,
  mode: WhistSessionMode
) {
  const points = { playerSide: scores.playerSide + oddTricks.playerSide, opponentSide: scores.opponentSide + oddTricks.opponentSide };
  const gameComplete = Math.max(points.playerSide, points.opponentSide) >= 5;
  const gamesWon = { ...games };
  if (gameComplete) gamesWon[points.playerSide > points.opponentSide ? "playerSide" : "opponentSide"] += 1;
  const complete = gameComplete && (mode === "game" || Math.max(gamesWon.playerSide, gamesWon.opponentSide) >= 2);
  return { points, games: gamesWon, gameComplete, complete, nextScores: gameComplete ? { playerSide: 0, opponentSide: 0 } : points };
}

export function whistOddTricksForSide(tricksWon: number) {
  return Math.max(tricksWon - 6, 0);
}
