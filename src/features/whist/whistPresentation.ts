import type { CompletedHandTrick, Suit } from "../../domain/types";
import { whistOddTricksForSide, type settleWhistHand, type WhistPartnershipTricks, type WhistSessionMode } from "../../domain/whistScoring";

export function whistTrumpSuitFromHandId(id: string): Suit | null {
  const suffix = id.split("-").at(-1);
  if (suffix === "null") return null;
  return suffix === "C" || suffix === "D" || suffix === "H" || suffix === "S" ? suffix : "S";
}


export function whistTrickFeedback(trick: CompletedHandTrick, contract = "Whist") {
  const winnerIsPlayerSide = trick.winnerIndex === 0 || trick.winnerIndex === 2;
  const hasTag = (item: CompletedHandTrick, tag: NonNullable<CompletedHandTrick["tacticalTags"]>[number]) => (item.tacticalTags ?? []).includes(tag);
  const partnershipLabel = winnerIsPlayerSide ? "You + Barbu" : "Left + Right";

  if (hasTag(trick, "trump_won")) {
    return winnerIsPlayerSide
      ? `${trick.winner} won with trump for ${partnershipLabel}. Good cut: your side took control.`
      : `${trick.winner} won with trump for ${partnershipLabel}. Count that trump as gone.`;
  }
  if (hasTag(trick, "avoided_overtake")) {
    return `Barbu held the trick and you stayed under him. Good ${contract} play: do not fight your own partner.`;
  }
  if (hasTag(trick, "partner_supported")) {
    return trick.winner === "You"
      ? "Barbu led the suit and you carried it home. Good third-hand support."
      : "Barbu's lead held for your side. Good: the partnership kept control.";
  }
  if (hasTag(trick, "partner_held")) {
    return "Barbu held the trick for your partnership. Save strength and watch what suit he led.";
  }

  return winnerIsPlayerSide
    ? `${trick.winner} won the trick for ${partnershipLabel}. Build toward odd tricks above six.`
    : `${trick.winner} won the trick for ${partnershipLabel}. Regain lead or return Barbu's suit.`;
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
