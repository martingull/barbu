import type { Seat } from "../../lessonTypes";
import type { SpadesBidState } from "../../domain/spadesBidding";
import type { SavedSpadesRun } from "../../persistence/spadesSave";
import { spadesSideBid, spadesPlayerSideSeats, spadesOpponentSideSeats, spadesMatchTarget, type SpadesHandResult, type SpadesScoreState } from "../../spadesScoring";
import { scoreSeatLabel, formatSignedScore } from "../../scorePresentation";

export function spadesBidLabel(bids: SpadesBidState) {
  return `${spadesSideBid(bids, spadesPlayerSideSeats)}-${spadesSideBid(bids, spadesOpponentSideSeats)}`;
}


export function spadesBidSeatLabel(seat: Seat) {
  return seat === "Tutor" ? "Barbu" : scoreSeatLabel(seat);
}


export function spadesNilSummary(results: SpadesHandResult["nilResults"]) {
  if (!results.length) {
    return "";
  }

  return results
    .map((result) =>
      `${spadesBidSeatLabel(result.seat)} ${result.tricks === 0 ? "made nil" : "missed nil"} (${formatSignedScore(result.score)})`
    )
    .join("; ");
}


export function spadesResultCopy(result: SpadesHandResult | null, scores: SpadesScoreState, complete: boolean) {
  const matchScore = `${scores.playerSide} - ${scores.opponentSide}`;
  if (complete) {
    const playerWon = scores.playerSide > scores.opponentSide;
    return {
      heading: playerWon ? "Your partnership won the match" : "Opponents won the match",
      summary: `${playerWon ? "You + Barbu" : "Left + Right"} reached ${Math.max(scores.playerSide, scores.opponentSide)} points. Final match score: ${matchScore}.`
    };
  }
  if (!result) return { heading: "Spades hand complete", summary: "Play to 500 points." };
  const nilText = spadesNilSummary(result.nilResults);
  const penaltyText = [
    result.playerSideBagPenalty ? `You + Barbu took a ${result.playerSideBagPenalty}-point bag penalty` : "",
    result.opponentSideBagPenalty ? `Left + Right took a ${result.opponentSideBagPenalty}-point bag penalty` : ""
  ].filter(Boolean).join("; ");
  const tiedAtTarget = scores.playerSide === scores.opponentSide && scores.playerSide >= spadesMatchTarget;
  return {
    heading: tiedAtTarget ? "Spades match tied: play on"
      : result.playerSideScore === result.opponentSideScore ? "Spades hand tied"
      : result.playerSideScore > result.opponentSideScore ? "Your partnership scored the hand" : "Opponents scored the hand",
    summary: `Bid ${result.playerSideBid}-${result.opponentSideBid}. You + Barbu won ${result.playerSideTricks} books for ${formatSignedScore(result.playerSideScore)}; Left + Right won ${result.opponentSideTricks} books for ${formatSignedScore(result.opponentSideScore)}. ${nilText ? `${nilText}. ` : ""}${penaltyText ? `${penaltyText}. ` : ""}Match score: ${matchScore}.${tiedAtTarget ? " Play another hand to break the tie." : ""}`
  };
}


export function savedSpadesRunSummary(savedRun: SavedSpadesRun) {
  const handNumber = savedRun.results.length + 1;
  const matchScore = `${savedRun.scores.playerSide} - ${savedRun.scores.opponentSide}`;

  if (!savedRun.playStarted && savedRun.fullHand.status !== "complete") {
    return `Hand ${handNumber}, bid ${spadesBidLabel(savedRun.bids)}, match ${matchScore}`;
  }

  return savedRun.fullHand.status === "complete"
    ? `Hand ${handNumber} complete, match ${matchScore}`
    : `Hand ${handNumber}, trick ${savedRun.fullHand.trickNumber}, match ${matchScore}`;
}
