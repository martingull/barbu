export type WhistPartnershipTricks = {
  playerSide: number;
  opponentSide: number;
};

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
