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

export function whistResultCopy(settlement: ReturnType<typeof settleWhistHand>, tricks: WhistPartnershipTricks, mode: WhistSessionMode) {
  const rubberComplete = mode === "rubber" && settlement.complete;
  const result = rubberComplete ? settlement.games : settlement.gameComplete ? settlement.points : tricks;
  const winner = result.playerSide > result.opponentSide ? "Your partnership" : "Opponents";
  const heading = `${winner} won the ${rubberComplete ? "rubber" : settlement.gameComplete ? "game" : "hand"}`;
  const hand = `You + Barbu won ${tricks.playerSide} tricks; Left + Right won ${tricks.opponentSide}.`;
  const points = `Game score: ${settlement.points.playerSide} - ${settlement.points.opponentSide}.`;
  const games = mode === "rubber" ? ` Rubber games: ${settlement.games.playerSide} - ${settlement.games.opponentSide}.` : "";
  const next = settlement.gameComplete && !settlement.complete ? " Next game starts at 0 - 0; first to two games wins." : "";
  return { heading, summary: `${hand} ${points}${games}${next}` };
}

export type WhistOddProgress = {
  label: "To odd" | "Odd score";
  value: string;
  playerSideOddTricks: number;
  opponentSideOddTricks: number;
};

export function whistOddTricksForSide(tricksWon: number) {
  return Math.max(tricksWon - 6, 0);
}

export function whistOddProgress(tricks: WhistPartnershipTricks): WhistOddProgress {
  const playerSideOddTricks = whistOddTricksForSide(tricks.playerSide);
  const opponentSideOddTricks = whistOddTricksForSide(tricks.opponentSide);
  const oddScoreHasStarted = playerSideOddTricks > 0 || opponentSideOddTricks > 0;

  if (oddScoreHasStarted) {
    return {
      label: "Odd score",
      value: `${playerSideOddTricks} - ${opponentSideOddTricks}`,
      playerSideOddTricks,
      opponentSideOddTricks
    };
  }

  const playerSideTricksToOdd = Math.max(7 - tricks.playerSide, 0);
  const opponentSideTricksToOdd = Math.max(7 - tricks.opponentSide, 0);

  let value = `${playerSideTricksToOdd} each`;
  if (playerSideTricksToOdd < opponentSideTricksToOdd) {
    value = `You +${playerSideTricksToOdd}`;
  } else if (opponentSideTricksToOdd < playerSideTricksToOdd) {
    value = `Them +${opponentSideTricksToOdd}`;
  }

  return {
    label: "To odd",
    value,
    playerSideOddTricks,
    opponentSideOddTricks
  };
}
