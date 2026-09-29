import type { Seat, FullHandState, CompletedHandTrick } from "../../domain/types";
import { heartsHandPenaltyTotal, type HeartsHandResult, type HeartsPassDirection } from "../../domain/heartsSession";
import { seatPenaltiesForTricks } from "../../domain/trickTakingScore";
import { scoreSeats, scoreSeatLabel, formatOrdinal, formatPointCount, type RunStanding } from "../../presentation/scorePresentation";

export function heartsPassDirectionLabel(direction: HeartsPassDirection) {
  return direction === "hold" ? "No pass" : `Pass ${direction}`;
}


export function heartsPassTargetLabel(direction: HeartsPassDirection) {
  if (direction === "right") {
    return "Right";
  }
  if (direction === "across") {
    return "Barbu";
  }
  return "Left";
}


export function heartsPassReceiveLabel(direction: HeartsPassDirection) {
  if (direction === "right") {
    return "Left";
  }
  if (direction === "across") {
    return "Barbu";
  }
  return "Right";
}


export function heartsScorecardStandings(scores: Record<Seat, number>): RunStanding[] {
  const orderedScores = scoreSeats
    .map((seat) => ({ seat, score: scores[seat] }))
    .sort((left, right) => left.score - right.score);
  let previousScore = -1;
  let previousRank = 0;

  return orderedScores.map((standing, index) => {
    const rank = index > 0 && standing.score === previousScore ? previousRank : index + 1;
    previousScore = standing.score;
    previousRank = rank;

    return {
      ...standing,
      rank
    };
  });
}


export function heartsMoonThreatSeat(rawSeatPenalties: Record<Seat, number>) {
  const total = scoreSeats.reduce((sum, seat) => sum + (rawSeatPenalties[seat] ?? 0), 0);

  if (total <= 0 || total >= heartsHandPenaltyTotal) {
    return undefined;
  }

  return scoreSeats.find((seat) => rawSeatPenalties[seat] === total);
}


export function heartsMoonResultText(shooter: Seat) {
  if (shooter === "You") {
    return "You shot the moon. This hand scores 0 for you and 26 for everyone else.";
  }

  return `${scoreSeatLabel(shooter)} shot the moon. This hand scores 0 for ${scoreSeatLabel(
    shooter
  )} and 26 for everyone else.`;
}


export function heartsResultCopy(
  matchComplete: boolean,
  standings: RunStanding[],
  trigger: { seat: Seat; score: number } | undefined,
  moonShooter: Seat | undefined,
  handCount: number,
  handPoints: number
) {
  const player = standings.find(standing => standing.seat === "You");
  const winner = standings[0];
  const winners = standings.filter(standing => standing.rank === 1);
  const winnerLabel = winners.map(standing => scoreSeatLabel(standing.seat)).join(" and ");
  const moonText = moonShooter ? heartsMoonResultText(moonShooter) : "";
  if (!player || !winner) return { heading: "Hearts hand complete", summary: "Low score wins.", winnerLabel };
  if (matchComplete && trigger) {
    const heading = player.rank === 1
      ? winners.length > 1 ? "You tied the match" : "You won Hearts"
      : `You finished ${formatOrdinal(player.rank)}`;
    const resultVerb = winners.length > 1 ? "tie" : winner.seat === "You" ? "win" : "wins";
    const result = `${scoreSeatLabel(trigger.seat)} reached ${trigger.score} points. ${winnerLabel} ${resultVerb} with ${winner.score}. You finished ${formatOrdinal(player.rank)} after ${handCount} ${handCount === 1 ? "hand" : "hands"}.`;
    return { heading, summary: moonText ? `${moonText} ${result}` : result, winnerLabel };
  }
  const heading = moonShooter
    ? moonShooter === "You" ? "You shot the moon" : `${scoreSeatLabel(moonShooter)} shot the moon`
    : `Hand ${handCount} complete`;
  const lead = winners.length > 1
    ? `${winnerLabel} share the lead with ${formatPointCount(winner.score)}.`
    : `${winnerLabel} ${winner.seat === "You" ? "lead" : "leads"} with ${formatPointCount(winner.score)}.`;
  const standing = player.rank === 1 ? "" : ` You are ${formatOrdinal(player.rank)} in the match.`;
  return { heading, summary: `${moonText || `You scored ${formatPointCount(handPoints)} this hand.`} ${lead}${standing}`, winnerLabel };
}


export function heartsPlayerHandResult(kind: "best" | "worst", handResults: HeartsHandResult[]) {
  const results = [...handResults];

  if (!results.length) {
    return undefined;
  }

  return results.sort((left, right) => {
    const leftScore = left.seatPenalties.You ?? 0;
    const rightScore = right.seatPenalties.You ?? 0;

    return kind === "best"
      ? leftScore - rightScore || left.handNumber - right.handNumber
      : rightScore - leftScore || left.handNumber - right.handNumber;
  })[0];
}


export function heartsHandResultLabel(result: HeartsHandResult) {
  const score = result.seatPenalties.You ?? 0;
  const moonText = result.moonShooter
    ? result.moonShooter === "You"
      ? " (shot moon)"
      : ` (${scoreSeatLabel(result.moonShooter)} shot moon)`
    : "";

  return `Hand ${result.handNumber}: ${score} ${score === 1 ? "point" : "points"}${moonText}`;
}


export function heartsTrickFeedback(trick: CompletedHandTrick, hand: FullHandState) {
  const winner = trick.winner === "Unknown" ? "The winner" : scoreSeatLabel(trick.winner);
  const queen = trick.cards.some(({ card }) => card.rank === "Q" && card.suit === "S");
  const result = trick.penalty === 0
    ? `${winner} won the trick. No points.`
    : `${winner} took ${formatPointCount(trick.penalty)}${queen ? ", including the queen of spades" : ""}.`;
  if (hand.status !== "in_progress") return result;
  const next = `${winner} ${trick.winner === "You" ? "lead" : "leads"} next.`;
  const points = seatPenaltiesForTricks(hand.completedTricks);
  const threat = heartsMoonThreatSeat(points);
  // A single early heart is not useful evidence of a moon attempt.
  const moon = threat && points[threat] >= 13
    ? threat === "You"
      ? " You have every penalty so far; taking all 26 would shoot the moon."
      : ` ${scoreSeatLabel(threat)} has every penalty so far; taking a heart yourself would stop their moon.`
    : "";
  return `${result} ${next}${moon}`;
}
