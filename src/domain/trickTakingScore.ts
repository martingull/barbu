import type { CompletedHandTrick, Seat } from "./types";

export const trickTakingSeats: Seat[] = ["Tutor", "Right", "You", "Left"];
export type SeatScores = Record<Seat, number>;
export const emptySeatPenalties = (): SeatScores => ({ Tutor: 0, Right: 0, You: 0, Left: 0 });

export function addSeatPenalties(left: SeatScores, right: SeatScores): SeatScores {
  return { Tutor: left.Tutor + right.Tutor, Right: left.Right + right.Right,
    You: left.You + right.You, Left: left.Left + right.Left };
}

export function seatPenaltiesForTricks(tricks: CompletedHandTrick[]): SeatScores {
  const totals = emptySeatPenalties();
  for (const trick of tricks) {
    const seat = trickTakingSeats[trick.winnerIndex];
    if (seat) totals[seat] += trick.penalty;
  }
  return totals;
}

export function partnershipTrickCounts(tricks: CompletedHandTrick[]) {
  return tricks.reduce(
    (totals, trick) => ({
      playerSide: totals.playerSide + (trick.winnerIndex === 0 || trick.winnerIndex === 2 ? 1 : 0),
      opponentSide: totals.opponentSide + (trick.winnerIndex === 1 || trick.winnerIndex === 3 ? 1 : 0)
    }),
    { playerSide: 0, opponentSide: 0 }
  );
}
