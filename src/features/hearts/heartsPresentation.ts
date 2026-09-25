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
  playerPenalty: number,
  objective: string
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
    : player.rank === 1
      ? winners.length > 1 ? "You tied the table" : "You led the table"
      : `You finished ${formatOrdinal(player.rank)}`;
  return { heading, summary: moonText || `${objective}. You took ${formatPointCount(playerPenalty)}; ${scoreSeatLabel(winner.seat)} ${formatPointCount(winner.score)} leads the match.`, winnerLabel };
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


function fullHandTrickHasTag(trick: CompletedHandTrick, tag: NonNullable<CompletedHandTrick["tacticalTags"]>[number]) {
  return (trick.tacticalTags ?? []).includes(tag);
}


export function heartsTrickFeedback(trick: CompletedHandTrick, hand: FullHandState) {
  const penaltyText = formatPointCount(trick.penalty);
  const threat = heartsMoonThreatSeat(seatPenaltiesForTricks(hand.completedTricks));
  const suffix = hand.status !== "in_progress" || !threat ? "" : threat === "You"
    ? " You have every point so far; the table will try to break the moon."
    : ` ${scoreSeatLabel(threat)} has every point so far; break the moon by making someone else take points.`;
  const withHeartsMoonThreat = (message: string) => `${message}${suffix}`;
  if (trick.outcome === "captured_penalty") {
    if (fullHandTrickHasTag(trick, "opponent_loaded_player_trick")) {
      return withHeartsMoonThreat(fullHandTrickHasTag(trick, "queen_spades_moved")
        ? `You held the trick and the table loaded the queen of spades into it. That is 13 danger points plus any hearts.`
        : `You held the trick and the table loaded hearts into it. The lead created pressure; look for a lower exit next time.`);
    }
    if (fullHandTrickHasTag(trick, "queen_spades_moved")) {
      return withHeartsMoonThreat(`You captured the queen of spades and took ${penaltyText}. In Hearts, that one card is the big danger.`);
    }
    if (fullHandTrickHasTag(trick, "hearts_moved")) {
      return withHeartsMoonThreat(`You captured hearts and took ${penaltyText}. Once hearts are broken, every heart can become cargo.`);
    }
    return withHeartsMoonThreat(`You won the trick and took ${penaltyText}. Try to stay below the current winner when danger can enter.`);
  }
  if (trick.outcome === "avoided_penalty") {
    if (fullHandTrickHasTag(trick, "queen_spades_moved")) {
      return withHeartsMoonThreat(`${trick.winner} took the queen of spades. Good: it moved, but not into your score.`);
    }
    if (fullHandTrickHasTag(trick, "hearts_moved")) {
      return withHeartsMoonThreat(`${trick.winner} took ${penaltyText}. Good: the hearts moved away from you.`);
    }
    return withHeartsMoonThreat(`${trick.winner} took ${penaltyText}. Good: you stayed out of the loaded trick.`);
  }
  if (trick.outcome === "won_clean_trick") {
    return withHeartsMoonThreat(fullHandTrickHasTag(trick, "pressure_lead")
      ? "You won a clean trick after pressure from the lead. No points, but watch whether this gives you the next lead."
      : "You won a clean trick. No points moved, but Hearts is still about avoiding the loaded tricks.");
  }
  return withHeartsMoonThreat(fullHandTrickHasTag(trick, "void_discard")
    ? `${trick.winner} won a clean trick. Good: your void discard could not take the led suit.`
    : `${trick.winner} won a clean trick. No hearts or queen of spades moved.`);
}
